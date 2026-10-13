import React, { useState, useMemo } from 'react';
import { 
  TEMATICAS_1ANO, 
  TEMATICAS_2_3_ANO, 
  ETAPAS_PDP_PROPOSTA, 
  ESCALA_BOAS_PRATICAS 
} from '../data/rubricasData';

export default function FormularioInserirObservacao({ cursista, turmaInfo, onSave, onClose }) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);
  
  // Estado para o Modal com a Descrição Completa do Nível (ícone de informação)
  const [infoNivelModal, setInfoNivelModal] = useState(null); // { titulo, nivelNome, nivelBadge, nivelColor, descricao }

  // Determinar ano formativo inicial a partir do cursista ou da turma
  const detectAnoFormativo = () => {
    const raw = String(cursista?.ano_formativo || turmaInfo?.anoFormativo || '').toUpperCase();
    if (raw.includes('2') || raw.includes('3')) {
      return '2º ANO';
    }
    return '1º ANO';
  };

  const anoCarregado = detectAnoFormativo();
  const componenteCarregado = cursista?.componente || turmaInfo?.componente || 'Não informado';
  const semestreCarregado = cursista?.semestre || turmaInfo?.semestre || '2º Semestre';

  // Form State com valores travados e inteligentes pré-preenchidos
  const [formData, setFormData] = useState({
    nome_cursista: cursista?.nome || cursista?.nome_cursista || '',
    email_cursista: (cursista?.email || cursista?.email_cursista || '').trim().toLowerCase(),
    cgm: cursista?.cgm || '',
    turma: turmaInfo?.turma || cursista?.turma || '',
    componente: componenteCarregado,
    nome_formador: turmaInfo?.formador || '',
    email_formador: turmaInfo?.emailFormador || '',
    tutor_responsavel: turmaInfo?.tutor || '',
    email_tutor: turmaInfo?.emailTutor || '',
    ano_formativo: anoCarregado,
    semestre: semestreCarregado,
    modalidade: 'Docentes',
    modalidade_feedback: 'Diálogo formativo',
    motivo_devolutiva: '',
    
    // Datas separadas da prática pedagógica
    data_implementacao: new Date().toISOString().split('T')[0],
    data_observacao: new Date().toISOString().split('T')[0],
    data_feedback: new Date().toISOString().split('T')[0],
    
    // Status da Observação
    observacao_realizada: 'Sim, a observação foi realizada.',
    is_realizada: true,
    justificativa_nao_realizada: '',

    // 1º ANO FORMATIVO
    link_planejamento: '',
    tema_1ano: TEMATICAS_1ANO[0].id,
    nivel_planejamento: 'ATINGE INTEGRALMENTE',
    evidencias_planejamento: '',
    nivel_pratica: 'ATINGE INTEGRALMENTE',
    evidencias_pratica: '',
    escala_boas_praticas: 3,

    // 2º e 3º ANOS FORMATIVOS (PDP)
    link_pdp: '',
    tema_2ano: TEMATICAS_2_3_ANO[0].id,
    proposta_pedagogica: 'Proposta I',
    criterio1_nivel: 'ATINGE INTEGRALMENTE',
    criterio1_evidencias: '',
    criterio2_nivel: 'ATINGE INTEGRALMENTE',
    criterio2_evidencias: '',
    etapas_nao_realizadas: [],
    justificativa_etapas: '',

    // CAMPOS COMUNS TRANSVERSAIS
    link_gravacao_pratica: '',
    link_gravacao_feedback: '',
    questionamentos_propositivos: '',
    proposicoes_sugestoes: '',
    combinados: ''
  });

  const isSegundoOuTerceiro = () => {
    const a = String(formData.ano_formativo || '').toUpperCase();
    return a.includes('2') || a.includes('3');
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleToggleEtapaNaoRealizada = (etapaId) => {
    setFormData(prev => {
      const exists = prev.etapas_nao_realizadas.includes(etapaId);
      const updated = exists 
        ? prev.etapas_nao_realizadas.filter(id => id !== etapaId)
        : [...prev.etapas_nao_realizadas, etapaId];
      return { ...prev, etapas_nao_realizadas: updated };
    });
  };

  const handleToggleRealizada = (realizada) => {
    setFormData(prev => ({
      ...prev,
      is_realizada: realizada,
      observacao_realizada: realizada ? 'Sim, a observação foi realizada.' : 'Não realizada / Justificada'
    }));
  };

  // Objeto da Temática selecionada para o 1º Ano
  const selectedTema1AnoObj = useMemo(() => {
    return TEMATICAS_1ANO.find(t => t.id === formData.tema_1ano) || TEMATICAS_1ANO[0];
  }, [formData.tema_1ano]);

  // Objeto da Temática selecionada para o 2º/3º Ano
  const selectedTema2AnoObj = useMemo(() => {
    return TEMATICAS_2_3_ANO.find(t => t.id === formData.tema_2ano) || TEMATICAS_2_3_ANO[0];
  }, [formData.tema_2ano]);

  // Proposta selecionada (2º/3º Ano)
  const selectedPropostaConfig = useMemo(() => {
    const propKey = formData.proposta_pedagogica === 'Proposta II' ? 'Proposta II' : 'Proposta I';
    return selectedTema2AnoObj?.propostas?.[propKey] || {
      titulo: propKey,
      criterio1: 'Critério 1: Avaliação da Prática',
      criterio2: 'Critério 2: Avaliação da Prática'
    };
  }, [selectedTema2AnoObj, formData.proposta_pedagogica]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    if (!formData.email_cursista) {
      setErro('O e-mail institucional do cursista é obrigatório.');
      return;
    }

    if (!formData.is_realizada) {
      if (!formData.justificativa_nao_realizada.trim()) {
        setErro('Por favor, descreva a justificativa para a observação não realizada.');
        return;
      }
    } else {
      // 1. Validação de Devolutiva
      if (formData.modalidade_feedback === 'Devolutiva gravada' && !formData.motivo_devolutiva.trim()) {
        setErro('Qual foi o motivo da realização de feedback formativo na forma de devolutiva? Justifique descrevendo detalhadamente a situação que impediu a realização de diálogo formativo.');
        return;
      }

      // 2. Validações 1º Ano
      if (!isSegundoOuTerceiro()) {
        if (!formData.link_planejamento || !formData.link_planejamento.trim()) {
          setErro('Para cursistas do 1º Ano, o "Link do Documento de Planejamento de Aula" é obrigatório.');
          return;
        }
        if (!formData.data_implementacao) {
          setErro('Por favor, informe a Data da Implementação da prática.');
          return;
        }
        if (!formData.data_observacao) {
          setErro('Por favor, informe a Data da Observação da prática.');
          return;
        }
        if (!formData.nivel_planejamento || !formData.nivel_pratica) {
          setErro('Por favor, selecione os níveis de avaliação para o Planejamento e para a Prática.');
          return;
        }
      } else {
        // 3. Validações 2º e 3º Anos
        if (!formData.link_pdp || !formData.link_pdp.trim()) {
          setErro('Para cursistas dos 2º e 3º Anos, o "Link do PDP (Plano de Desenvolvimento Profissional)" é obrigatório.');
          return;
        }
        if (!formData.proposta_pedagogica) {
          setErro('Por favor, selecione a Proposta Pedagógica (Proposta I ou Proposta II).');
          return;
        }
        if (formData.etapas_nao_realizadas.length > 0 && !formData.justificativa_etapas.trim()) {
          setErro('Você selecionou etapas do PDP não realizadas. Por favor, preencha a justificativa dessas etapas.');
          return;
        }
      }
    }

    setLoading(true);

    try {
      const now = new Date();
      const carimboFormatado = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR');
      const is2ou3 = isSegundoOuTerceiro();

      // Mapeamento harmonizado
      const nivelPlanConsolidado = is2ou3 ? formData.criterio1_nivel : formData.nivel_planejamento;
      const nivelPratConsolidado = is2ou3 ? formData.criterio2_nivel : formData.nivel_pratica;
      const evidPlanConsolidado = is2ou3 ? formData.criterio1_evidencias : formData.evidencias_planejamento;
      const evidPratConsolidado = is2ou3 ? formData.criterio2_evidencias : formData.evidencias_pratica;
      const linkDocConsolidado = is2ou3 ? formData.link_pdp : formData.link_planejamento;
      
      const temaConsolidado = is2ou3 
        ? `${selectedTema2AnoObj.nome} (${formData.proposta_pedagogica})`
        : selectedTema1AnoObj.nome;

      const payload = {
        ...formData,
        id: `obs_${Date.now()}`,
        id_origem: `DASH_${formData.ano_formativo.replace(/\s+/g, '')}_${formData.semestre.replace(/\s+/g, '')}_${Date.now()}`,
        carimbo: carimboFormatado,
        created_at: now.toISOString(),
        
        // Datas separadas da prática e retrocompatibilidade
        data_pratica: formData.data_observacao || formData.data_implementacao,
        data_implementacao: formData.data_implementacao,
        data_observacao: formData.data_observacao,
        data_feedback: formData.data_feedback,
        
        // Universal Backwards-compatible
        tema: temaConsolidado,
        nivel_planejamento: nivelPlanConsolidado,
        nivel_pratica: nivelPratConsolidado,
        evidencias_planejamento: evidPlanConsolidado,
        evidencias_pratica: evidPratConsolidado,
        link_planejamento: is2ou3 ? null : linkDocConsolidado,
        link_pdp: is2ou3 ? linkDocConsolidado : null,
        
        // Critérios explícitos
        criterio1_nome: is2ou3 ? selectedPropostaConfig.criterio1 : 'Planejamento de Aula',
        criterio2_nome: is2ou3 ? selectedPropostaConfig.criterio2 : 'Prática Pedagógica em Sala',
        
        // Detalhes extras de etapas PDP
        etapas_nao_realizadas_str: formData.etapas_nao_realizadas.length > 0 
          ? formData.etapas_nao_realizadas.join(', ') 
          : 'Nenhuma (Todas as etapas realizadas)'
      };

      if (onSave) {
        await onSave(payload);
      }

      setSucesso(true);
      setTimeout(() => {
        if (onClose) onClose();
      }, 700);

    } catch (err) {
      console.error('Erro ao salvar observação:', err);
      setErro(err.message || 'Falha ao salvar observação.');
    } finally {
      setLoading(false);
    }
  };

  const niveisOpcoes = [
    { 
      id: 'SUPEROU', 
      label: 'Supera', 
      color: '#00984a', 
      bg: '#dcfce7', 
      badge: 'Nível 4',
      descPadrao: 'Prática exemplar que ultrapassa com autonomia e intencionalidade clara os critérios previstos.' 
    },
    { 
      id: 'ATINGE INTEGRALMENTE', 
      label: 'Atende Integralmente', 
      color: '#0072bc', 
      bg: '#e0f2fe', 
      badge: 'Nível 3',
      descPadrao: 'Atende com segurança pedagógica todos os critérios estabelecidos no planejamento e na prática.' 
    },
    { 
      id: 'ATINGE PARCIALMENTE', 
      label: 'Atende Parcialmente', 
      color: '#b45309', 
      bg: '#fef3c7', 
      badge: 'Nível 2',
      descPadrao: 'Atende em parte às expectativas, necessitando de intervenção e mediação formativa complementar.' 
    },
    { 
      id: 'NÃO ATINGE', 
      label: 'Não Atende', 
      color: '#b91c1c', 
      bg: '#fee2e2', 
      badge: 'Nível 1',
      descPadrao: 'Não apresentou os critérios mínimos esperados para a dimensão observada.' 
    }
  ];

  // Helper para renderizar card compacto com ícone de informação "i" no canto superior esquerdo
  const renderCardNivelComInfo = ({ op, isSelected, onSelect, tituloContexto, descricaoCompleta }) => {
    return (
      <div
        key={op.id}
        onClick={onSelect}
        style={{
          position: 'relative',
          padding: '0.65rem 0.75rem',
          borderRadius: '8px',
          border: isSelected ? `2px solid ${op.color}` : '1px solid #e2e8f0',
          backgroundColor: isSelected ? op.bg : '#ffffff',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: '48px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          {/* ÍCONE DE INFORMAÇÃO NO CANTO SUPERIOR ESQUERDO DO CARD */}
          <button
            type="button"
            title="Clique para ver a descrição detalhada deste nível"
            onClick={(e) => {
              e.stopPropagation();
              setInfoNivelModal({
                titulo: tituloContexto,
                nivelNome: op.label,
                nivelBadge: op.badge,
                nivelColor: op.color,
                descricao: descricaoCompleta || op.descPadrao
              });
            }}
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: isSelected ? op.color : '#e2e8f0',
              color: isSelected ? '#ffffff' : '#475569',
              border: 'none',
              fontSize: '0.72rem',
              fontWeight: 900,
              fontFamily: 'serif',
              fontStyle: 'italic',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              transition: 'transform 0.1s ease',
              padding: 0
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            i
          </button>

          <span style={{ fontWeight: 800, fontSize: '0.84rem', color: isSelected ? op.color : '#1e293b' }}>
            {op.label}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ 
            fontSize: '0.68rem', 
            fontWeight: 700, 
            backgroundColor: isSelected ? op.color : '#f1f5f9', 
            color: isSelected ? '#ffffff' : '#64748b', 
            padding: '0.12rem 0.4rem', 
            borderRadius: '4px' 
          }}>
            {op.badge}
          </span>
          {isSelected && <span style={{ color: op.color, fontWeight: 900, fontSize: '0.9rem' }}>●</span>}
        </div>
      </div>
    );
  };

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
          maxWidth: '1020px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          overflow: 'hidden'
        }}
      >
        {/* CABEÇALHO */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
              <span style={{ backgroundColor: '#00984a', color: '#ffffff', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
                SEED/PR • REGISTRO DE OBSERVAÇÃO
              </span>
              <span style={{ 
                backgroundColor: isSegundoOuTerceiro() ? '#f59e0b' : '#38bdf8', 
                color: isSegundoOuTerceiro() ? '#78350f' : '#0369a1', 
                padding: '0.2rem 0.6rem', 
                borderRadius: '4px', 
                fontSize: '0.75rem', 
                fontWeight: 800 
              }}>
                {isSegundoOuTerceiro() ? '2º / 3º ANOS (PDP)' : '1º ANO (PLANEJAMENTO DE AULA)'}
              </span>
              <span style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#ffffff', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                {formData.turma || 'Turma Não Informada'}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#ffffff' }}>
              Ferramenta de Observação da Prática Pedagógica
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
            title="Fechar formulário"
          >
            ✕
          </button>
        </div>

        {/* CORPO DO FORMULÁRIO COM SCROLL */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {erro && (
              <div style={{ padding: '0.85rem 1.25rem', backgroundColor: '#fee2e2', border: '1px solid #f87171', borderRadius: '8px', color: '#b91c1c', fontSize: '0.9rem', fontWeight: 600 }}>
                ⚠️ {erro}
              </div>
            )}

            {sucesso && (
              <div style={{ padding: '0.85rem 1.25rem', backgroundColor: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', color: '#166534', fontSize: '0.9rem', fontWeight: 700 }}>
                ✓ Observação registrada com sucesso! Atualizando tela...
              </div>
            )}

            {/* SEÇÃO 0: DADOS CARREGADOS AUTOMATICAMENTE (NÃO EDITÁVEIS) */}
            <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #cbd5e1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Ano Formativo (Carregado da Matrícula) 🔒
                </label>
                <div style={{ 
                  padding: '0.65rem 0.85rem', 
                  borderRadius: '6px', 
                  backgroundColor: '#e2e8f0', 
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  fontWeight: 800,
                  fontSize: '0.9rem'
                }}>
                  {formData.ano_formativo} • {isSegundoOuTerceiro() ? 'Plano de Desenvolvimento (PDP)' : 'Planejamento de Aula'}
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                  Vinculado automaticamente à turma matriculada.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Componente Curricular 🔒
                </label>
                <div style={{ 
                  padding: '0.65rem 0.85rem', 
                  borderRadius: '6px', 
                  backgroundColor: '#e2e8f0', 
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  fontWeight: 700,
                  fontSize: '0.9rem'
                }}>
                  {formData.componente}
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                  Definido na matrícula do cursista.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Semestre Formativo 🔒
                </label>
                <div style={{ 
                  padding: '0.65rem 0.85rem', 
                  borderRadius: '6px', 
                  backgroundColor: '#e2e8f0', 
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  fontWeight: 700,
                  fontSize: '0.9rem'
                }}>
                  {formData.semestre}
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                  Ciclo de aplicação vigente.
                </span>
              </div>
            </div>

            {/* SEÇÃO 1: STATUS DA OBSERVAÇÃO (REALIZADA VS NÃO REALIZADA) */}
            <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>
                Status da Prática Pedagógica *
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

            {/* SEÇÃO 2: DATAS (IMPLEMENTAÇÃO, OBSERVAÇÃO, FEEDBACK) E MODALIDADE DO FEEDBACK */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
              {/* CAMPO 1: DATA DA IMPLEMENTAÇÃO DA PRÁTICA */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.4rem' }}>
                  📅 Data da Implementação da Prática *
                </label>
                <input
                  type="date"
                  required
                  value={formData.data_implementacao}
                  onChange={e => handleChange('data_implementacao', e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.88rem', backgroundColor: '#ffffff' }}
                />
                <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                  Data em que a aula/prática foi ministrada pelo cursista em sala.
                </span>
              </div>

              {/* CAMPO 2: DATA DA OBSERVAÇÃO DA PRÁTICA */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.4rem' }}>
                  📅 Data da Observação da Prática *
                </label>
                <input
                  type="date"
                  required
                  value={formData.data_observacao}
                  onChange={e => handleChange('data_observacao', e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.88rem', backgroundColor: '#ffffff' }}
                />
                <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                  Data em que o formador assistiu à gravação ou aula ao vivo.
                </span>
              </div>

              {/* CAMPO 3: DATA DO FEEDBACK */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.4rem' }}>
                  📅 Data do Feedback (Diálogo / Devolutiva) *
                </label>
                <input
                  type="date"
                  required
                  value={formData.data_feedback}
                  onChange={e => handleChange('data_feedback', e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.88rem', backgroundColor: '#ffffff' }}
                />
                <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                  Data em que o diálogo formativo ou envio da devolutiva ocorreu.
                </span>
              </div>

              {/* CAMPO 4: MODALIDADE DO FEEDBACK */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.4rem' }}>
                  🗣️ Modalidade do Feedback Formativo *
                </label>
                <select
                  value={formData.modalidade_feedback}
                  onChange={e => handleChange('modalidade_feedback', e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.88rem', backgroundColor: '#ffffff' }}
                >
                  <option value="Diálogo formativo">Diálogo formativo (Online síncrono Meet)</option>
                  <option value="Devolutiva gravada">Devolutiva gravada (Assíncrona Vídeo/Áudio)</option>
                </select>
                <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                  Selecione o formato pelo qual a devolutiva pedagógica foi conduzida.
                </span>
              </div>
            </div>

            {/* SE FOR DEVOLUTIVA GRAVADA: JUSTIFICATIVA OBRIGATÓRIA */}
            {formData.modalidade_feedback === 'Devolutiva gravada' && (
              <div style={{ backgroundColor: '#fffbeb', padding: '1.25rem', borderRadius: '8px', border: '2px solid #f59e0b' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#92400e', marginBottom: '0.4rem' }}>
                  Qual foi o motivo da realização de feedback formativo na forma de devolutiva? Justifique descrevendo detalhadamente a situação que impediu a realização de diálogo formativo: *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Descreva detalhadamente o contexto que impediu o diálogo síncrono (ex: licença, incompatibilidade de horário no turno do cursista, escala de aulas)..."
                  value={formData.motivo_devolutiva}
                  onChange={e => handleChange('motivo_devolutiva', e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #f59e0b', fontSize: '0.85rem', resize: 'vertical' }}
                />
              </div>
            )}

            {/* ======================================================== */}
            {/* SEÇÃO DINÂMICA: SE A OBSERVAÇÃO FOI REALIZADA */}
            {/* ======================================================== */}
            {formData.is_realizada ? (
              <>
                {/* ---------------------------------------------------- */}
                {/* BLOCO 1º ANO: PLANEJAMENTO, TEMÁTICA EM ORDEM, REFERÊNCIA, RUBRICAS */}
                {/* ---------------------------------------------------- */}
                {!isSegundoOuTerceiro() && (
                  <div style={{ border: '2px solid #0284c7', borderRadius: '14px', padding: '1.5rem', backgroundColor: '#f0f9ff', display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: '1px solid #bae6fd', paddingBottom: '0.75rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>📘</span>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0369a1' }}>
                          Estrutura Pedagógica — 1º Ano Formativo (Planejamento de Aula)
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#0284c7' }}>
                          Avaliação baseada no Documento de Planejamento de Aula e nas rubricas de prática por temática.
                        </p>
                      </div>
                    </div>

                    {/* Documento de Planejamento (Obrigatório 1º Ano) */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#0369a1', marginBottom: '0.35rem' }}>
                        📄 Link do Documento de Planejamento de Aula (Google Docs) *
                      </label>
                      <input
                        type="url"
                        required
                        value={formData.link_planejamento}
                        onChange={e => handleChange('link_planejamento', e.target.value)}
                        placeholder="https://docs.google.com/document/d/..."
                        style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #38bdf8', fontSize: '0.88rem', backgroundColor: '#ffffff' }}
                      />
                      <span style={{ fontSize: '0.72rem', color: '#0284c7', marginTop: '0.2rem', display: 'block' }}>
                        Obrigatório no 1º Ano. Certifique-se de que o documento possui permissão de leitura para o formador/coordenação.
                      </span>
                    </div>

                    {/* Caixa de Temática em Ordem Numérica Rigorosa (Tema 1 a Tema 7) */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#002d5c', marginBottom: '0.35rem' }}>
                        Selecione o Tema Relacionado à Observação (Organizado em Ordem 1 a 7) *
                      </label>
                      <select
                        value={formData.tema_1ano}
                        onChange={e => handleChange('tema_1ano', e.target.value)}
                        style={{ 
                          width: '100%', 
                          padding: '0.65rem', 
                          borderRadius: '6px', 
                          border: '2px solid #0284c7', 
                          fontSize: '0.9rem', 
                          backgroundColor: '#ffffff',
                          fontWeight: 700,
                          color: '#002d5c'
                        }}
                      >
                        {TEMATICAS_1ANO.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* CAIXA COM O TEXTO DA REFERÊNCIA E CRITÉRIO OFICIAL */}
                    <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '10px', border: '1px solid #bae6fd', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1.1rem' }}>📌</span>
                        <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#002d5c' }}>
                          {selectedTema1AnoObj.titulo}
                        </h4>
                      </div>
                      
                      <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '8px', borderLeft: '4px solid #0072bc', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0072bc', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>
                          Texto da Referência Docente:
                        </span>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#1e293b', lineHeight: 1.45, fontStyle: 'italic' }}>
                          "{selectedTema1AnoObj.referenciaTexto}"
                        </p>
                      </div>

                      <div style={{ backgroundColor: '#f0fdf4', padding: '0.85rem', borderRadius: '8px', borderLeft: '4px solid #00984a' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>
                          Critério de Avaliação:
                        </span>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#166534', lineHeight: 1.45 }}>
                          {selectedTema1AnoObj.criterioTexto}
                        </p>
                      </div>
                    </div>

                    {/* Rubrica 1: Avaliação do PLANEJAMENTO com ícone "i" no canto superior esquerdo */}
                    <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                        <label style={{ fontSize: '0.9rem', fontWeight: 800, color: '#002d5c' }}>
                          1. Em relação ao PLANEJAMENTO, a implementação pode ser situada no nível: *
                        </label>
                        <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          Clique no ícone <strong>ⓘ</strong> para ler o descritor completo
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.65rem', marginBottom: '0.85rem' }}>
                        {niveisOpcoes.map(op => {
                          const isSelected = formData.nivel_planejamento === op.id;
                          const descKey = op.id.replace(/\s+/g, '_');
                          const rubricaDesc = selectedTema1AnoObj.rubricas.planejamento[descKey] || op.descPadrao;

                          return renderCardNivelComInfo({
                            op,
                            isSelected,
                            onSelect: () => handleChange('nivel_planejamento', op.id),
                            tituloContexto: `Planejamento — ${selectedTema1AnoObj.titulo}`,
                            descricaoCompleta: rubricaDesc
                          });
                        })}
                      </div>

                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                        Evidências do Planejamento (Indique de 2 a 4 situações observadas no documento) *
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={formData.evidencias_planejamento}
                        onChange={e => handleChange('evidencias_planejamento', e.target.value)}
                        placeholder="Ex: 1. Previsão de objetivos alinhados ao RCO+Aulas; 2. Seleção intencional da técnica; 3. Organização do tempo e recursos; 4. Atividades de intervenção descritas no passo a passo..."
                        style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', resize: 'vertical' }}
                      />
                    </div>

                    {/* Rubrica 2: Avaliação da PRÁTICA com ícone "i" no canto superior esquerdo */}
                    <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                        <label style={{ fontSize: '0.9rem', fontWeight: 800, color: '#002d5c' }}>
                          2. Em relação à PRÁTICA, a implementação pode ser situada no nível: *
                        </label>
                        <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          Clique no ícone <strong>ⓘ</strong> para ler o descritor completo
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.65rem', marginBottom: '0.85rem' }}>
                        {niveisOpcoes.map(op => {
                          const isSelected = formData.nivel_pratica === op.id;
                          const descKey = op.id.replace(/\s+/g, '_');
                          const rubricaDesc = selectedTema1AnoObj.rubricas.pratica[descKey] || op.descPadrao;

                          return renderCardNivelComInfo({
                            op,
                            isSelected,
                            onSelect: () => handleChange('nivel_pratica', op.id),
                            tituloContexto: `Prática em Sala — ${selectedTema1AnoObj.titulo}`,
                            descricaoCompleta: rubricaDesc
                          });
                        })}
                      </div>

                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                        Evidências da Prática (Indique de 2 a 4 situações observadas na gravação da aula) *
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={formData.evidencias_pratica}
                        onChange={e => handleChange('evidencias_pratica', e.target.value)}
                        placeholder="Ex: 1. Execução da dinâmica e orientação da turma; 2. Mediação de dúvidas e circulação pela sala; 3. Gestão do tempo útil de aprendizagem; 4. Participação ativa e engajamento dos estudantes..."
                        style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', resize: 'vertical' }}
                      />
                    </div>

                    {/* Questões de Boas Práticas - Escala Formativa */}
                    <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '10px', border: '1px solid #bae6fd' }}>
                      <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#002d5c', marginBottom: '0.4rem' }}>
                        ⭐ Questões das Boas Práticas Pedagógicas — Escala Formativa (1 a 4)
                      </label>
                      <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.78rem', color: '#64748b' }}>
                        Avalie a consolidação de boas práticas docentes fundamentadas na intencionalidade pedagógica:
                      </p>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.65rem' }}>
                        {ESCALA_BOAS_PRATICAS.map(esc => {
                          const isSel = formData.escala_boas_praticas === esc.valor;
                          return (
                            <div
                              key={esc.valor}
                              onClick={() => handleChange('escala_boas_praticas', esc.valor)}
                              style={{
                                padding: '0.75rem',
                                borderRadius: '8px',
                                border: isSel ? '2px solid #00984a' : '1px solid #e2e8f0',
                                backgroundColor: isSel ? '#f0fdf4' : '#ffffff',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                                <span style={{ fontWeight: 800, fontSize: '0.85rem', color: isSel ? '#166534' : '#1e293b' }}>
                                  Escala {esc.valor}
                                </span>
                                <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '4px', backgroundColor: isSel ? '#00984a' : '#e2e8f0', color: isSel ? '#ffffff' : '#475569' }}>
                                  {esc.tag}
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: '0.75rem', color: '#475569', lineHeight: 1.3 }}>
                                {esc.label}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* BLOCO 2º e 3º ANOS: PDP, TEMAS EM ORDEM, PROPOSTAS I/II, ETAPAS & CRITÉRIOS */}
                {/* ---------------------------------------------------- */}
                {isSegundoOuTerceiro() && (
                  <div style={{ border: '2px solid #f59e0b', borderRadius: '14px', padding: '1.5rem', backgroundColor: '#fffbeb', display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: '1px solid #fde68a', paddingBottom: '0.75rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>🎓</span>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#92400e' }}>
                          Estrutura Pedagógica — 2º e 3º Anos Formativos (PDP)
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#b45309' }}>
                          Avaliação baseada no Plano de Desenvolvimento Profissional (PDP), Propostas I e II e Critérios 1 e 2.
                        </p>
                      </div>
                    </div>

                    {/* Documento de Suporte: Link do PDP */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#92400e', marginBottom: '0.35rem' }}>
                        📑 Link do Documento PDP (Plano de Desenvolvimento Profissional) *
                      </label>
                      <input
                        type="url"
                        required
                        value={formData.link_pdp}
                        onChange={e => handleChange('link_pdp', e.target.value)}
                        placeholder="https://docs.google.com/document/d/..."
                        style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #f59e0b', fontSize: '0.88rem', backgroundColor: '#ffffff' }}
                      />
                      <span style={{ fontSize: '0.72rem', color: '#b45309', marginTop: '0.2rem', display: 'block' }}>
                        Obrigatório para cursistas dos 2º e 3º Anos. Certifique-se de que o documento possui permissão de leitura.
                      </span>
                    </div>

                    {/* Seleção do Tema Formativo em Ordem Numérica Rigorosa (Tema 1 a 7) */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#78350f', marginBottom: '0.35rem' }}>
                        Selecione o Tema Relacionado à Observação do PDP (Organizado em Ordem 1 a 7) *
                      </label>
                      <select
                        value={formData.tema_2ano}
                        onChange={e => handleChange('tema_2ano', e.target.value)}
                        style={{ 
                          width: '100%', 
                          padding: '0.65rem', 
                          borderRadius: '6px', 
                          border: '2px solid #f59e0b', 
                          fontSize: '0.9rem', 
                          backgroundColor: '#ffffff',
                          fontWeight: 700,
                          color: '#78350f'
                        }}
                      >
                        {TEMATICAS_2_3_ANO.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Seleção de Proposta Pedagógica (Proposta I vs Proposta II) */}
                    <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '10px', border: '1px solid #fde68a' }}>
                      <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#78350f', marginBottom: '0.6rem' }}>
                        🎯 Qual é a Proposta Escolhida pelo Cursista para a Implementação da Prática? *
                      </label>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {['Proposta I', 'Proposta II'].map(prop => {
                          const isSel = formData.proposta_pedagogica === prop;
                          const propInfo = selectedTema2AnoObj?.propostas?.[prop];
                          return (
                            <div
                              key={prop}
                              onClick={() => handleChange('proposta_pedagogica', prop)}
                              style={{
                                flex: 1,
                                minWidth: '240px',
                                padding: '1rem',
                                borderRadius: '8px',
                                border: isSel ? '2px solid #b45309' : '1px solid #e2e8f0',
                                backgroundColor: isSel ? '#fef3c7' : '#ffffff',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                <span style={{ fontWeight: 800, fontSize: '0.92rem', color: isSel ? '#92400e' : '#1e293b' }}>
                                  {prop}
                                </span>
                                {isSel && <span style={{ color: '#b45309', fontWeight: 900 }}>✓ Selecionada</span>}
                              </div>
                              <p style={{ margin: 0, fontSize: '0.78rem', color: '#475569', lineHeight: 1.35 }}>
                                {propInfo?.titulo || prop}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* CAIXA DE SELEÇÃO: ETAPAS NÃO REALIZADAS DO DESENVOLVIMENTO DA PROPOSTA */}
                    <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '10px', border: '1px solid #fde68a' }}>
                      <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#78350f', marginBottom: '0.35rem' }}>
                        📋 Etapas para o Desenvolvimento da Proposta
                      </label>
                      <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.8rem', color: '#64748b' }}>
                        Marque abaixo caso <strong>alguma das etapas do PDP não tenha sido realizada</strong> pelo cursista:
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                        {ETAPAS_PDP_PROPOSTA.map(et => {
                          const isChecked = formData.etapas_nao_realizadas.includes(et.id);
                          return (
                            <label
                              key={et.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.65rem',
                                padding: '0.6rem 0.85rem',
                                borderRadius: '6px',
                                border: isChecked ? '1px solid #ef4444' : '1px solid #e2e8f0',
                                backgroundColor: isChecked ? '#fef2f2' : '#f8fafc',
                                cursor: 'pointer',
                                fontSize: '0.84rem',
                                color: isChecked ? '#991b1b' : '#334155',
                                fontWeight: isChecked ? 700 : 500
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleEtapaNaoRealizada(et.id)}
                                style={{ accentColor: '#dc2626', width: '16px', height: '16px' }}
                              />
                              <span>{et.label}</span>
                              {isChecked && (
                                <span style={{ marginLeft: 'auto', fontSize: '0.72rem', backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                  Não Realizada
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>

                      {/* Justificativa caso haja etapas marcadas */}
                      {formData.etapas_nao_realizadas.length > 0 && (
                        <div style={{ backgroundColor: '#fef2f2', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#991b1b', marginBottom: '0.35rem' }}>
                            Justificativa das Etapas Não Realizadas: *
                          </label>
                          <textarea
                            rows={2}
                            required
                            placeholder="Descreva o motivo que levou ao não desenvolvimento das etapas selecionadas acima..."
                            value={formData.justificativa_etapas}
                            onChange={e => handleChange('justificativa_etapas', e.target.value)}
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #f87171', fontSize: '0.85rem', resize: 'vertical' }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Critério 1 da Proposta Selecionada com ícone "i" */}
                    <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0072bc', textTransform: 'uppercase' }}>
                            Avaliação da Prática:
                          </span>
                          <h4 style={{ margin: '0.15rem 0 0 0', fontSize: '0.92rem', fontWeight: 800, color: '#002d5c' }}>
                            {selectedPropostaConfig.criterio1} *
                          </h4>
                        </div>
                        <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          Clique no ícone <strong>ⓘ</strong> para ler os detalhes
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.65rem', marginBottom: '0.85rem' }}>
                        {niveisOpcoes.map(op => {
                          const isSelected = formData.criterio1_nivel === op.id;
                          return renderCardNivelComInfo({
                            op,
                            isSelected,
                            onSelect: () => handleChange('criterio1_nivel', op.id),
                            tituloContexto: `${selectedPropostaConfig.criterio1}`,
                            descricaoCompleta: `${op.label} — Aplicação referente ao Critério 1 da ${formData.proposta_pedagogica}: ${op.descPadrao}`
                          });
                        })}
                      </div>

                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                        Indique uma (1) a três (3) evidências para que a prática seja situada nesse nível do Critério 1:
                      </label>
                      <textarea
                        rows={2}
                        value={formData.criterio1_evidencias}
                        onChange={e => handleChange('criterio1_evidencias', e.target.value)}
                        placeholder="Descreva situações observadas correspondentes ao Critério 1..."
                        style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', resize: 'vertical' }}
                      />
                    </div>

                    {/* Critério 2 da Proposta Selecionada com ícone "i" */}
                    <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0072bc', textTransform: 'uppercase' }}>
                            Avaliação da Prática:
                          </span>
                          <h4 style={{ margin: '0.15rem 0 0 0', fontSize: '0.92rem', fontWeight: 800, color: '#002d5c' }}>
                            {selectedPropostaConfig.criterio2} *
                          </h4>
                        </div>
                        <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          Clique no ícone <strong>ⓘ</strong> para ler os detalhes
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.65rem', marginBottom: '0.85rem' }}>
                        {niveisOpcoes.map(op => {
                          const isSelected = formData.criterio2_nivel === op.id;
                          return renderCardNivelComInfo({
                            op,
                            isSelected,
                            onSelect: () => handleChange('criterio2_nivel', op.id),
                            tituloContexto: `${selectedPropostaConfig.criterio2}`,
                            descricaoCompleta: `${op.label} — Aplicação referente ao Critério 2 da ${formData.proposta_pedagogica}: ${op.descPadrao}`
                          });
                        })}
                      </div>

                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                        Indique uma (1) a três (3) evidências para que a prática seja situada nesse nível do Critério 2:
                      </label>
                      <textarea
                        rows={2}
                        value={formData.criterio2_evidencias}
                        onChange={e => handleChange('criterio2_evidencias', e.target.value)}
                        placeholder="Descreva situações observadas correspondentes ao Critério 2..."
                        style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', resize: 'vertical' }}
                      />
                    </div>

                  </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* CAMPOS COMUNS TRANSVERSAIS A TODOS OS ANOS */}
                {/* ---------------------------------------------------- */}
                {/* LINKS DE MÍDIA */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      📹 Link da Gravação da Prática Pedagógica (Aula)
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
                      🗣️ Link da Gravação do Feedback (Diálogo / Devolutiva)
                    </label>
                    <input
                      type="url"
                      value={formData.link_gravacao_feedback}
                      onChange={e => handleChange('link_gravacao_feedback', e.target.value)}
                      placeholder="https://meet.google.com/... ou YouTube"
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                {/* REGISTROS QUALITATIVOS FORMATIVOS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                      💡 Questionamentos Propositivos do Formador
                    </label>
                    <textarea
                      rows={3}
                      value={formData.questionamentos_propositivos}
                      onChange={e => handleChange('questionamentos_propositivos', e.target.value)}
                      placeholder="Perguntas reflexivas realizadas no feedback para promover a tomada de consciência docente..."
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
                      placeholder="Orientações e encaminhamentos pedagógicos para melhoria da atuação profissional..."
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', resize: 'vertical' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                      🤝 Combinados e Encaminhamentos
                    </label>
                    <textarea
                      rows={3}
                      value={formData.combinados}
                      onChange={e => handleChange('combinados', e.target.value)}
                      placeholder="Ações e metas acordadas mutuamente entre formador e cursista..."
                      style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', resize: 'vertical' }}
                    />
                  </div>
                </div>
              </>
            ) : (
              /* CASO A OBSERVAÇÃO NÃO FOI REALIZADA */
              <div style={{ backgroundColor: '#fef2f2', padding: '1.25rem', borderRadius: '12px', border: '1px solid #fecaca' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#991b1b', marginBottom: '0.5rem' }}>
                  Justificativa para a Não Realização da Observação *
                </label>
                <textarea
                  rows={4}
                  required
                  value={formData.justificativa_nao_realizada}
                  onChange={e => handleChange('justificativa_nao_realizada', e.target.value)}
                  placeholder="Informe detalhadamente o motivo (ex: Atestado médico, licença maternidade, remanejamento de escola, não comparecimento ao agendamento)..."
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #f87171', fontSize: '0.85rem', resize: 'vertical' }}
                />
              </div>
            )}

          </div>

          {/* RODAPÉ COM AÇÕES */}
          <div style={{
            padding: '1.25rem 1.75rem',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem'
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
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
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

      {/* MODAL INFORMATIVO SOBREPOSTO: EXIBE A DESCRIÇÃO COMPLETA DO NÍVEL AO CLICAR NO 'i' */}
      {infoNivelModal && (
        <div 
          onClick={() => setInfoNivelModal(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 12000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="animate-fade-in"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
              overflow: 'hidden',
              borderTop: `6px solid ${infoNivelModal.nivelColor || '#0072bc'}`
            }}
          >
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  {infoNivelModal.titulo}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: infoNivelModal.nivelColor }}>
                    Nível: {infoNivelModal.nivelNome}
                  </h3>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, backgroundColor: infoNivelModal.nivelColor, color: '#ffffff', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                    {infoNivelModal.nivelBadge}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInfoNivelModal(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.3rem',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '0.2rem'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                📖 Descrição Completa do Critério / Rubrica:
              </span>
              <div style={{
                backgroundColor: '#ffffff',
                padding: '1rem 1.25rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                lineHeight: 1.55,
                fontSize: '0.9rem',
                color: '#1e293b'
              }}>
                {infoNivelModal.descricao}
              </div>
            </div>

            <div style={{ padding: '1rem 1.5rem', backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setInfoNivelModal(null)}
                style={{
                  backgroundColor: infoNivelModal.nivelColor || '#0072bc',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.55rem 1.4rem',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Entendido, Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
