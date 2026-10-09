import React, { useState } from 'react';

export default function FormularioInserirObservacao({ cursista, turmaInfo, onSave, onClose }) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  // Form State com valores inteligentes pré-preenchidos
  const [formData, setFormData] = useState({
    nome_cursista: cursista?.nome || cursista?.nome_cursista || '',
    email_cursista: (cursista?.email || cursista?.email_cursista || '').trim().toLowerCase(),
    cgm: cursista?.cgm || '',
    turma: turmaInfo?.turma || cursista?.turma || '',
    componente: turmaInfo?.componente || cursista?.componente || '',
    nome_formador: turmaInfo?.formador || '',
    email_formador: turmaInfo?.emailFormador || '',
    tutor_responsavel: turmaInfo?.tutor || '',
    email_tutor: turmaInfo?.emailTutor || '',
    ano_formativo: turmaInfo?.anoFormativo || '1º ANO',
    semestre: '2º Semestre',
    modalidade: 'Docentes',
    modalidade_feedback: 'Diálogo formativo',
    tema: 'Tema 2: Gestão de Sala de Aula e Engajamento',
    data_pratica: new Date().toISOString().split('T')[0],
    data_observacao: new Date().toISOString().split('T')[0],
    data_feedback: new Date().toISOString().split('T')[0],
    observacao_realizada: 'Sim, a observação foi realizada.',
    is_realizada: true,
    nivel_planejamento: 'ATINGE INTEGRALMENTE',
    nivel_pratica: 'ATINGE INTEGRALMENTE',
    evidencias_planejamento: '',
    evidencias_pratica: '',
    questionamentos_propositivos: '',
    proposicoes_sugestoes: '',
    combinados: '',
    justificativa_nao_realizada: '',
    link_planejamento: '',
    link_gravacao_pratica: '',
    link_gravacao_feedback: ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleToggleRealizada = (realizada) => {
    setFormData(prev => ({
      ...prev,
      is_realizada: realizada,
      observacao_realizada: realizada ? 'Sim, a observação foi realizada.' : 'Não realizada / Justificada'
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    if (!formData.email_cursista) {
      setErro('O e-mail do cursista é obrigatório.');
      return;
    }

    if (formData.is_realizada && (!formData.nivel_pratica || !formData.nivel_planejamento)) {
      setErro('Por favor, informe os níveis pedagógicos de Planejamento e Prática.');
      return;
    }

    if (!formData.is_realizada && !formData.justificativa_nao_realizada.trim()) {
      setErro('Por favor, descreva a justificativa para a observação não realizada.');
      return;
    }

    setLoading(true);

    try {
      // Montar objeto padronizado com timestamp de carimbo
      const now = new Date();
      const carimboFormatado = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');
      
      const payload = {
        ...formData,
        id: `obs_${Date.now()}`,
        id_origem: `DASH_${formData.ano_formativo.replace(/\s+/g, '')}_${formData.semestre.replace(/\s+/g, '')}_${Date.now()}`,
        carimbo: carimboFormatado,
        created_at: now.toISOString()
      };

      if (onSave) {
        await onSave(payload);
      }

      if (onClose) onClose();
    } catch (err) {
      console.error('Erro ao salvar observação:', err);
      setErro(err.message || 'Falha ao salvar observação.');
    } finally {
      setLoading(false);
    }
  };

  const niveisOpcoes = [
    { id: 'SUPERA', label: 'Supera', color: '#00984a', bg: '#dcfce7', desc: 'Prática exemplar que ultrapassa os objetivos previstos' },
    { id: 'ATINGE INTEGRALMENTE', label: 'Atinge Integralmente', color: '#0072bc', bg: '#e0f2fe', desc: 'Atende com segurança e autonomia todos os critérios' },
    { id: 'ATINGE PARCIALMENTE', label: 'Atinge Parcialmente', color: '#b45309', bg: '#fef3c7', desc: 'Atende em parte, necessita de intervenção mediada' },
    { id: 'NÃO ATINGE', label: 'Não Atinge', color: '#b91c1c', bg: '#fee2e2', desc: 'Não demonstrou os critérios pedagógicos esperados' }
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 29, 61, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 11000,
      padding: '1rem'
    }} onClick={onClose}>
      <div 
        className="animate-fade-in" 
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '960px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          overflow: 'hidden'
        }}
      >
        {/* Cabeçalho */}
        <div style={{
          background: 'linear-gradient(135deg, #001d3d 0%, #002d5c 60%, #0072bc 100%)',
          color: '#ffffff',
          padding: '1.25rem 1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '3px solid #00984a'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
              <span style={{ backgroundColor: '#00984a', color: '#ffffff', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
                SEED/PR • REGISTRO FORMATIVO
              </span>
              <span style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#ffffff', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                {formData.turma || 'Turma'}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>
              Nova Observação da Prática Pedagógica
            </h2>
            <p style={{ margin: '0.2rem 0 0 0', color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.85rem' }}>
              Professor(a) Cursista: <strong>{formData.nome_cursista || 'Identificar Cursista'}</strong> {formData.email_cursista ? `(${formData.email_cursista})` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              fontSize: '1.2rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
          >
            ✕
          </button>
        </div>

        {/* Formulário com Scroll suave */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {erro && (
              <div style={{ padding: '0.85rem 1.25rem', backgroundColor: '#fee2e2', border: '1px solid #f87171', borderRadius: '8px', color: '#b91c1c', fontSize: '0.9rem', fontWeight: 600 }}>
                ⚠️ {erro}
              </div>
            )}

            {/* SEÇÃO 0: IDENTIFICAÇÃO DO CURSISTA (se não pré-selecionado) */}
            {(!cursista?.email && !cursista?.email_cursista) && (
              <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #cbd5e1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Nome Completo do Cursista *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nome do cursista..."
                    value={formData.nome_cursista}
                    onChange={e => handleChange('nome_cursista', e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    E-mail Institucional (@escola.pr.gov.br) *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="exemplo@escola.pr.gov.br"
                    value={formData.email_cursista}
                    onChange={e => handleChange('email_cursista', e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            )}

            {/* SEÇÃO 1: STATUS DA OBSERVAÇÃO */}
            <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>
                1. Status da Observação Pedagógica
              </label>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleToggleRealizada(true)}
                  style={{
                    flex: 1,
                    minWidth: '220px',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: formData.is_realizada ? '2px solid #00984a' : '1px solid #cbd5e1',
                    backgroundColor: formData.is_realizada ? '#f0fdf4' : '#ffffff',
                    color: formData.is_realizada ? '#166534' : '#475569',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>✓</span>
                  Observação Realizada com Sucesso
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleRealizada(false)}
                  style={{
                    flex: 1,
                    minWidth: '220px',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: !formData.is_realizada ? '2px solid #ef4444' : '1px solid #cbd5e1',
                    backgroundColor: !formData.is_realizada ? '#fef2f2' : '#ffffff',
                    color: !formData.is_realizada ? '#991b1b' : '#475569',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                  Não Realizada / Justificada
                </button>
              </div>
            </div>

            {/* SEÇÃO 2: DADOS FORMATIVOS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Ano Formativo
                </label>
                <select
                  value={formData.ano_formativo}
                  onChange={e => handleChange('ano_formativo', e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                >
                  <option value="1º ANO">1º ANO</option>
                  <option value="2º ANO">2º ANO</option>
                  <option value="3º ANO">3º ANO</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Semestre de Aplicação
                </label>
                <select
                  value={formData.semestre}
                  onChange={e => handleChange('semestre', e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                >
                  <option value="1º Semestre">1º Semestre</option>
                  <option value="2º Semestre">2º Semestre</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Formato da Devolutiva (Feedback)
                </label>
                <select
                  value={formData.modalidade_feedback}
                  onChange={e => handleChange('modalidade_feedback', e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                >
                  <option value="Diálogo formativo">Diálogo formativo (Online Meet)</option>
                  <option value="Devolutiva gravada">Devolutiva gravada (Vídeo/Áudio)</option>
                  <option value="Encontro formativo">Encontro formativo presencial</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Data do Feedback / Devolutiva
                </label>
                <input
                  type="date"
                  value={formData.data_feedback}
                  onChange={e => handleChange('data_feedback', e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            {/* SEÇÃO 3: TEMA DA OBSERVAÇÃO */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Tema Formativo / Foco da Observação
              </label>
              <input
                type="text"
                value={formData.tema}
                onChange={e => handleChange('tema', e.target.value)}
                placeholder="Ex: Tema 1: Currículo e Materiais de Apoio ou Tema 2: Gestão de Sala de Aula..."
                style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </div>

            {/* SEÇÃO 4: SE REALIZADA - NÍVEIS PEDAGÓGICOS */}
            {formData.is_realizada ? (
              <>
                {/* NÍVEL DE PLANEJAMENTO */}
                <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 800, color: '#002d5c', marginBottom: '0.5rem' }}>
                    📝 Nível do Planejamento Pedagógico
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    {niveisOpcoes.map(op => {
                      const selected = formData.nivel_planejamento === op.id;
                      return (
                        <div
                          key={op.id}
                          onClick={() => handleChange('nivel_planejamento', op.id)}
                          style={{
                            padding: '0.75rem',
                            borderRadius: '8px',
                            border: selected ? `2px solid ${op.color}` : '1px solid #e2e8f0',
                            backgroundColor: selected ? op.bg : '#ffffff',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.85rem', color: op.color }}>{op.label}</span>
                            {selected && <span style={{ color: op.color, fontWeight: 900 }}>●</span>}
                          </div>
                          <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', lineHeight: 1.25 }}>{op.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* NÍVEL DA PRÁTICA DOCENTE */}
                <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 800, color: '#002d5c', marginBottom: '0.5rem' }}>
                    🎯 Nível da Prática Docente (Regência / Aulas)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    {niveisOpcoes.map(op => {
                      const selected = formData.nivel_pratica === op.id;
                      return (
                        <div
                          key={op.id}
                          onClick={() => handleChange('nivel_pratica', op.id)}
                          style={{
                            padding: '0.75rem',
                            borderRadius: '8px',
                            border: selected ? `2px solid ${op.color}` : '1px solid #e2e8f0',
                            backgroundColor: selected ? op.bg : '#ffffff',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.85rem', color: op.color }}>{op.label}</span>
                            {selected && <span style={{ color: op.color, fontWeight: 900 }}>●</span>}
                          </div>
                          <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', lineHeight: 1.25 }}>{op.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* SEÇÃO 5: DESCRITIVOS QUALITATIVOS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                      🔍 Evidências Observadas (Prática & Planejamento)
                    </label>
                    <textarea
                      rows={3}
                      value={formData.evidencias_pratica}
                      onChange={e => handleChange('evidencias_pratica', e.target.value)}
                      placeholder="Descreva situações concretas observadas durante a aula ou na análise dos planos..."
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', resize: 'vertical' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                      💡 Questionamentos Propositivos
                    </label>
                    <textarea
                      rows={3}
                      value={formData.questionamentos_propositivos}
                      onChange={e => handleChange('questionamentos_propositivos', e.target.value)}
                      placeholder="Perguntas realizadas ao cursista para promover a reflexão sobre sua prática..."
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', resize: 'vertical' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                      ✨ Proposições e Sugestões do Formador
                    </label>
                    <textarea
                      rows={3}
                      value={formData.proposicoes_sugestoes}
                      onChange={e => handleChange('proposicoes_sugestoes', e.target.value)}
                      placeholder="Orientações e encaminhamentos pedagógicos para o aperfeiçoamento..."
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', resize: 'vertical' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                      🤝 Combinados e Plano de Ação
                    </label>
                    <textarea
                      rows={3}
                      value={formData.combinados}
                      onChange={e => handleChange('combinados', e.target.value)}
                      placeholder="Metas acordadas entre formador e cursista para a próxima etapa..."
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', resize: 'vertical' }}
                    />
                  </div>
                </div>

                {/* SEÇÃO 6: LINKS DE COMPROVAÇÃO */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      📹 Link da Gravação da Prática (Aula)
                    </label>
                    <input
                      type="url"
                      value={formData.link_gravacao_pratica}
                      onChange={e => handleChange('link_gravacao_pratica', e.target.value)}
                      placeholder="https://youtu.be/... ou Google Drive"
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      🗣️ Link da Gravação do Feedback
                    </label>
                    <input
                      type="url"
                      value={formData.link_gravacao_feedback}
                      onChange={e => handleChange('link_gravacao_feedback', e.target.value)}
                      placeholder="https://meet.google.com/... ou YouTube"
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      📄 Link do Planejamento (Google Docs)
                    </label>
                    <input
                      type="url"
                      value={formData.link_planejamento}
                      onChange={e => handleChange('link_planejamento', e.target.value)}
                      placeholder="https://docs.google.com/document/d/..."
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              </>
            ) : (
              /* CAMPO SE NÃO FOI REALIZADA */
              <div style={{ backgroundColor: '#fef2f2', padding: '1.25rem', borderRadius: '12px', border: '1px solid #fecaca' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#991b1b', marginBottom: '0.5rem' }}>
                  Justificativa para a Não Realização da Observação
                </label>
                <textarea
                  rows={4}
                  value={formData.justificativa_nao_realizada}
                  onChange={e => handleChange('justificativa_nao_realizada', e.target.value)}
                  placeholder="Informe detalhadamente o motivo (ex: Atestado médico, licença maternidade, remanejamento de escola, não comparecimento ao agendamento)..."
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #f87171', fontSize: '0.85rem', resize: 'vertical' }}
                />
              </div>
            )}

          </div>

          {/* Rodapé com Botões */}
          <div style={{
            padding: '1.25rem 1.75rem',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-secondary"
              style={{ padding: '0.65rem 1.4rem', fontWeight: 600 }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                background: 'linear-gradient(135deg, #00984a 0%, #0072bc 100%)',
                padding: '0.65rem 1.6rem',
                fontWeight: 700,
                fontSize: '0.92rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: 'none',
                color: '#ffffff',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? (
                <>⏳ Sincronizando com Supabase e Planilha...</>
              ) : (
                <>💾 Salvar e Sincronizar Observação</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
