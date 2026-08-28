import React, { useState } from 'react';

export default function FormularioChamadoTutor({ userEmail, tutorData, onClose, onSubmitSuccess }) {
  const [nre, setNre] = useState(tutorData?.nre_tutor || 'CURITIBA');
  const [nomeTutor, setNomeTutor] = useState((tutorData?.tutor_responsavel || '').toUpperCase());
  const [emailTutor, setEmailTutor] = useState(userEmail || tutorData?.email_educ || '');
  
  const [motivo, setMotivo] = useState('Troca de Turma');
  const [situacaoRelacionada, setSituacaoRelacionada] = useState('Cursista');
  const [nomeEnvolvido, setNomeEnvolvido] = useState('');
  const [anoFormacao, setAnoFormacao] = useState('1º ANO');
  const [chamamento, setChamamento] = useState('1º CHAMAMENTO');
  
  const [modalidadeDetalhes, setModalidadeDetalhes] = useState('NSA');
  const [turmaDetalhes, setTurmaDetalhes] = useState('');
  const [descricao, setDescricao] = useState('');
  
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [confirmacao, setConfirmacao] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState(false);

  const nreOptions = [
    "AMPÉRE", "APUCARANA", "ÁREA METROPOLITANA NORT", "ÁREA METROPOLITANA SUL",
    "ASSIS CHATEAUBRIAND", "CAMPO MOURÃO", "CASCAVEL", "CIANORTE", "CORNÉLIO PROCÓPIO",
    "CURITIBA", "DOIS VIZINHOS", "FOZ DO IGUAÇU", "FRANCISCO BELTRÃO", "GOIOERÊ",
    "GUARAPUAVA", "IBAITI", "IRATI", "IVAIPORÃ", "JACAREZINHO", "LARANJEIRAS DO SUL",
    "LOANDA", "LONDRINA", "MARINGÁ", "PARANAGUÁ", "PARANAVAÍ", "PATO BRANCO",
    "PITANGA", "PONTA GROSSA", "TELÊMACO BORBA", "TOLEDO", "UMUARAMA", "UNIÃO DA VITÓRIA"
  ];

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setNomeArquivo(e.target.files[0].name);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!descricao.trim() || descricao.trim().length < 15) {
      alert("Por favor, descreva os detalhes da solicitação com pelo menos 15 caracteres.");
      return;
    }
    if (!confirmacao) {
      alert("Por favor, marque a caixa de confirmação das informações.");
      return;
    }

    setIsSubmitting(true);

    const dataHoraIso = new Date().toISOString();
    const dataHoraFormatada = new Date().toLocaleString('pt-BR');

    const novoChamado = {
      id: `CHAM-TUTOR-${Date.now()}`,
      timestamp: dataHoraIso,
      dataHora: dataHoraFormatada,
      email: emailTutor,
      email_tutor_responsavel: emailTutor,
      tutor: nomeTutor,
      tutor_responsavel: nomeTutor,
      nre: nre,
      motivo: motivo,
      situacao_relacionada: situacaoRelacionada,
      nome_cursista: nomeEnvolvido.trim().toUpperCase(),
      nomeCursista: nomeEnvolvido.trim().toUpperCase(),
      ano_formacao: anoFormacao,
      chamamento: chamamento,
      modalidade_detalhes: modalidadeDetalhes,
      turma_detalhes: turmaDetalhes,
      turma_anterior: turmaDetalhes,
      justificativa: descricao,
      descricao: descricao,
      comprovante: nomeArquivo || 'Sem anexo',
      status: 'Pendente',
      tipo_acao: 'Chamado Tutor',
      solicitadoPor: 'Tutor'
    };

    setTimeout(() => {
      setIsSubmitting(false);
      setMensagemSucesso(true);
      if (onSubmitSuccess) {
        onSubmitSuccess(novoChamado);
      }
    }, 600);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 29, 61, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 1100, padding: '1rem'
    }} onClick={onClose}>
      <div className="animate-fade-in" style={{
        background: 'white', borderRadius: '16px',
        width: '100%', maxWidth: '780px', maxHeight: '94vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)', overflow: 'hidden'
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary-mid) 100%)',
          color: 'white', padding: '1.25rem 1.5rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/brasao_parana.svg" alt="Brasão do Paraná" style={{ height: '36px', width: 'auto' }} />
            <div>
              <span style={{ fontSize: '0.7rem', backgroundColor: 'var(--color-accent-green)', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 800 }}>
                Estágio Probatório SEED/PR
              </span>
              <h2 style={{ fontSize: '1.2rem', marginTop: '0.2rem', fontWeight: 800 }}>
                📋 Abertura de Requerimento / Chamado do Tutor
              </h2>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.2rem' }}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>

          {mensagemSucesso ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 1rem' }}>
                ✓
              </div>
              <h3 style={{ fontSize: '1.3rem', color: 'var(--color-primary-dark)', fontWeight: 800, marginBottom: '0.5rem' }}>
                Chamado Registrado com Sucesso!
              </h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: '1.5', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
                O seu requerimento foi enviado para a <b>Fila de Atendimento do Administrador</b>. Você pode acompanhar o status (Pendente / Deferido / Indeferido) no histórico.
              </p>
              <button className="btn-primary" onClick={onClose} style={{ padding: '0.6rem 1.8rem' }}>
                Fechar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.9rem', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--color-primary-dark)', display: 'block', marginBottom: '0.3rem' }}>
                  📌 Formulário Oficial de Chamados dos Tutores
                </span>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                  Preencha as informações do requerimento. Todas as solicitações são sincronizadas diretamente com a equipe técnica.
                </span>
              </div>

              {/* Grid 2 Colunas: NRE e Dados Tutor */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.3rem' }}>
                    1. SELECIONE SEU NRE: <span style={{ color: '#e53e3e' }}>*</span>
                  </label>
                  <select 
                    value={nre} 
                    onChange={e => setNre(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: 'white' }}
                  >
                    {nreOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.3rem' }}>
                    2. NOME DO(A) TUTOR(A): <span style={{ color: '#e53e3e' }}>*</span>
                  </label>
                  <input 
                    type="text"
                    placeholder="NOME COMPLETO DO TUTOR..."
                    value={nomeTutor}
                    onChange={e => setNomeTutor(e.target.value.toUpperCase())}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    required
                  />
                </div>
              </div>

              {/* Email do Tutor */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.3rem' }}>
                  3. E-mail institucional (@escola.pr.gov.br) do tutor: <span style={{ color: '#e53e3e' }}>*</span>
                </label>
                <input 
                  type="email"
                  placeholder="seu.email@escola.pr.gov.br"
                  value={emailTutor}
                  onChange={e => setEmailTutor(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  required
                />
              </div>

              {/* Motivo e Situação */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.3rem' }}>
                    4. Qual o motivo do requerimento? <span style={{ color: '#e53e3e' }}>*</span>
                  </label>
                  <select 
                    value={motivo} 
                    onChange={e => setMotivo(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: 'white' }}
                  >
                    <option value="Troca de Turma">Troca de Turma</option>
                    <option value="Troca de Modalidade">Troca de Modalidade</option>
                    <option value="Vínculo na AF">Vínculo na AF (Ano Formativo)</option>
                    <option value="Outros Requerimentos">Outros Requerimentos</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.3rem' }}>
                    5. Situação relacionada a: <span style={{ color: '#e53e3e' }}>*</span>
                  </label>
                  <select 
                    value={situacaoRelacionada} 
                    onChange={e => setSituacaoRelacionada(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: 'white' }}
                  >
                    <option value="Cursista">Cursista</option>
                    <option value="Formador">Formador</option>
                    <option value="Turma Geral">Turma Geral</option>
                  </select>
                </div>
              </div>

              {/* Nome do Envolvido em MAIÚSCULAS */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.3rem' }}>
                  6. Nome do cursista ou Formador (sem acento, em MAIÚSCULAS): <span style={{ color: '#e53e3e' }}>*</span>
                </label>
                <input 
                  type="text"
                  placeholder="EX: NOME COMPLETO DO CURSISTA OU FORMADOR"
                  value={nomeEnvolvido}
                  onChange={e => setNomeEnvolvido(e.target.value.toUpperCase())}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  required
                />
              </div>

              {/* Ano e Chamamento */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.3rem' }}>
                    7. Qual é o ano de formação?
                  </label>
                  <select 
                    value={anoFormacao} 
                    onChange={e => setAnoFormacao(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: 'white' }}
                  >
                    <option value="1º ANO">1º Ano Formativo</option>
                    <option value="2º ANO">2º Ano Formativo</option>
                    <option value="3º ANO">3º Ano Formativo</option>
                    <option value="NSA">NSA (Não se aplica)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.3rem' }}>
                    8. Qual é o chamamento?
                  </label>
                  <select 
                    value={chamamento} 
                    onChange={e => setChamamento(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: 'white' }}
                  >
                    <option value="1º CHAMAMENTO">1º Chamamento</option>
                    <option value="2º CHAMAMENTO">2º Chamamento</option>
                    <option value="3º CHAMAMENTO">3º Chamamento</option>
                    <option value="NSA">NSA (Não se aplica)</option>
                  </select>
                </div>
              </div>

              {/* Detalhes de Modalidade e Turma */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.3rem' }}>
                  9. Modalidade atual e solicitada (ou NSA):
                </label>
                <input 
                  type="text"
                  placeholder="Ex: Atual: EAD -> Solicitada: Presencial (ou NSA)"
                  value={modalidadeDetalhes}
                  onChange={e => setModalidadeDetalhes(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.3rem' }}>
                  10. Turma atual (componente, horário) e Turma desejada (ou NSA):
                </label>
                <input 
                  type="text"
                  placeholder="Ex: Turma Atual: FORM-ARTE A -> Turma Desejada: FORM-ARTE B MANHA"
                  value={turmaDetalhes}
                  onChange={e => setTurmaDetalhes(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              {/* Descrição Detalhada */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.3rem' }}>
                  11. Descreva com detalhes a solicitação desejada: <span style={{ color: '#e53e3e' }}>*</span>
                </label>
                <textarea 
                  rows="3"
                  placeholder="Informe detalhadamente os dados dos formadores, cursistas, turmas e justificativa..."
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontFamily: 'inherit', resize: 'vertical' }}
                  required
                />
              </div>

              {/* Anexo */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.3rem' }}>
                  12. Anexo de imagem ou documento (Opcional):
                </label>
                <input 
                  type="file" 
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={handleFileChange}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px dashed #cbd5e1', backgroundColor: '#f8fafc', fontSize: '0.85rem' }}
                />
                {nomeArquivo && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-accent-blue)', display: 'block', marginTop: '0.25rem' }}>
                    📎 Arquivo anexo: <b>{nomeArquivo}</b>
                  </span>
                )}
              </div>

              {/* Confirmação */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#fffbebfb', border: '1px solid #fef3c7', padding: '0.75rem', borderRadius: '8px', marginTop: '0.3rem' }}>
                <input 
                  type="checkbox" 
                  id="confirmacao-tutor"
                  checked={confirmacao}
                  onChange={e => setConfirmacao(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="confirmacao-tutor" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400e', cursor: 'pointer' }}>
                  CONFIRMO a veracidade dos dados informados neste requerimento.
                </label>
              </div>

              {/* Footer Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ padding: '0.65rem 1.6rem' }}>
                  {isSubmitting ? 'Enviando Chamado...' : 'Enviar Requerimento'}
                </button>
              </div>

            </form>
          )}

        </div>
      </div>
    </div>
  );
}
