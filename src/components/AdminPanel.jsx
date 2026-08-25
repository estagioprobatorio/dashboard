import React, { useState, useMemo } from 'react';
import { database, isConfigured as isFirebaseConfigured } from '../firebase';
import { supabase, isConfigured as isSupabaseConfigured } from '../supabase';
import { ref, set, push } from 'firebase/database';

export default function AdminPanel({ data, onLocalUpdate, userRole }) {
  const isConfigured = isFirebaseConfigured || isSupabaseConfigured;
  // Estados de busca e do formulário
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null); // Registro sendo editado
  const [originalRecord, setOriginalRecord] = useState(null); // Registro antes de ser editado
  const [editMode, setEditMode] = useState(null); // 'data' ou 'remanejamento'
  
  // Status de gravação
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  // Busca e dropdown para remanejamento
  const [turmaSearch, setTurmaSearch] = useState('');
  const [showTurmaDropdown, setShowTurmaDropdown] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Sinalização e Tipo de Remanejamento
  const [showSinalizacaoModal, setShowSinalizacaoModal] = useState(false);
  const [tipoRemanejamento, setTipoRemanejamento] = useState('comum');

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  // Extrai turmas únicas da base para preencher o select do remanejamento
  const uniqueTurmas = useMemo(() => {
    const classes = new Set();
    data.forEach(item => {
      if (item.turmas) classes.add(item.turmas.trim());
    });
    return Array.from(classes).sort();
  }, [data]);

  // Filtragem dos registros para o Admin (busca por nome, CGM ou Código)
  const filteredRecords = useMemo(() => {
    setCurrentPage(1);
    if (!searchQuery) return data;
    const query = searchQuery.toLowerCase();
    return data.filter(item => {
      const nomeMatch = item.nome_cursista && item.nome_cursista.toLowerCase().includes(query);
      const cgmMatch = item.cgm && item.cgm.toLowerCase().includes(query);
      return nomeMatch || cgmMatch;
    });
  }, [data, searchQuery]);

  // Paginação
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  const totalPages = Math.max(Math.ceil(filteredRecords.length / itemsPerPage), 1);

  // Estados de convites do Classroom
  const [showClassroomModal, setShowClassroomModal] = useState(false);
  const [classroomInviteType, setClassroomInviteType] = useState('tutor'); // 'tutor' ou 'nre'
  const [massInviteTarget, setMassInviteTarget] = useState(null); // 'mass' ou 'individual'
  const [coursesList, setCoursesList] = useState([]);
  
  // Status de processamento de convites do Classroom
  const [isProcessingInvites, setIsProcessingInvites] = useState(false);
  const [inviteProgress, setInviteProgress] = useState(0);
  const [inviteCurrentIndex, setInviteCurrentIndex] = useState(0);
  const [inviteTotalCount, setInviteTotalCount] = useState(0);
  const [inviteCurrentStatus, setInviteCurrentStatus] = useState('');
  const [inviteSummary, setInviteSummary] = useState({ success: 0, already: 0, error: 0, details: [] });
  const [stopInviteProcessing, setStopInviteProcessing] = useState(false);

  // Extrai turmas únicas da base para Classroom
  const uniqueClassroomCourses = useMemo(() => {
    const map = new Map();
    data.forEach(item => {
      if (!item.turmas) return;
      const turmaKey = item.turmas.trim();
      const idClassroom = item.id_classroom || item.idClassroom || '';
      const emailTutor = item.email_tutor || item.emailTutor || '';
      const tutorName = item.tutor_responsavel || '';
      const emailNre = item.e_mail_nre || item.email_nre || item.emailNre || '';
      
      if (!map.has(turmaKey)) {
        map.set(turmaKey, {
          turmas: turmaKey,
          idClassroom: idClassroom,
          tutorName: tutorName,
          emailTutor: emailTutor,
          emailNre: emailNre,
          selected: !!idClassroom
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.turmas.localeCompare(b.turmas));
  }, [data]);

  const openMassInviteModal = (type) => {
    setClassroomInviteType(type);
    setMassInviteTarget('mass');
    
    const list = uniqueClassroomCourses.map(c => ({
      ...c,
      selected: !!c.idClassroom && !!(type === 'tutor' ? c.emailTutor : c.emailNre)
    }));
    
    setCoursesList(list);
    setShowClassroomModal(true);
    setIsProcessingInvites(false);
    setInviteProgress(0);
    setInviteCurrentIndex(0);
    setInviteTotalCount(0);
    setInviteCurrentStatus('');
    setInviteSummary({ success: 0, already: 0, error: 0, details: [] });
    setStopInviteProcessing(false);
  };

  const openIndividualInviteModal = (record) => {
    setMassInviteTarget('individual');
    // Para envio individual, mostramos as duas opções (Tutor ou NRE) no modal
    setClassroomInviteType('tutor'); // padrão inicial no modal individual
    
    const course = {
      turmas: record.turmas,
      idClassroom: record.id_classroom || record.idClassroom || '',
      tutorName: record.tutor_responsavel || '',
      emailTutor: record.email_tutor || '',
      emailNre: record.e_mail_nre || record.email_nre || '',
      selected: true
    };
    
    setCoursesList([course]);
    setShowClassroomModal(true);
    setIsProcessingInvites(false);
    setInviteProgress(0);
    setInviteCurrentIndex(0);
    setInviteTotalCount(0);
    setInviteCurrentStatus('');
    setInviteSummary({ success: 0, already: 0, error: 0, details: [] });
    setStopInviteProcessing(false);
  };

  const startSendingInvites = async (type) => {
    const appsScriptUrl = import.meta.env.VITE_APPS_SCRIPT_URL;
    if (!appsScriptUrl) {
      alert("Erro: URL do Google Apps Script (VITE_APPS_SCRIPT_URL) não está configurada!");
      return;
    }

    const targets = coursesList.filter(c => c.selected);
    if (targets.length === 0) {
      alert("Nenhuma turma selecionada para envio.");
      return;
    }

    const confirmMsg = massInviteTarget === 'individual'
      ? `Deseja enviar o convite de ${type === 'tutor' ? 'Tutor' : 'NRE'} para a turma "${targets[0].turmas}"?`
      : `Deseja enviar os convites de ${type === 'tutor' ? 'Tutor' : 'NRE'} para as ${targets.length} turmas selecionadas?`;

    if (!window.confirm(confirmMsg)) return;

    setIsProcessingInvites(true);
    setInviteTotalCount(targets.length);
    setInviteProgress(0);
    setInviteCurrentIndex(0);
    setStopInviteProcessing(false);
    
    const summary = { success: 0, already: 0, error: 0, details: [] };
    setInviteSummary(summary);

    for (let i = 0; i < targets.length; i++) {
      if (stopInviteProcessing) {
        setInviteCurrentStatus("Envio cancelado pelo usuário.");
        break;
      }

      const course = targets[i];
      const targetEmail = type === 'tutor' ? course.emailTutor : course.emailNre;
      
      setInviteCurrentIndex(i + 1);
      setInviteCurrentStatus(`Enviando convite para "${course.turmas}" (${targetEmail || 'Sem e-mail'})...`);

      if (!course.idClassroom) {
        summary.error++;
        summary.details.push({
          turmas: course.turmas,
          email: 'ID Ausente',
          status: 'error',
          message: 'ID do Classroom ausente'
        });
        setInviteSummary({ ...summary });
        setInviteProgress(Math.round(((i + 1) / targets.length) * 100));
        continue;
      }

      if (!targetEmail) {
        summary.error++;
        summary.details.push({
          turmas: course.turmas,
          email: 'E-mail Ausente',
          status: 'error',
          message: 'E-mail não cadastrado'
        });
        setInviteSummary({ ...summary });
        setInviteProgress(Math.round(((i + 1) / targets.length) * 100));
        continue;
      }

      try {
        const payload = JSON.stringify({
          action: 'inviteTeacher',
          courseId: course.idClassroom,
          email: targetEmail
        });

        const response = await fetch(appsScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: payload
        });
        
        if (!response.ok) {
          throw new Error(`Erro HTTP ${response.status}`);
        }
        
        const result = await response.json();
        if (result.status === 'success') {
          summary.success++;
          summary.details.push({
            turmas: course.turmas,
            email: targetEmail,
            status: 'success',
            message: 'Convite enviado'
          });
        } else if (result.status === 'already_member' || result.status === 'already_invited') {
          summary.already++;
          summary.details.push({
            turmas: course.turmas,
            email: targetEmail,
            status: 'already',
            message: result.message || 'Já cadastrado/convidado'
          });
        } else {
          summary.error++;
          summary.details.push({
            turmas: course.turmas,
            email: targetEmail,
            status: 'error',
            message: result.message || 'Erro no convite'
          });
        }
      } catch (err) {
        console.error("Erro no convite:", err);
        summary.error++;
        summary.details.push({
          turmas: course.turmas,
          email: targetEmail,
          status: 'error',
          message: 'Erro de comunicação: ' + err.message
        });
      }

      setInviteSummary({ ...summary });
      setInviteProgress(Math.round(((i + 1) / targets.length) * 100));
      
      // Pequeno atraso para evitar overload
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    setIsProcessingInvites(false);
    setInviteCurrentStatus("Processamento concluído!");
  };

  // Abrir formulário de edição de dados comuns
  const handleEditClick = (record) => {
    setSelectedRecord({ ...record });
    setOriginalRecord({ ...record }); // Guarda o estado anterior para comparar modificações
    setEditMode('data');
    setSaveStatus('');
  };

  // Abrir formulário de remanejamento
  const handleRemanejarClick = (record) => {
    setSelectedRecord({ ...record });
    setOriginalRecord({ ...record });
    setEditMode('remanejamento');
    setTurmaSearch(''); // Reseta busca
    setShowTurmaDropdown(false);
    setSaveStatus('');
  };

  // Fechar modals
  const handleCloseModal = () => {
    setSelectedRecord(null);
    setOriginalRecord(null);
    setEditMode(null);
    setTurmaSearch('');
    setShowTurmaDropdown(false);
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
    
    const turmaAnterior = (originalRecord?.turmas || '').trim();
    const turmaNova = (selectedRecord?.turmas || '').trim();
    
    if (editMode === 'remanejamento' && turmaAnterior !== turmaNova) {
      setShowSinalizacaoModal(true);
    } else {
      executeSave('comum');
    }
  };

  // Confirma a gravação
  const confirmSaveWithSinalizacao = (tipo) => {
    setShowSinalizacaoModal(false);
    executeSave(tipo);
  };

  // Executa o salvamento de fato (Google Sheets + Supabase + Firebase + Logs)
  const executeSave = async (tipoRem = 'comum') => {
    setIsSaving(true);
    setSaveStatus('Salvando alterações...');

    try {
      const cleanKey = (val) => val ? val.toString().replace(/[\.\$\#\[\]\/]/g, "_").trim() : '';
      
      const oldUniqueId = originalRecord ? (originalRecord.cgm ? `EP-${originalRecord.cgm}_${cleanKey(originalRecord.turmas)}` : `EP-unknown`) : null;
      const uniqueId = selectedRecord.cgm ? `EP-${selectedRecord.cgm}_${cleanKey(selectedRecord.turmas)}` : `EP-unknown`;

      // Prepara o Log de Movimentação caso tenha mudado de turma
      let movementLog = null;
      const turmaAnterior = originalRecord ? originalRecord.turmas : null;
      const turmaNova = selectedRecord.turmas;

      if (turmaAnterior && turmaNova && turmaAnterior !== turmaNova) {
        let tipoAcao = 'Transferência';
        if (tipoRem === 'remanejamento_duplo') {
          tipoAcao = 'Remanejamento Duplo (Recebeu + Cedeu)';
        } else if (tipoRem === 'abrir_vaga') {
          tipoAcao = 'Remanejamento Simples (Abriu Vaga)';
        }

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

      // 1. Gravar no Supabase
      if (isSupabaseConfigured && supabase) {
        const supabasePayload = {
          cod_cursista: selectedRecord.cod_cursista || null,
          cgm: selectedRecord.cgm ? String(selectedRecord.cgm) : null,
          nome_cursista: selectedRecord.nome_cursista || 'CURSISTA',
          email: selectedRecord['e-mail'] || selectedRecord.email || selectedRecord.email_cursista || null,
          cpf_cursista: selectedRecord.cpf_cursista || null,
          rg: selectedRecord.rg || null,
          telefone_cursista: selectedRecord.telefone_cursista || null,
          modalidade: selectedRecord.modalidade || null,
          componente: selectedRecord.componente || null,
          turmas: selectedRecord.turmas || null,
          dia_da_semana: selectedRecord.dia_da_semana || null,
          horario_inicial: selectedRecord.horario_inicial || null,
          horario_fim: selectedRecord.horario_fim || null,
          turno: selectedRecord.turno || null,
          ano_formativo: selectedRecord.ano_formativo || null,
          nome_formador: selectedRecord.nome_formador || null,
          cpf_formador: selectedRecord.cpf_formador || null,
          rg_formador: selectedRecord.rg_formador || null,
          email_formador: selectedRecord['e-mail_formador'] || selectedRecord.email_formador || null,
          telefone_formador: selectedRecord.telefone_formador || null,
          nre_formador: selectedRecord.nre_formador || null,
          componente_formador: selectedRecord.componente_formador || null,
          tutor_responsavel: selectedRecord.tutor_responsavel || null,
          email_tutor: selectedRecord.email_tutor || null,
          telefone_tutor: selectedRecord.telefone_tutor || null,
          nre_tutor: selectedRecord.nre_tutor || null,
          email_nre: selectedRecord['e-mail_nre'] || selectedRecord.email_nre || null,
          link: selectedRecord.link || selectedRecord['Link Classroom'] || selectedRecord.link_classroom || null,
          id_classroom: selectedRecord.id_classroom || null,
          periodo_ini: selectedRecord.periodo_ini || null,
          chamamento: selectedRecord.chamamento || null,
          nre_exe: selectedRecord.nre_exe || null,
          munic_exe: selectedRecord.munic_exe || null,
          componente_conc: selectedRecord.componente_conc || null,
          observacoes_cursista: selectedRecord.observacoes_cursista || null,
          observacoes_formador: selectedRecord.observacoes_formador || null,
          observacoes_tutor: selectedRecord.observacoes_tutor || null,
          observacoes_turma: selectedRecord.observacoes_turma || null,
          updated_at: new Date().toISOString()
        };

        const { error: supErr } = await supabase
          .from('cursistas')
          .upsert(supabasePayload, { onConflict: 'cod_cursista' });

        if (supErr) {
          console.error("Erro ao salvar no Supabase:", supErr);
        } else {
          console.log("Dados salvos no Supabase!");
        }

        if (movementLog) {
          await supabase.from('movimentacoes').insert(movementLog);
          console.log("Movimentação registrada no Supabase!");
        }
      }

      // 2. Gravar no Firebase (se configurado)
      if (isFirebaseConfigured && database) {
        if (oldUniqueId && oldUniqueId !== uniqueId) {
          const oldRecordRef = ref(database, `cursistas/${oldUniqueId}`);
          await set(oldRecordRef, null);
        }
        const recordRef = ref(database, `cursistas/${uniqueId}`);
        await set(recordRef, selectedRecord);
        
        if (movementLog) {
          const movementsRef = ref(database, 'movements');
          const newMovementRef = push(movementsRef);
          await set(newMovementRef, movementLog);
        }
      }

      // 3. Enviar para o Google Sheets via Apps Script Web App
      const appsScriptUrl = import.meta.env.VITE_APPS_SCRIPT_URL;
      if (appsScriptUrl) {
        const payload = JSON.stringify({
          action: 'updateRecord',
          data: selectedRecord,
          turma_anterior: originalRecord ? originalRecord.turmas : null,
          tipo_remanejamento: tipoRem
        });
        await fetch(appsScriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: payload
        });
      }

      // 4. Notificar a aplicação principal para atualizar o estado local instantaneamente
      if (onLocalUpdate) {
        const oldKey = originalRecord ? `${originalRecord.cgm}_${originalRecord.turmas}` : null;
        const newKey = `${selectedRecord.cgm}_${selectedRecord.turmas}`;
        onLocalUpdate(selectedRecord, oldKey !== newKey ? oldKey : null);
      }

      setSaveStatus('Salvo com sucesso na planilha e no banco de dados!');
      setTimeout(() => {
        handleCloseModal();
      }, 1500);

    } catch (err) {
      console.error("Erro ao salvar:", err);
      setSaveStatus(`Erro ao salvar: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Tratar exclusão de cursista
  const handleDelete = async (record) => {
    if (!window.confirm(`Tem certeza que deseja remover o cursista ${record.nome_cursista}?`)) {
      return;
    }

    setIsSaving(true);
    setSaveStatus('Removendo cursista...');
    
    try {
      const cleanKey = (val) => val ? val.toString().replace(/[\.\$\#\[\]\/]/g, "_").trim() : '';
      const uniqueId = record.cgm ? `EP-${record.cgm}_${cleanKey(record.turmas)}` : `EP-unknown`;
      
      const movementLog = {
        timestamp: new Date().toISOString(),
        nome_cursista: record.nome_cursista,
        cgm: record.cgm || '',
        turma_anterior: record.turmas || '',
        turma_nova: '',
        tipo_acao: 'Saída',
        email_tutor_responsavel: record.email_tutor || '',
        tutor: record.tutor_responsavel || '',
        nre: record.nre_tutor || ''
      };

      if (isSupabaseConfigured && supabase) {
        if (record.cgm) {
          await supabase.from('cursistas').delete().eq('cgm', String(record.cgm));
        } else if (record.cod_cursista) {
          await supabase.from('cursistas').delete().eq('cod_cursista', record.cod_cursista);
        }
        await supabase.from('movimentacoes').insert(movementLog);
      }

      if (isFirebaseConfigured && database) {
        const recordRef = ref(database, `cursistas/${uniqueId}`);
        await set(recordRef, null);
        
        const movementsRef = ref(database, 'movements');
        const newMovementRef = push(movementsRef);
        await set(newMovementRef, movementLog);
      }

      const deletedRecord = { ...record, nome_cursista: '', cgm: '', turmas: '', cgm_turma_key: uniqueId };
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

      {/* Bloco de Ações do Google Classroom */}
      <div className="glass-panel animate-fade-in" style={{ marginBottom: '1.25rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary-dark)', fontSize: '1.1rem', fontWeight: 800 }}>
              🎓 Google Classroom - Convites para Professores
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Convide as Tutoras (coluna N) e os e-mails dos NREs (coluna R) como co-docentes no Classroom.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              type="button"
              className="btn-primary" 
              style={{ backgroundColor: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.55rem 1.1rem', cursor: 'pointer' }}
              onClick={() => openMassInviteModal('tutor')}
            >
              🤝 Convidar Tutores em Massa
            </button>
            <button 
              type="button"
              className="btn-primary" 
              style={{ backgroundColor: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.55rem 1.1rem', cursor: 'pointer' }}
              onClick={() => openMassInviteModal('nre')}
            >
              🏢 Convidar NREs em Massa
            </button>
          </div>
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
                      <td style={{ fontSize: '0.85rem' }}>{item.cgm}</td>
                      <td style={{ fontWeight: 600 }}>{item.nome_cursista}</td>
                      <td>{item['e-mail'] || item.email || '-'}</td>
                      <td style={{ fontSize: '0.85rem' }}>{item.turmas}</td>
                      <td style={{ fontSize: '0.85rem' }}>{item.nome_formador}</td>
                      <td style={{ fontSize: '0.85rem' }}>{item.tutor_responsavel}</td>
                      <td>
                        <div className="actions-cell" style={{ display: 'flex', gap: '0.25rem' }}>
                          <button 
                            type="button"
                            className="action-btn email" 
                            onClick={() => handleEditClick(item)}
                          >
                            Editar
                          </button>
                          <button 
                            type="button"
                            className="action-btn" 
                            style={{ backgroundColor: '#0d9488', color: 'white' }}
                            onClick={() => handleRemanejarClick(item)}
                          >
                            Remanejar
                          </button>
                          <button 
                            type="button"
                            className="action-btn classroom" 
                            style={{ backgroundColor: '#f59e0b', color: 'white', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                            onClick={() => openIndividualInviteModal(item)}
                          >
                            Convidar
                          </button>
                          <button 
                            type="button"
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
          <div className="admin-form-card" style={{ maxWidth: editMode === 'remanejamento' ? '500px' : '800px' }}>
            <div className="form-header">
              <h3>
                {editMode === 'remanejamento' 
                  ? `Remanejar Cursista: ${selectedRecord.nome_cursista}` 
                  : `Editar Cadastro: ${selectedRecord.nome_cursista}`}
              </h3>
              <button className="close-modal-btn" onClick={handleCloseModal}>&times;</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              {editMode === 'remanejamento' ? (
                <div className="form-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '2rem' }}>
                  <div className="filter-group" style={{ gridColumn: '1 / -1' }}>
                    <span className="filter-label">Cursista</span>
                    <input 
                      type="text" 
                      className="filter-input" 
                      value={selectedRecord.nome_cursista || ''} 
                      disabled 
                      style={{ backgroundColor: 'var(--color-bg-light)', cursor: 'not-allowed' }} 
                    />
                  </div>
                  <div className="filter-group" style={{ gridColumn: '1 / -1' }}>
                    <span className="filter-label">CGM</span>
                    <input 
                      type="text" 
                      className="filter-input" 
                      value={selectedRecord.cgm || ''} 
                      disabled 
                      style={{ backgroundColor: 'var(--color-bg-light)', cursor: 'not-allowed' }} 
                    />
                  </div>
                  <div className="filter-group" style={{ gridColumn: '1 / -1' }}>
                    <span className="filter-label">Turma de Origem</span>
                    <input 
                      type="text" 
                      className="filter-input" 
                      value={originalRecord.turmas || '(Sem Turma)'} 
                      disabled 
                      style={{ 
                        backgroundColor: 'rgba(229, 62, 62, 0.05)', 
                        border: '1px solid #feb2b2', 
                        color: '#e53e3e', 
                        fontWeight: 600, 
                        cursor: 'not-allowed' 
                      }} 
                    />
                  </div>
                  <div className="filter-group" style={{ gridColumn: '1 / -1', position: 'relative' }}>
                    <span className="filter-label">Nova Turma (Destino)</span>
                    <input 
                      type="text"
                      className="filter-input"
                      placeholder="🔍 Digite para buscar a turma..."
                      value={turmaSearch}
                      onChange={(e) => {
                        setTurmaSearch(e.target.value);
                        setShowTurmaDropdown(true);
                      }}
                      onFocus={() => setShowTurmaDropdown(true)}
                      onBlur={() => {
                        // Timeout necessário para que o clique no dropdown seja processado
                        setTimeout(() => setShowTurmaDropdown(false), 250);
                      }}
                      required
                    />
                    
                    {showTurmaDropdown && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: 'white',
                        border: '1px solid var(--color-card-border)',
                        borderRadius: 'var(--radius-sm)',
                        boxShadow: 'var(--shadow-lg)',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        zIndex: 100,
                        marginTop: '0.25rem'
                      }}>
                        {uniqueTurmas
                          .filter(t => t.toLowerCase().includes(turmaSearch.toLowerCase()))
                          .map((t, i) => (
                            <div 
                              key={i}
                              style={{
                                padding: '0.75rem 1rem',
                                cursor: 'pointer',
                                borderBottom: '1px solid rgba(0,0,0,0.05)',
                                color: 'var(--color-text-main)',
                                fontSize: '0.9rem',
                                backgroundColor: hoveredIndex === i ? 'rgba(50, 130, 184, 0.08)' : 'transparent',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={() => setHoveredIndex(i)}
                              onMouseLeave={() => setHoveredIndex(null)}
                              onClick={() => {
                                handleInputChange('turma', t);
                                setTurmaSearch(t);
                                setShowTurmaDropdown(false);
                              }}
                            >
                              {t}
                            </div>
                          ))}
                        {uniqueTurmas.filter(t => t.toLowerCase().includes(turmaSearch.toLowerCase())).length === 0 && (
                          <div style={{ padding: '0.75rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                            Nenhuma turma encontrada.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
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
                    value={selectedRecord.turmas || ''} 
                    disabled
                    style={{ backgroundColor: 'var(--color-bg-light)', cursor: 'not-allowed' }}
                    title="Para mudar a turma, utilize o botão 'Remanejar' na tabela principal."
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                    Para alterar a turma, utilize a ação <strong>Remanejar</strong> na lista de cursistas.
                  </span>
                </div>

                <div className="filter-group">
                  <span className="filter-label">Link Classroom</span>
                  <input 
                    type="text" 
                    className="filter-input"
                    value={selectedRecord.link || selectedRecord['Link Classroom'] || selectedRecord.Link_Classroom || ''} 
                    onChange={e => handleInputChange('link', e.target.value)}
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
            )}

              <div className="form-footer">
                <button type="button" className="btn-secondary" onClick={handleCloseModal} disabled={isSaving}>
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

      {/* Modal de Sinalização do Remanejamento */}
      {showSinalizacaoModal && (
        <div className="admin-form-overlay animate-fade-in" style={{ zIndex: 1100 }}>
          <div className="admin-form-card" style={{ maxWidth: '550px', padding: 0 }}>
            <div className="form-header" style={{ backgroundColor: 'var(--color-primary-dark)', color: 'white' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🔀 Sinalização do Remanejamento
              </h3>
              <button className="close-modal-btn" onClick={() => setShowSinalizacaoModal(false)}>&times;</button>
            </div>
            
            <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <p style={{ margin: 0, color: 'var(--color-text-dark)', lineHeight: 1.5, fontSize: '0.95rem' }}>
                Você está alterando a turma do(a) cursista <strong>{selectedRecord?.nome_cursista}</strong> (CGM: {selectedRecord?.cgm}).
                Selecione a sinalização deste remanejamento para a notificação de e-mail:
              </p>

              {/* Opção 1: Provisório */}
              <div 
                onClick={() => setTipoRemanejamento('provisorio')}
                style={{
                  border: `2px solid ${tipoRemanejamento === 'provisorio' ? '#e28743' : 'var(--color-card-border)'}`,
                  backgroundColor: tipoRemanejamento === 'provisorio' ? 'rgba(226, 135, 67, 0.05)' : 'white',
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: tipoRemanejamento === 'provisorio' ? 'var(--shadow-sm)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <input 
                    type="radio" 
                    checked={tipoRemanejamento === 'provisorio'} 
                    onChange={() => setTipoRemanejamento('provisorio')}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <strong style={{ fontSize: '1.05rem', color: '#e28743' }}>1. Remanejamento Provisório</strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)', paddingLeft: '1.75rem', lineHeight: 1.4 }}>
                  Seus dados não serão alterados no SERE e nem no RCO, entre em contato com seu formador e tutor de destino para entender o processo.
                </p>
              </div>

              {/* Opção 2: Comum */}
              <div 
                onClick={() => setTipoRemanejamento('comum')}
                style={{
                  border: `2px solid ${tipoRemanejamento === 'comum' ? 'var(--color-accent-blue)' : 'var(--color-card-border)'}`,
                  backgroundColor: tipoRemanejamento === 'comum' ? 'rgba(33, 150, 243, 0.05)' : 'white',
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: tipoRemanejamento === 'comum' ? 'var(--shadow-sm)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <input 
                    type="radio" 
                    checked={tipoRemanejamento === 'comum'} 
                    onChange={() => setTipoRemanejamento('comum')}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <strong style={{ fontSize: '1.05rem', color: 'var(--color-accent-blue)' }}>2. Remanejamento Comum</strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)', paddingLeft: '1.75rem', lineHeight: 1.4 }}>
                  Seus dados foram alterados no SERE e atualizados no Google Classroom e RCO em até 48h. Aguarde o período de migração.
                </p>
              </div>

              <div className="form-footer" style={{ marginTop: '0.5rem', borderTop: '1px solid var(--color-card-border)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowSinalizacaoModal(false)}
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="btn-primary" 
                  disabled={isSaving}
                  onClick={() => executeSave(tipoRemanejamento)}
                >
                  {isSaving ? "Gravando e Enviando..." : "Confirmar e Enviar E-mail"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Integração Google Classroom (Individual e Massa) */}
      {showClassroomModal && (
        <div className="admin-form-overlay animate-fade-in" style={{ zIndex: 1200 }}>
          <div className="admin-form-card" style={{ maxWidth: '850px', padding: 0 }}>
            <div className="form-header" style={{ backgroundColor: classroomInviteType === 'tutor' ? '#10b981' : '#0ea5e9', color: 'white' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🎓 Convites do Google Classroom ({massInviteTarget === 'individual' ? 'Envio Individual' : 'Envio em Massa'})
              </h3>
              <button className="close-modal-btn" onClick={() => !isProcessingInvites && setShowClassroomModal(false)} disabled={isProcessingInvites}>&times;</button>
            </div>
            
            <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Opções de tipo de envio no caso individual */}
              {massInviteTarget === 'individual' && !isProcessingInvites && inviteCurrentIndex === 0 && (
                <div style={{ display: 'flex', gap: '1rem', backgroundColor: '#f1f5f9', padding: '0.75rem', borderRadius: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary-dark)' }}>Tipo de Convite:</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="indvInviteType" 
                      checked={classroomInviteType === 'tutor'} 
                      onChange={() => setClassroomInviteType('tutor')}
                    />
                    Tutor ({coursesList[0]?.emailTutor || 'Sem e-mail'})
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="indvInviteType" 
                      checked={classroomInviteType === 'nre'} 
                      onChange={() => setClassroomInviteType('nre')}
                    />
                    NRE ({coursesList[0]?.emailNre || 'Sem e-mail'})
                  </label>
                </div>
              )}

              {/* Se estiver processando ou finalizou, mostra a barra de progresso / resumo */}
              {(isProcessingInvites || inviteCurrentIndex > 0) && (
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--color-primary-dark)' }}>
                    Progresso do Envio
                  </h4>
                  
                  {/* Status do envio em tempo real */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '0.5rem' }}>
                    <span>{inviteCurrentStatus}</span>
                    <span>{inviteProgress}% ({inviteCurrentIndex} / {inviteTotalCount})</span>
                  </div>
                  
                  {/* Barra de Progresso Realista (estilo OS) */}
                  <div style={{ width: '100%', height: '24px', backgroundColor: '#e2e8f0', borderRadius: '12px', overflow: 'hidden', position: 'relative', border: '1px solid #cbd5e1', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{
                      width: `${inviteProgress}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                      transition: 'width 0.3s ease',
                      boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.15)'
                    }}></div>
                  </div>
                  
                  {/* Resumo parcial/final */}
                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--color-accent-green)' }}>🟢 Sucesso: <strong>{inviteSummary.success}</strong></span>
                    <span style={{ color: '#f59e0b' }}>🟡 Já cadastrado/pendente: <strong>{inviteSummary.already}</strong></span>
                    <span style={{ color: '#e53e3e' }}>🔴 Erros: <strong>{inviteSummary.error}</strong></span>
                  </div>
                  
                  {isProcessingInvites && (
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      style={{ marginTop: '1rem', width: '100%', borderColor: '#f87171', color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.05)', cursor: 'pointer' }}
                      onClick={() => setStopInviteProcessing(true)}
                    >
                      🛑 Interromper Envio
                    </button>
                  )}
                </div>
              )}

              {/* Seção de Verificação Manual (exibida antes de iniciar o processamento) */}
              {!isProcessingInvites && inviteCurrentIndex === 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                      Verifique as informações das turmas antes de disparar os convites:
                    </p>
                    {massInviteTarget === 'mass' && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          type="button"
                          className="page-btn" 
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', cursor: 'pointer' }}
                          onClick={() => setCoursesList(prev => prev.map(c => ({ 
                            ...c, 
                            selected: !!c.idClassroom && !!(classroomInviteType === 'tutor' ? c.emailTutor : c.emailNre) 
                          })))}
                        >
                          Selecionar Válidos
                        </button>
                        <button 
                          type="button"
                          className="page-btn" 
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', cursor: 'pointer' }}
                          onClick={() => setCoursesList(prev => prev.map(c => ({ ...c, selected: false })))}
                        >
                          Limpar Seleção
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--color-card-border)', borderRadius: '8px' }}>
                    <table className="custom-table" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          {massInviteTarget === 'mass' && <th style={{ width: '40px' }}>Sim</th>}
                          <th>Turma</th>
                          <th>ID Classroom</th>
                          <th>{classroomInviteType === 'tutor' ? 'Tutor Responsável' : 'E-mail NRE'}</th>
                          <th>Status dos Dados</th>
                        </tr>
                      </thead>
                      <tbody>
                        {coursesList.map((course, idx) => {
                          const targetEmail = classroomInviteType === 'tutor' ? course.emailTutor : course.emailNre;
                          const hasId = !!course.idClassroom;
                          const hasEmail = !!targetEmail;
                          const isValid = hasId && hasEmail;
                          
                          return (
                            <tr key={idx} style={{ opacity: isValid ? 1 : 0.6, backgroundColor: isValid ? 'transparent' : '#fffbeb' }}>
                              {massInviteTarget === 'mass' && (
                                <td>
                                  <input 
                                    type="checkbox" 
                                    checked={course.selected} 
                                    disabled={!isValid}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setCoursesList(prev => prev.map((c, i) => i === idx ? { ...c, selected: checked } : c));
                                    }}
                                    style={{ width: '16px', height: '16px', cursor: isValid ? 'pointer' : 'not-allowed' }}
                                  />
                                </td>
                              )}
                              <td style={{ fontSize: '0.8rem', fontWeight: 600 }}>{course.turmas}</td>
                              <td style={{ fontSize: '0.8rem', color: hasId ? 'inherit' : '#ef4444' }}>{course.idClassroom || '⚠️ Ausente'}</td>
                              <td style={{ fontSize: '0.8rem', color: hasEmail ? 'inherit' : '#ef4444' }}>
                                {classroomInviteType === 'tutor' 
                                  ? (course.tutorName ? `${course.tutorName} (${course.emailTutor || 'Sem e-mail'})` : '⚠️ Não atribuído')
                                  : (course.emailNre || '⚠️ Ausente')}
                              </td>
                              <td>
                                {isValid ? (
                                  <span style={{ color: 'var(--color-accent-green)', fontWeight: 600, fontSize: '0.75rem' }}>✓ Pronto</span>
                                ) : (
                                  <span style={{ color: '#d97706', fontWeight: 600, fontSize: '0.75rem' }}>
                                    {!hasId && !hasEmail ? 'ID e e-mail ausentes' : !hasId ? 'ID Classroom ausente' : 'E-mail ausente'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Lista de Detalhes dos Resultados (Erros ou Sucessos) */}
              {!isProcessingInvites && inviteCurrentIndex > 0 && inviteSummary.details.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-primary-dark)' }}>Relatório de Detalhes</h4>
                  <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem' }}>
                    {inviteSummary.details.map((detail, idx) => (
                      <div 
                        key={idx} 
                        style={{ 
                          padding: '0.5rem 0.75rem', 
                          borderBottom: '1px solid #e2e8f0',
                          backgroundColor: detail.status === 'error' ? '#fef2f2' : detail.status === 'already' ? '#fffbeb' : '#f0fdf4',
                          color: detail.status === 'error' ? '#991b1b' : detail.status === 'already' ? '#92400e' : '#166534',
                          display: 'flex',
                          justifyContent: 'space-between'
                        }}
                      >
                        <span><strong>{detail.turmas}</strong> ({detail.email})</span>
                        <span>{detail.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rodapé do Modal */}
              <div className="form-footer" style={{ borderTop: '1px solid var(--color-card-border)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setShowClassroomModal(false)}
                  disabled={isProcessingInvites}
                  style={{ cursor: 'pointer' }}
                >
                  {inviteCurrentIndex > 0 ? "Fechar" : "Cancelar"}
                </button>
                
                {!isProcessingInvites && inviteCurrentIndex === 0 && (
                  <button 
                    type="button" 
                    className="btn-primary" 
                    style={{ backgroundColor: classroomInviteType === 'tutor' ? '#10b981' : '#0ea5e9', cursor: 'pointer' }}
                    onClick={() => startSendingInvites(classroomInviteType)}
                  >
                    🚀 Iniciar Envio de Convites
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
