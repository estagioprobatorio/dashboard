import React, { useState } from 'react';

export default function FormularioRemanejamento({ cursistaData, onClose, onSubmitSuccess }) {
  const [tipoRequerimento, setTipoRequerimento] = useState('Troca de Turma');
  const [motivo, setMotivo] = useState('Choque de horário com trabalho/estudo');
  const [turnoDesejado, setTurnoDesejado] = useState('MANHA');
  const [modalidadeDesejada, setModalidadeDesejada] = useState('Presencial');
  const [justificativa, setJustificativa] = useState('');
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState(false);

  // Auto-preenchimento vindo do cadastro do Cursista
  const nomeCursista = cursistaData?.nome_cursista || cursistaData?.nome || 'Cursista Logado';
  const cgmCursista = cursistaData?.cgm || 'Não informado';
  const emailCursista = cursistaData?.['e-mail'] || cursistaData?.email || cursistaData?.email_cursista || '';
  const turmaAtual = cursistaData?.turmas || 'Turma não identificada';
  const formadorAtual = cursistaData?.nome_formador || 'Formador não informado';
  const tutorAtual = cursistaData?.tutor_responsavel || 'Tutor não informado';
  const nreCursista = cursistaData?.nre_tutor || cursistaData?.nre || 'NRE não informado';

  const [cpf, setCpf] = useState(cursistaData?.cpf || '');
  const [rg, setRg] = useState(cursistaData?.rg || '');

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setNomeArquivo(e.target.files[0].name);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!justificativa.trim() || justificativa.trim().length < 15) {
      alert("Por favor, preencha uma justificativa detalhada com pelo menos 15 caracteres.");
      return;
    }

    setIsSubmitting(true);

    const dataHoraIso = new Date().toISOString();
    const dataHoraFormatada = new Date().toLocaleString('pt-BR');

    const novaSolicitacao = {
      id: `MOV-${Date.now()}`,
      timestamp: dataHoraIso,
      dataHora: dataHoraFormatada,
      cgm: cgmCursista,
      cpf: cpf,
      rg: rg,
      nome_cursista: nomeCursista,
      nomeCursista: nomeCursista,
      emailCursista: emailCursista,
      email: emailCursista,
      nre: nreCursista,
      turmaOrigem: turmaAtual,
      turma_anterior: turmaAtual,
      formadorOrigem: formadorAtual,
      tutorOrigem: tutorAtual,
      motivo: `${tipoRequerimento} - ${motivo}`,
      tipo_acao: tipoRequerimento,
      turnoDesejado: tipoRequerimento === 'Troca de Turma' ? turnoDesejado : 'NSA',
      modalidadeDesejada: tipoRequerimento === 'Troca de Modalidade' ? modalidadeDesejada : 'NSA',
      justificativa: justificativa,
      descricao: justificativa,
      comprovante: nomeArquivo || 'Sem anexo',
      status: 'Pendente',
      solicitadoPor: 'Cursista'
    };

    setTimeout(() => {
      setIsSubmitting(false);
      setMensagemSucesso(true);
      if (onSubmitSuccess) {
        onSubmitSuccess(novaSolicitacao);
      }
    }, 600);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 29, 61, 0.7)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '1rem'
    }} onClick={onClose}>
      <div className="animate-fade-in" style={{
        background: 'white',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden'
      }} onClick={e => e.stopPropagation()}>

        {/* Modal Header */}
        <div style={{
          background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary-mid) 100%)',
          color: 'white',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/brasao_parana.svg" alt="Brasão do Paraná" style={{ height: '36px', width: 'auto' }} />
            <div>
              <span style={{ fontSize: '0.7rem', backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700 }}>
                Estágio Probatório SEED/PR
              </span>
              <h2 style={{ fontSize: '1.2rem', marginTop: '0.2rem', fontWeight: 800 }}>
                📝 Solicitação de Remanejamento de Turma
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
                Solicitação Enviada com Sucesso!
              </h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: '1.5', maxWidth: '460px', margin: '0 auto 1.5rem' }}>
                Sua solicitação de remanejamento foi registrada no sistema com o status <b>Pendente</b>. A equipe técnica analisará o pedido.
              </p>
              <button className="btn-primary" onClick={onClose} style={{ padding: '0.6rem 1.8rem' }}>
                Entendido / Fechar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              
              {/* Bloco de Dados Pré-Preenchidos (Auto-Detectados) */}
              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-accent-blue)', textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '0.5px' }}>
                  ℹ️ Seus Dados do Cadastro (Identificação Automática)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.6rem', fontSize: '0.85rem' }}>
                  <div><b>Nome:</b> {nomeCursista}</div>
                  <div><b>CGM:</b> {cgmCursista}</div>
                  <div><b>E-mail:</b> {emailCursista || 'Logado no Google'}</div>
                  <div><b>Turma Atual:</b> {turmaAtual}</div>
                  <div><b>Formador:</b> {formadorAtual}</div>
                  <div><b>Tutor:</b> {tutorAtual}</div>
                </div>
              </div>

              {/* Seleção do Tipo de Requerimento */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.4rem' }}>
                  1. Tipo de Requerimento / Solicitação: <span style={{ color: '#e53e3e' }}>*</span>
                </label>
                <select 
                  value={tipoRequerimento} 
                  onChange={e => setTipoRequerimento(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontSize: '0.88rem', fontWeight: 700 }}
                >
                  <option value="Troca de Turma">🔄 Troca de Turma</option>
                  <option value="Troca de Modalidade">💻 Troca de Modalidade (Presencial / EAD)</option>
                  <option value="Vínculo na AF">🎓 Vínculo na AF (Ano Formativo)</option>
                </select>
              </div>

              {/* Seleção do Motivo */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.4rem' }}>
                  2. Motivo Principal da Solicitação: <span style={{ color: '#e53e3e' }}>*</span>
                </label>
                <select 
                  value={motivo} 
                  onChange={e => setMotivo(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontSize: '0.88rem' }}
                >
                  <option value="Choque de horário com trabalho/estudo">Choque de horário com trabalho/estudo</option>
                  <option value="Mudança de escola ou município de atuação">Mudança de escola ou município de atuação</option>
                  <option value="Incompatibilidade comprovada de jornada">Incompatibilidade comprovada de jornada</option>
                  <option value="Motivos de saúde / acompanhamento médico">Motivos de saúde / acompanhamento médico</option>
                  <option value="Outros motivos pessoais">Outros motivos pessoais</option>
                </select>
              </div>

              {/* Seleção de Turno Desejado */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.4rem' }}>
                  2. Turno Pretendido para a Nova Turma: <span style={{ color: '#e53e3e' }}>*</span>
                </label>
                <select 
                  value={turnoDesejado} 
                  onChange={e => setTurnoDesejado(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontSize: '0.88rem' }}
                >
                  <option value="MANHA">Manhã (ex: Quinta-feira 10h)</option>
                  <option value="TARDE">Tarde (ex: Terça-feira 14h)</option>
                  <option value="NOITE">Noite (ex: Quarta-feira 19h)</option>
                  <option value="QUALQUER">Qualquer turno com vaga disponível</option>
                </select>
              </div>

              {/* Justificativa Livre */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.4rem' }}>
                  3. Justificativa Detalhada: <span style={{ color: '#e53e3e' }}>*</span>
                </label>
                <textarea 
                  rows="3"
                  placeholder="Descreva detalhadamente o motivo da sua solicitação..."
                  value={justificativa}
                  onChange={e => setJustificativa(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontSize: '0.88rem', fontFamily: 'inherit', resize: 'vertical' }}
                  required
                />
              </div>

              {/* Anexo de Comprovante (Opcional) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '0.4rem' }}>
                  4. Anexo de Comprovante (Opcional - PDF ou Imagem):
                </label>
                <input 
                  type="file" 
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px dashed #cbd5e1', backgroundColor: '#f8fafc', fontSize: '0.85rem' }}
                />
                {nomeArquivo && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-accent-blue)', display: 'block', marginTop: '0.25rem' }}>
                    📎 Arquivo selecionado: <b>{nomeArquivo}</b>
                  </span>
                )}
              </div>

              {/* Botões do Form */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ padding: '0.65rem 1.4rem' }}>
                  {isSubmitting ? 'Enviando...' : 'Enviar Solicitação'}
                </button>
              </div>

            </form>
          )}

        </div>
      </div>
    </div>
  );
}
