import React, { useState } from 'react';
import { TEMATICAS_1ANO } from '../data/rubricasData';
import { CRITERIOS_POR_MODALIDADE } from '../data/tutorInsightsData';

export default function CentralDocumentos({ userRole }) {
  const [secaoAtiva, setSecaoAtiva] = useState('pdp');
  const [temaSelecionado, setTemaSelecionado] = useState(TEMATICAS_1ANO[0]?.id || 'T1');
  const [modalidadeTutoria, setModalidadeTutoria] = useState('Diálogo Formativo');

  const temaObj = TEMATICAS_1ANO.find(t => t.id === temaSelecionado) || TEMATICAS_1ANO[0];

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Cabeçalho da Central */}
      <div style={{
        background: 'linear-gradient(135deg, #002b7f 0%, #007a33 100%)',
        color: 'white',
        padding: '1.75rem',
        borderRadius: '12px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        marginBottom: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <span style={{
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            background: 'rgba(255,255,255,0.2)',
            padding: '0.2rem 0.6rem',
            borderRadius: '4px',
            fontWeight: 700
          }}>
            Repositório Oficial SEED-PR
          </span>
          <h2 style={{ margin: '0.5rem 0 0.25rem 0', fontSize: '1.6rem', fontWeight: 800 }}>
            📚 Central de Documentos Pedagógicos
          </h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>
            Acesso a PDP, Matrizes de Planejamento, Rubricas Oficiais de Avaliação Formativa e Modelos de Formulários.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          style={{
            backgroundColor: 'white',
            color: '#002b7f',
            border: 'none',
            padding: '0.6rem 1.2rem',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}
        >
          🖨️ Imprimir Documento
        </button>
      </div>

      {/* Navegação Secundária da Central */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setSecaoAtiva('pdp')}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.9rem',
            backgroundColor: secaoAtiva === 'pdp' ? '#002b7f' : 'white',
            color: secaoAtiva === 'pdp' ? 'white' : '#475569',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          📄 PDP (Plano de Desenvolvimento Profissional)
        </button>
        <button
          onClick={() => setSecaoAtiva('planejamento')}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.9rem',
            backgroundColor: secaoAtiva === 'planejamento' ? '#002b7f' : 'white',
            color: secaoAtiva === 'planejamento' ? 'white' : '#475569',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          📋 Matriz de Planejamento Docente
        </button>
        <button
          onClick={() => setSecaoAtiva('rubricas')}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.9rem',
            backgroundColor: secaoAtiva === 'rubricas' ? '#002b7f' : 'white',
            color: secaoAtiva === 'rubricas' ? 'white' : '#475569',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          ⚖️ Rubricas Oficiais (Docente & Tutoria)
        </button>
        <button
          onClick={() => setSecaoAtiva('formularios')}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.9rem',
            backgroundColor: secaoAtiva === 'formularios' ? '#002b7f' : 'white',
            color: secaoAtiva === 'formularios' ? 'white' : '#475569',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          📝 Formulários Modelos
        </button>
      </div>

      {/* Conteúdo Dinâmico */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.75rem', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
        
        {/* SEÇÃO 1: PDP */}
        {secaoAtiva === 'pdp' && (
          <div>
            <div style={{ borderBottom: '2px solid #002b7f', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: '#002b7f', fontSize: '1.3rem', fontWeight: 800 }}>
                Plano de Desenvolvimento Profissional (PDP) - Estágio Probatório
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0.35rem 0 0 0' }}>
                Instrumento orientador da formação continuada do professor cursista e acompanhamento formativo pela SEED-PR.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '8px', borderLeft: '4px solid #007a33' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontWeight: 700 }}>🎯 1. Finalidade do PDP</h4>
                <p style={{ margin: 0, color: '#475569', fontSize: '0.85rem', lineHeight: 1.6 }}>
                  O PDP tem caráter exclusivamente formativo. Destina-se a diagnosticar necessidades de aprimoramento pedagógico, estruturar metas semestrais e pactuar combinados de estudo entre o docente cursista, formador e tutor pedagógico.
                </p>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '8px', borderLeft: '4px solid #002b7f' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontWeight: 700 }}>🗓️ 2. Ciclo de Construção e Revisão</h4>
                <p style={{ margin: 0, color: '#475569', fontSize: '0.85rem', lineHeight: 1.6 }}>
                  Elaborado no início de cada ano formativo a partir da 1ª observação diagnóstica. Revisado a cada ciclo de devolutiva formativa para incorporar novos encaminhamentos pedagógicos e temas de intervenção docente.
                </p>
              </div>
            </div>

            {/* Estrutura do Modelo PDP */}
            <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', marginBottom: '1.5rem' }}>
              <div style={{ backgroundColor: '#f1f5f9', padding: '0.75rem 1rem', borderBottom: '1px solid #cbd5e1', fontWeight: 700, color: '#1e293b' }}>
                Modelo Estrutural do PDP Oficial (Preenchimento no Diálogo Formativo)
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, width: '25%', backgroundColor: '#fafafa' }}>Dimensão 1: Prática Docente</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>Alinhamento com o currículo estadual (RCO+Aulas), domínio conceitual e transposição didática.</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, backgroundColor: '#fafafa' }}>Dimensão 2: Gestão de Sala</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>Rotinas pedagógicas, clima escolar respeitoso, engajamento dos estudantes e gestão de tempo.</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, backgroundColor: '#fafafa' }}>Dimensão 3: Avaliação Formativa</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>Uso de evidências de aprendizagem, rubricas formativas, feedbacks e recuperação de conteúdos.</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, backgroundColor: '#fafafa' }}>Combinados & Encaminhamentos</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>Prazos para leituras, adaptações de planos de aula e agendamento da próxima observação de aula.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SEÇÃO 2: PLANEJAMENTO */}
        {secaoAtiva === 'planejamento' && (
          <div>
            <div style={{ borderBottom: '2px solid #002b7f', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: '#002b7f', fontSize: '1.3rem', fontWeight: 800 }}>
                Matriz de Planejamento Docente e Alinhamento Curricular
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0.35rem 0 0 0' }}>
                Diretrizes obrigatórias para a elaboração do plano de aula a ser observado durante o estágio probatório.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', backgroundColor: '#fdfdfe' }}>
                <div style={{ fontWeight: 700, color: '#002b7f', marginBottom: '0.5rem' }}>1. Identificação e Contextualização</div>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                  <li>Turma, Turno, NRE e Município</li>
                  <li>Componente Curricular e Vínculo (1º ou 2º padrão)</li>
                  <li>Diagnóstico breve da turma e layout adotado</li>
                </ul>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', backgroundColor: '#fdfdfe' }}>
                <div style={{ fontWeight: 700, color: '#007a33', marginBottom: '0.5rem' }}>2. Intencionalidade Pedagógica</div>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                  <li>Objetivos de aprendizagem claros e mensuráveis</li>
                  <li>Conteúdos articulados ao RCO+Aulas oficial</li>
                  <li>Critério e referência curricular do Tema observado</li>
                </ul>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', backgroundColor: '#fdfdfe' }}>
                <div style={{ fontWeight: 700, color: '#d97706', marginBottom: '0.5rem' }}>3. Desenvolvimento Metodológico</div>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                  <li>Acolhimento e ativação de conhecimentos prévios</li>
                  <li>Transposição didática e mediação com os alunos</li>
                  <li>Gestão do tempo previsto para cada etapa da aula</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* SEÇÃO 3: RUBRICAS OFICIAIS */}
        {secaoAtiva === 'rubricas' && (
          <div>
            <div style={{ borderBottom: '2px solid #002b7f', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: '#002b7f', fontSize: '1.3rem', fontWeight: 800 }}>
                Rubricas Oficiais de Avaliação Formativa
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0.35rem 0 0 0' }}>
                Consulte as rubricas oficiais docentes (Temas 1 a 7) e rubricas dos encontros de tutoria e devolutiva.
              </p>
            </div>

            {/* Abas internas: Docente vs Tutoria */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <span style={{ fontWeight: 700, color: '#1e293b', alignSelf: 'center', fontSize: '0.88rem' }}>Selecionar Nível:</span>
              <select
                value={temaSelecionado}
                onChange={e => setTemaSelecionado(e.target.value)}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              >
                <optgroup label="Rubricas Docentes (Cursistas - Temas 1 a 7)">
                  {TEMATICAS_1ANO.map(t => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </optgroup>
              </select>

              <select
                value={modalidadeTutoria}
                onChange={e => setModalidadeTutoria(e.target.value)}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              >
                <optgroup label="Rubricas de Tutoria (Formadores & Tutores)">
                  <option value="Diálogo Formativo">Diálogo Formativo (10 Critérios)</option>
                  <option value="Devolutiva">Devolutiva Formativa (6 Critérios)</option>
                  <option value="Encontro Formativo">Encontro Formativo (7 Critérios)</option>
                </optgroup>
              </select>
            </div>

            {/* Exibição da Rubrica Docente */}
            {temaObj && (
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #002b7f', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 800, color: '#002b7f', fontSize: '1.05rem' }}>{temaObj.nome}</div>
                  <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.25rem' }}><b>Referência:</b> {temaObj.referenciaTexto}</div>
                  <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.25rem' }}><b>Critério Avaliativo:</b> {temaObj.criterioTexto}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
                    <div style={{ fontWeight: 700, color: '#002b7f', marginBottom: '0.75rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem' }}>
                      📝 Rubrica: Planejamento
                    </div>
                    {Object.entries(temaObj.rubricas.planejamento).map(([mencao, texto]) => (
                      <div key={mencao} style={{ marginBottom: '0.5rem', fontSize: '0.82rem' }}>
                        <span style={{
                          fontWeight: 700,
                          padding: '0.15rem 0.4rem',
                          borderRadius: '4px',
                          display: 'inline-block',
                          marginBottom: '0.2rem',
                          backgroundColor: mencao === 'SUPEROU' ? 'rgba(0,43,127,0.1)' : mencao === 'ATINGE_INTEGRALMENTE' ? 'rgba(0,122,51,0.1)' : mencao === 'ATINGE_PARCIALMENTE' ? 'rgba(245,158,11,0.1)' : 'rgba(198,40,40,0.1)',
                          color: mencao === 'SUPEROU' ? '#002b7f' : mencao === 'ATINGE_INTEGRALMENTE' ? '#007a33' : mencao === 'ATINGE_PARCIALMENTE' ? '#d97706' : '#c62828'
                        }}>
                          {mencao.replace('_', ' ')}:
                        </span>
                        <div style={{ color: '#475569' }}>{texto}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
                    <div style={{ fontWeight: 700, color: '#007a33', marginBottom: '0.75rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem' }}>
                      🎯 Rubrica: Prática em Sala
                    </div>
                    {Object.entries(temaObj.rubricas.pratica).map(([mencao, texto]) => (
                      <div key={mencao} style={{ marginBottom: '0.5rem', fontSize: '0.82rem' }}>
                        <span style={{
                          fontWeight: 700,
                          padding: '0.15rem 0.4rem',
                          borderRadius: '4px',
                          display: 'inline-block',
                          marginBottom: '0.2rem',
                          backgroundColor: mencao === 'SUPEROU' ? 'rgba(0,43,127,0.1)' : mencao === 'ATINGE_INTEGRALMENTE' ? 'rgba(0,122,51,0.1)' : mencao === 'ATINGE_PARCIALMENTE' ? 'rgba(245,158,11,0.1)' : 'rgba(198,40,40,0.1)',
                          color: mencao === 'SUPEROU' ? '#002b7f' : mencao === 'ATINGE_INTEGRALMENTE' ? '#007a33' : mencao === 'ATINGE_PARCIALMENTE' ? '#d97706' : '#c62828'
                        }}>
                          {mencao.replace('_', ' ')}:
                        </span>
                        <div style={{ color: '#475569' }}>{texto}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Exibição dos Critérios de Tutoria */}
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1.25rem' }}>
              <div style={{ fontWeight: 800, color: '#166534', marginBottom: '0.5rem' }}>
                Critérios Oficiais de Tutoria: {modalidadeTutoria}
              </div>
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: '#15803d' }}>
                Utilizados nas observações de Formadores por Tutores e Tutores por Técnicos:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.5rem' }}>
                {(CRITERIOS_POR_MODALIDADE[modalidadeTutoria] || []).map((crit, idx) => (
                  <div key={crit} style={{ backgroundColor: 'white', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #dcfce7', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 800, color: '#16a34a' }}>{idx + 1}.</span>
                    <span style={{ color: '#1e293b' }}>{crit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SEÇÃO 4: FORMULÁRIOS MODELOS */}
        {secaoAtiva === 'formularios' && (
          <div>
            <div style={{ borderBottom: '2px solid #002b7f', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: '#002b7f', fontSize: '1.3rem', fontWeight: 800 }}>
                Modelos de Formulários Oficiais do Estágio Probatório
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0.35rem 0 0 0' }}>
                Modelos oficiais para visualização, impressão ou preenchimento manual em casos de contingência.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', backgroundColor: '#fafafa' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📝</div>
                <h4 style={{ margin: '0 0 0.25rem 0', color: '#1e293b', fontWeight: 700 }}>Ficha de Observação da Prática Docente</h4>
                <p style={{ margin: '0 0 1rem 0', color: '#64748b', fontSize: '0.82rem' }}>
                  Registro do Formador para acompanhamento de aula do professor cursista (Temas 1 a 7).
                </p>
                <button
                  onClick={() => window.print()}
                  style={{
                    backgroundColor: '#002b7f',
                    color: 'white',
                    border: 'none',
                    padding: '0.45rem 0.9rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Imprimir Ficha Padrão
                </button>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', backgroundColor: '#fafafa' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🤝</div>
                <h4 style={{ margin: '0 0 0.25rem 0', color: '#1e293b', fontWeight: 700 }}>Ficha de Diálogo e Devolutiva Formativa</h4>
                <p style={{ margin: '0 0 1rem 0', color: '#64748b', fontSize: '0.82rem' }}>
                  Roteiro de 10 a 20 minutos com acolhimento, análise de evidências e combinados com o docente.
                </p>
                <button
                  onClick={() => window.print()}
                  style={{
                    backgroundColor: '#007a33',
                    color: 'white',
                    border: 'none',
                    padding: '0.45rem 0.9rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Imprimir Ficha Padrão
                </button>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', backgroundColor: '#fafafa' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔄</div>
                <h4 style={{ margin: '0 0 0.25rem 0', color: '#1e293b', fontWeight: 700 }}>Formulário de Remanejamento & Modalidade</h4>
                <p style={{ margin: '0 0 1rem 0', color: '#64748b', fontSize: '0.82rem' }}>
                  Requerimento padrão para solicitação de troca de turma, turno ou modalidade formativa.
                </p>
                <button
                  onClick={() => window.print()}
                  style={{
                    backgroundColor: '#d97706',
                    color: 'white',
                    border: 'none',
                    padding: '0.45rem 0.9rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Imprimir Requerimento
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
