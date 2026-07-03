import React, { useState, useMemo } from 'react';
import { database, isConfigured } from '../firebase';
import { ref, set, push } from 'firebase/database';

export default function AdminPanel({ data, onLocalUpdate, userRole }) {
  // Estados de busca e do formulário
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null); // Registro sendo editado
  const [originalRecord, setOriginalRecord] = useState(null); // Registro antes de ser editado
  
  // Status de gravação
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  // Confirmação do SERE para remanejamento
  const [showSereModal, setShowSereModal] = useState(false);
  const [sereCheckbox, setSereCheckbox] = useState(false);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  // Filtragem dos registros para o Admin (busca por nome, CGM ou Código)
  const filteredRecords = useMemo(() => {
    setCurrentPage(1);
    if (!searchQuery) return data;
    const query = searchQuery.toLowerCase();
    return data.filter(item => {
      const nomeMatch = item.nome_cursista && item.nome_cursista.toLowerCase().includes(query);
      const cgmMatch = item.cgm && item.cgm.toLowerCase().includes(query);
      const codMatch = item.cod_cursista && item.cod_cursista.toLowerCase().includes(query);
      return nomeMatch || cgmMatch || codMatch;
    });
  }, [data, searchQuery]);

  // Paginação
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  const totalPages = Math.max(Math.ceil(filteredRecords.length / itemsPerPage), 1);

  // Abrir formulário de edição
  const handleEditClick = (record) => {
    setSelectedRecord({ ...record });
    setOriginalRecord({ ...record }); // Guarda o estado anterior para comparar modificações
    setSaveStatus('');
  };

  // Alterar campos no formulário
  const handleInputChange = (field, value) => {
    setSelectedRecord(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Intercepta o envio do formulário para verificar remanejamento
  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    
    const turmaAnterior = (originalRecord?.turma || '').trim();
    const turmaNova = (selectedRecord?.turma || '').trim();
    
    if (turmaAnterior !== turmaNova) {
      // Abre o modal de confirmação do SERE se houve mudança de turma
      setSereCheckbox(false);
      setShowSereModal(true);
    } else {
      // Salva diretamente se não houve alteração de turma
      executeSave();
    }
  };

  // Executa o salvamento de fato (Google Sheets + Firebase + Logs)
  const executeSave = async () => {
    setIsSaving(true);
    setSaveStatus('Salvando alterações...');
    setShowSereModal(false); // Fecha o modal do SERE se estiver aberto

    try {
      const uniqueId = selectedRecord.cod_cursista || `EP-${selectedRecord.cgm}`;
      
      // 1. Identificar se houve movimentação de turma (Entrada, Saída, Transferência)
      let movementLog = null;
      
      if (originalRecord) {
        const turmaAnterior = (originalRecord.turma || '').trim();
        const turmaNova = (selectedRecord.turma || '').trim();
        
        if (turmaAnterior !== turmaNova) {
          let tipoAcao = 'Transferência';
          if (!turmaAnterior && turmaNova) tipoAcao = 'Entrada';
          if (turmaAnterior && !turmaNova) tipoAcao = 'Saída';
          
          movementLog = {
            timestamp: new Date().toISOString(),
            nome_cursista: selectedRecord.nome_cursista,
            cgm: selectedRecord.cgm || '',
            turma_anterior: turmaAnterior,
            turma_nova: turmaNova,
            tipo_acao: tipoAcao,
            email_tutor_responsavel: selectedRecord.email_tutor || '',
            tutor: selectedRecord.tutor_responsavel || '',
            nre: selectedRecord.nre_tutor || ''
          };
        }
      }

      // 2. Gravar no Firebase Realtime Database
      if (isConfigured && database) {
        // Grava o cadastro do cursista
        const recordRef = ref(database, `cursistas/${uniqueId}`);
        await set(recordRef, selectedRecord);
        
        // Se houve movimentação de turma, grava o log na coleção de movimentações
        if (movementLog) {
          const movementsRef = ref(database, 'movements');
          const newMovementRef = push(movementsRef);
          await set(newMovementRef, movementLog);
          console.log("Movimentação registrada no Firebase!");
        }
        
        console.log("Dados do Cursista salvos no Firebase!");
      }

      // 3. Enviar para o Google Sheets via Apps Script Web App
      const appsScriptUrl = import.meta.env.VITE_APPS_SCRIPT_URL;
      if (appsScriptUrl) {
        await fetch(appsScriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'updateRecord',
            data: selectedRecord
          })
        });
        console.log("Comando enviado para o Google Apps Script!");
      }

      // 4. Notificar a aplicação principal para atualizar o estado local instantaneamente
      if (onLocalUpdate) {
        onLocalUpdate(selectedRecord);
      }

      setSaveStatus('Salvo com sucesso na planilha e no banco de dados!');
      setTimeout(() => {
        setSelectedRecord(null); // Fecha o formulário
        setOriginalRecord(null);
        setSaveStatus('');
      }, 1500);

    } catch (err) {
      console.error("Erro ao salvar:", err);
      setSaveStatus(`Erro ao salvar: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Tratar exclusão de cursista (Simulado ou Real)
  const handleDelete = async (record) => {
    if (!window.confirm(`Tem certeza que deseja remover o cursista ${record.nome_cursista}?`)) {
      return;
    }

    setIsSaving(true);
    setSaveStatus('Removendo cursista...');
    
    try {
      const uniqueId = record.cod_cursista || `EP-${record.cgm}`;
      
      // Cria log de saída
      const movementLog = {
        timestamp: new Date().toISOString(),
        nome_cursista: record.nome_cursista,
        cgm: record.cgm || '',
        turma_anterior: record.turma || '',
        turma_nova: '',
        tipo_acao: 'Saída',
        email_tutor_responsavel: record.email_tutor || '',
        tutor: record.tutor_responsavel || '',
        nre: record.nre_tutor || ''
      };

      if (isConfigured && database) {
        // Remove do Firebase
        const recordRef = ref(database, `cursistas/${uniqueId}`);
        await set(recordRef, null); // Remove no Firebase setando null
        
        // Grava log
        const movementsRef = ref(database, 'movements');
        const newMovementRef = push(movementsRef);
        await set(newMovementRef, movementLog);
      }

      // Atualiza local
      const deletedRecord = { ...record, nome_cursista: '', cgm: '', turma: '', cod_cursista: uniqueId }; // Zera localmente
      if (onLocalUpdate) {
        onLocalUpdate(deletedRecord);
      }

      setSaveStatus('Registro removido com sucesso!');
      setTimeout(() => {
        setSaveStatus('');
      }, 1500);

    } catch (err) {
      console.error("Erro ao deletar:", err);
      setSaveStatus(`Erro ao deletar: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Bloqueio de segurança robusto baseado no papel logado
  if (userRole !== 'admin') {
    return (
      <div className="glass-panel animate-fade-in" style={{ maxWidth: '500px', margin: '4rem auto', padding: '2.5rem', textAlign: 'center' }}>
        <div className="kpi-icon-container" style={{ margin: '0 auto 1.5rem', width: '70px', height: '70px', backgroundColor: 'rgba(229, 62, 62, 0.1)', color: '#e53e3e' }}>
          <i className="lucide-shield-alert" style={{ fontSize: '1.8rem' }}></i>
        </div>
        <h2 style={{ fontFamily: 'var(--font-header)', color: 'var(--color-primary-dark)' }}>Acesso Negado</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginTop: '0.75rem' }}>
          Você está logado com a função de <b>{userRole || 'Leitor'}</b>. Apenas administradores têm permissão para acessar esta ferramenta e realizar alterações na base de dados.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Banner de Modo Admin Ativo */}
      <div className="admin-mode-banner animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className="lucide-shield-alert"></i>
          <span><b>Perfil Administrador:</b> Suas alterações serão gravadas em lote na planilha do Google Sheets e replicadas em tempo real.</span>
        </div>
      </div>

      {/* Sincronização & Informações */}
      <div className="sync-bar">
        <div className="sync-status">
          <span className={`pulse-dot ${isConfigured ? '' : 'offline'}`}></span>
          <span>
            {isConfigured 
              ? "Sincronização bidirecional ativa (Firebase + Google Sheets)" 
              : "Modo Local Fallback ativo (Gravações em memória. Configure a Vercel para produção)"}
          </span>
        </div>
      </div>

      {/* Interface Principal de Busca */}
      <div className="glass-panel animate-fade-in">
        <div className="panel-header">
          <h2 className="panel-title">
            <i className="lucide-edit-3"></i> Central de Alterações de Turmas
          </h2>
          <input 
            type="text" 
            placeholder="Buscar por Nome, CGM ou Código..." 
            className="filter-input"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ maxWidth: '350px' }}
          />
        </div>

        {saveStatus && (
          <div style={{ 
            padding: '1rem', 
            marginBottom: '1rem', 
            backgroundColor: saveStatus.includes('Erro') ? 'rgba(229,62,62,0.1)' : 'rgba(15,155,15,0.1)',
            color: saveStatus.includes('Erro') ? '#e53e3e' : 'var(--color-accent-green)',
            borderRadius: '6px',
            fontWeight: 600
          }}>
            {saveStatus}
          </div>
        )}

        {/* Tabela de edição */}
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Código / CGM</th>
                <th>Nome do Cursista</th>
                <th>E-mail</th>
                <th>Turma</th>
                <th>Formador</th>
                <th>Tutor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
                    Nenhum registro correspondente encontrado.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((item, idx) => {
                  // Pula deletados localmente
                  if (!item.nome_cursista) return null;
                  
                  return (
                    <tr key={idx}>
                      <td style={{ fontSize: '0.85rem' }}>{item.cod_cursista || item.cgm}</td>
                      <td style={{ fontWeight: 600 }}>{item.nome_cursista}</td>
                      <td>{item['e-mail'] || item.email || '-'}</td>
                      <td style={{ fontSize: '0.85rem' }}>{item.turma}</td>
                      <td style={{ fontSize: '0.85rem' }}>{item.nome_formador}</td>
                      <td style={{ fontSize: '0.85rem' }}>{item.tutor_responsavel}</td>
                      <td>
                        <div className="actions-cell">
                          <button 
                            className="action-btn email" 
                            onClick={() => handleEditClick(item)}
                          >
                            Editar
                          </button>
                          <button 
                            className="action-btn whatsapp" 
                            style={{ backgroundColor: '#e53e3e' }}
                            onClick={() => handleDelete(item)}
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {filteredRecords.length > 0 && (
          <div className="pagination-container">
            <div>
              Mostrando de <b>{Math.min(filteredRecords.length, (currentPage - 1) * itemsPerPage + 1)}</b> a <b>{Math.min(filteredRecords.length, currentPage * itemsPerPage)}</b> de <b>{filteredRecords.length}</b> registros
            </div>
            <div className="pagination-buttons">
              <button className="page-btn" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                &lt;&lt;
              </button>
              <button className="page-btn" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
                Anterior
              </button>
              <span style={{ display: 'flex', alignItems: 'center', padding: '0 0.5rem' }}>
                Página {currentPage} de {totalPages}
              </span>
              <button className="page-btn" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>
                Próxima
              </button>
              <button className="page-btn" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                &gt;&gt;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Formulário de Edição */}
      {selectedRecord && (
        <div className="admin-form-overlay animate-fade-in">
          <div className="admin-form-card">
            <div className="form-header">
              <h3>Editar Cadastro: {selectedRecord.nome_cursista}</h3>
              <button className="close-modal-btn" onClick={() => { setSelectedRecord(null); setOriginalRecord(null); }}>&times;</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-body">
                {/* 1. Dados do Cursista */}
                <h4 className="form-body-full" style={{ color: 'var(--color-primary-dark)', borderBottom: '1px solid var(--color-card-border)', paddingBottom: '0.25rem', marginTop: '0.5rem' }}>
                  Dados do Cursista
                </h4>
                
                <div className="filter-group">
                  <span className="filter-label">Nome do Cursista</span>
                  <input 
                    type="text" 
                    className="filter-input"
                    value={selectedRecord.nome_cursista || ''} 
                    onChange={e => handleInputChange('nome_cursista', e.target.value)}
                    required
                  />
                </div>
                
                <div className="filter-group">
                  <span className="filter-label">CGM</span>
                  <input 
                    type="text" 
                    className="filter-input"
                    value={selectedRecord.cgm || ''} 
                    onChange={e => handleInputChange('cgm', e.target.value)}
                    disabled // Chave primária de identificação
                  />
                </div>

                <div className="filter-group">
                  <span className="filter-label">RG Cursista</span>
                  <input 
                    type="text" 
                    className="filter-input"
                    value={selectedRecord.rg || ''} 
                    onChange={e => handleInputChange('rg', e.target.value)}
                  />
                </div>

                <div className="filter-group">
                  <span className="filter-label">E-mail Cursista</span>
                  <input 
                    type="email" 
                    className="filter-input"
                    value={selectedRecord['e-mail'] || selectedRecord.email || ''} 
                    onChange={e => handleInputChange('e-mail', e.target.value)}
                  />
                </div>

                <div className="filter-group">
                  <span className="filter-label">Telefone Cursista</span>
                  <input 
                    type="text" 
                    className="filter-input"
                    value={selectedRecord.telefone_cursista || ''} 
                    onChange={e => handleInputChange('telefone_cursista', e.target.value)}
                  />
                </div>

                <div className="filter-group">
                  <span className="filter-label">Chamamento</span>
                  <input 
                    type="text" 
                    className="filter-input"
                    value={selectedRecord.chamamento || ''} 
                    onChange={e => handleInputChange('chamamento', e.target.value)}
                  />
                </div>

                {/* 2. Dados da Turma */}
                <h4 className="form-body-full" style={{ color: 'var(--color-primary-dark)', borderBottom: '1px solid var(--color-card-border)', paddingBottom: '0.25rem', marginTop: '1rem' }}>
                  Dados da Turma e Classroom (Se alterar a turma, registrará uma Movimentação)
                </h4>

                <div className="filter-group">
                  <span className="filter-label">Nome da Turma</span>
                  <input 
                    type="text" 
                    className="filter-input"
                    value={selectedRecord.turma || ''} 
                    onChange={e => handleInputChange('turma', e.target.value)}
                  />
                </div>

                <div className="filter-group">
                  <span className="filter-label">Link Classroom</span>
                  <input 
                    type="text" 
                    className="filter-input"
                    value={selectedRecord['Link Classroom'] || selectedRecord.Link_Classroom || ''} 
                    onChange={e => handleInputChange('Link Classroom', e.target.value)}
                  />
                </div>

                <div className="filter-group">
                  <span className="filter-label">Modalidade</span>
                  <input 
                    type="text" 
                    className="filter-input"
                    value={selectedRecord.modalidade || ''} 
                    onChange={e => handleInputChange('modalidade', e.target.value)}
                  />
                </div>

                <div className="filter-group">
                  <span className="filter-label">Dia do Encontro</span>
                  <input 
                    type="text" 
                    className="filter-input"
                    value={selectedRecord.dia_da_semana || ''} 
                    onChange={e => handleInputChange('dia_da_semana', e.target.value)}
                  />
                </div>

                <div className="filter-group">
                  <span className="filter-label">Horário Inicial</span>
                  <input 
                    type="text" 
                    className="filter-input"
                    value={selectedRecord.horario_inicial || ''} 
                    onChange={e => handleInputChange('horario_inicial', e.target.value)}
                  />
                </div>

                <div className="filter-group">
                  <span className="filter-label">Horário Final</span>
                  <input 
                    type="text" 
                    className="filter-input"
                    value={selectedRecord.horario_fim || ''} 
                    onChange={e => handleInputChange('horario_fim', e.target.value)}
                  />
                </div>

                {/* 3. Dados do Formador */}
                <h4 className="form-body-full" style={{ color: 'var(--color-primary-dark)', borderBottom: '1px solid var(--color-card-border)', paddingBottom: '0.25rem', marginTop: '1rem' }}>
                  Dados do Formador
                </h4>

                <div className="filter-group">
                  <span className="filter-label">Nome do Formador</span>
                  <input 
                    type="text" 
                    className="filter-input"
                    value={selectedRecord.nome_formador || ''} 
                    onChange={e => handleInputChange('nome_formador', e.target.value)}
                  />
                </div>

                <div className="filter-group">
                  <span className="filter-label">E-mail Formador</span>
                  <input 
                    type="email" 
                    className="filter-input"
                    value={selectedRecord['e-mail_formador'] || selectedRecord.e_mail_formador || ''} 
                    onChange={e => handleInputChange('e-mail_formador', e.target.value)}
                  />
                </div>

                <div className="filter-group">
                  <span className="filter-label">Telefone Formador</span>
                  <input 
                    type="text" 
                    className="filter-input"
                    value={selectedRecord.telefone_formador || ''} 
                    onChange={e => handleInputChange('telefone_formador', e.target.value)}
                  />
                </div>

                {/* 4. Dados do Tutor */}
                <h4 className="form-body-full" style={{ color: 'var(--color-primary-dark)', borderBottom: '1px solid var(--color-card-border)', paddingBottom: '0.25rem', marginTop: '1rem' }}>
                  Dados da Tutoria e NRE
                </h4>

                <div className="filter-group">
                  <span className="filter-label">Tutor Responsável</span>
                  <input 
                    type="text" 
                    className="filter-input"
                    value={selectedRecord.tutor_responsavel || ''} 
                    onChange={e => handleInputChange('tutor_responsavel', e.target.value)}
                  />
                </div>

                <div className="filter-group">
                  <span className="filter-label">E-mail Tutor</span>
                  <input 
                    type="email" 
                    className="filter-input"
                    value={selectedRecord.email_tutor || ''} 
                    onChange={e => handleInputChange('email_tutor', e.target.value)}
                  />
                </div>

                <div className="filter-group">
                  <span className="filter-label">Telefone Tutor</span>
                  <input 
                    type="text" 
                    className="filter-input"
                    value={selectedRecord.telefone_tutor || ''} 
                    onChange={e => handleInputChange('telefone_tutor', e.target.value)}
                  />
                </div>

                <div className="filter-group">
                  <span className="filter-label">E-mail NRE</span>
                  <input 
                    type="email" 
                    className="filter-input"
                    value={selectedRecord.e_mail_nre || selectedRecord['e-mail_nre'] || ''} 
                    onChange={e => handleInputChange('e-mail_nre', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-footer">
                <button type="button" className="btn-secondary" onClick={() => { setSelectedRecord(null); setOriginalRecord(null); }} disabled={isSaving}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={isSaving}>
                  {isSaving ? "Gravando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação do SERE para Remanejamento */}
      {showSereModal && (
        <div className="admin-form-overlay animate-fade-in" style={{ zIndex: 1100 }}>
          <div className="admin-form-card" style={{ maxWidth: '550px', padding: 0 }}>
            <div className="form-header" style={{ backgroundColor: 'var(--color-primary-dark)', color: 'white' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ⚠️ Efetivar Remanejamento no SERE
              </h3>
              <button className="close-modal-btn" onClick={() => setShowSereModal(false)}>&times;</button>
            </div>
            
            <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <p style={{ margin: 0, color: 'var(--color-text-dark)', lineHeight: 1.5 }}>
                Você está alterando a turma do cursista <strong>{selectedRecord?.nome_cursista}</strong> (CGM: {selectedRecord?.cgm}):
              </p>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                backgroundColor: 'rgba(50, 130, 184, 0.05)', 
                padding: '1rem', 
                borderRadius: 'var(--radius-sm)', 
                border: '1px solid var(--color-card-border)' 
              }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Turma Anterior</span>
                  <strong style={{ color: '#e53e3e', fontSize: '0.95rem' }}>{originalRecord?.turma || '(Sem Turma)'}</strong>
                </div>
                <div style={{ fontSize: '1.5rem', color: 'var(--color-text-muted)', padding: '0 0.5rem' }}>➔</div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Nova Turma</span>
                  <strong style={{ color: 'var(--color-accent-green)', fontSize: '0.95rem' }}>{selectedRecord?.turma || '(Sem Turma)'}</strong>
                </div>
              </div>

              <div style={{ 
                borderLeft: '4px solid #f7b731', 
                backgroundColor: 'rgba(247, 183, 49, 0.05)', 
                padding: '1rem', 
                borderRadius: 'var(--radius-sm)', 
                display: 'flex',
                flexDirection: 'column', 
                alignItems: 'flex-start',
                gap: '0.5rem'
              }}>
                <h5 style={{ margin: 0, color: '#b7791f', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                  ⚠️ Importante: Atualização Manual no SERE
                </h5>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#744210', lineHeight: 1.4 }}>
                  Esta ação atualizará o Dashboard (Firebase) e a Planilha de Dados, mas <strong>não se integra automaticamente ao SERE</strong>. 
                  Você deve acessar o sistema SERE e efetivar o remanejamento manualmente lá.
                </p>
              </div>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', userSelect: 'none', marginTop: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  checked={sereCheckbox}
                  onChange={(e) => setSereCheckbox(e.target.checked)}
                  style={{ marginTop: '0.2rem', width: '16px', height: '16px' }}
                />
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-dark)', lineHeight: 1.4 }}>
                  Confirmo que farei (ou já fiz) a alteração manual deste remanejamento no sistema <strong>SERE</strong>.
                </span>
              </label>
              
              <div className="form-footer" style={{ marginTop: '1rem', borderTop: '1px solid var(--color-card-border)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowSereModal(false)}
                >
                  Voltar
                </button>
                <button 
                  type="button" 
                  className="btn-primary" 
                  style={{ 
                    backgroundColor: sereCheckbox ? 'var(--color-primary)' : '#cbd5e1', 
                    color: sereCheckbox ? 'white' : '#94a3b8',
                    cursor: sereCheckbox ? 'pointer' : 'not-allowed' 
                  }}
                  disabled={!sereCheckbox || isSaving}
                  onClick={executeSave}
                >
                  {isSaving ? "Salvando..." : "Confirmar e Finalizar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
