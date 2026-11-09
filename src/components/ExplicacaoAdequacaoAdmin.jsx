import React, { useState } from 'react';
import { DEFAULT_ADMINS, SUPERADMINS_TUTOR_INSIGHTS } from '../config_roles';

/**
 *Verifica se o usuário atual possui perfil de Admin ou Superadmin
 */
export function isUserAdminOrSuperAdmin(userRole, userEmail) {
  const role = String(userRole || '').trim().toLowerCase();
  if (role === 'admin' || role === 'superadmin' || role === 'tecnico') {
    return true;
  }
  const cleanEmail = String(userEmail || '').trim().toLowerCase();
  if (!cleanEmail) return false;
  const admins = [...(DEFAULT_ADMINS || []), ...(SUPERADMINS_TUTOR_INSIGHTS || [])].map(e => e.trim().toLowerCase());
  return admins.includes(cleanEmail);
}

/**
 * Painel Didático Exclusivo para Admin e Superadmin:
 * Explica de maneira simples (sem jargão estatístico e com exemplos práticos)
 * como os dados históricos de 2024 (1º Ano) e 2025 (2º Ano PDP) foram construídos
 * e traduzidos para a Rubrica Analítica de 2026.
 */
export default function ExplicacaoAdequacaoAdmin({ userRole, userEmail, defaultExpanded = false, compact = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!isUserAdminOrSuperAdmin(userRole, userEmail)) {
    return null;
  }

  return (
    <div
      className="glass-panel animate-fade-in"
      style={{
        padding: compact ? '1rem 1.25rem' : '1.25rem 1.5rem',
        marginBottom: compact ? '0.5rem' : '1.5rem',
        borderRadius: '12px',
        border: '1px solid #c7d2fe',
        borderLeft: '5px solid #4f46e5',
        background: 'linear-gradient(135deg, #eef2ff 0%, #ffffff 100%)',
        boxShadow: '0 4px 14px rgba(79, 70, 229, 0.08)'
      }}
    >
      {/* CABEÇALHO CLICÁVEL */}
      <div
        onClick={() => setExpanded(prev => !prev)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span
            style={{
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              fontSize: '0.7rem',
              fontWeight: 800,
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            🔒 Exclusivo Admin & Superadmin
          </span>

          <div>
            <h3 style={{ margin: 0, fontSize: compact ? '0.98rem' : '1.08rem', fontWeight: 800, color: '#1e1b4b' }}>
              💡 Como construímos a Evolução dos Cursistas (2024 ➔ 2025 ➔ 2026)? Explicação Simples com Exemplos
            </h3>
            <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: '#4338ca', fontWeight: 500 }}>
              Entenda, sem termos complicados de estatística, como traduzimos as avaliações antigas para a mesma régua de 2026.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(prev => !prev);
          }}
          style={{
            backgroundColor: expanded ? '#4f46e5' : '#ffffff',
            color: expanded ? '#ffffff' : '#4f46e5',
            border: '1px solid #4f46e5',
            borderRadius: '8px',
            padding: '0.4rem 0.85rem',
            fontSize: '0.78rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.15s ease'
          }}
        >
          {expanded ? '▲ Ocultar Explicação' : '📖 Ver Explicação com Exemplos'}
        </button>
      </div>

      {/* CONTEÚDO EXPANDIDO DIDÁTICO */}
      {expanded && (
        <div
          style={{
            marginTop: '1.15rem',
            paddingTop: '1.15rem',
            borderTop: '1px solid #e0e7ff',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.1rem',
            color: '#1e293b',
            fontSize: '0.86rem',
            lineHeight: 1.55
          }}
        >
          {/* 1. ANALOGIA DAS TRÊS RÉGUAS */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderLeft: '4px solid #0284c7',
              borderRadius: '8px',
              padding: '0.9rem 1.1rem'
            }}
          >
            <div style={{ fontWeight: 800, color: '#0369a1', fontSize: '0.92rem', marginBottom: '0.35rem' }}>
              📏 1. O Problema das "Três Réguas Diferentes" (Por que precisávamos adaptar?)
            </div>
            <p style={{ margin: 0, color: '#334155' }}>
              Imagine medir a evolução de uma pessoa usando <b>três réguas diferentes</b> em cada ano: em <b>2024</b> os professores estavam no 1º Ano (iniciantes) e a avaliação era mais simples; em <b>2025</b> o formulário mudou para uma lista de caixinhas de marcar (<i>checklist</i> do PDP); e em <b>2026</b> passamos a usar a <b>Rubrica Analítica atual</b> (mais completa e exigente).
              <br />
              Se juntássemos essas notas diretamente sem nenhuma tradução, o sistema compararia coisas diferentes e diria que excelentes professores "caíram de nível", quando na verdade <b>quem ficou mais exigente foi a régua de avaliação!</b> Por isso, colocamos os três anos na <b>mesma régua de 2026</b>.
            </p>
          </div>

          {/* GRID COM OS 2 EXEMPLOS PRÁTICOS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
            
            {/* EXEMPLO 1: 2024 (1º ANO) */}
            <div
              style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '10px',
                padding: '1rem 1.15rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontSize: '1.2rem' }}>👩‍🏫</span>
                <span style={{ fontWeight: 800, color: '#92400e', fontSize: '0.92rem' }}>
                  Exemplo Prático 1: O que acontecia com 2024 (1º Ano)
                </span>
              </div>

              <p style={{ margin: 0, fontSize: '0.83rem', color: '#78350f' }}>
                <b>Como era em 2024:</b> Todos eram ingressantes de 1º Ano. Bastava o professor seguir o roteiro básico da aula (acolher a turma, explicar o conteúdo e usar o RCO+Aulas) para ganhar <b>"Nível 4"</b>. Por isso, quase <b>6 em cada 10 aulas (58%)</b> receberam nota 4.
              </p>

              <p style={{ margin: 0, fontSize: '0.83rem', color: '#78350f' }}>
                <b>Como é na régua de 2026:</b> Cumprir 100% do esperado na aula chama-se <b>"Atende Integralmente (Nível 3)"</b>. Já o <b>"Supera (Nível 4)"</b> é reservado para quando o professor vai além e coloca os alunos como <b>protagonistas</b> (criando materiais, pesquisando, fazendo monitoria entre colegas ou sendo destaque de <i>Boa Prática</i>).
              </p>

              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px dashed #f59e0b',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  fontSize: '0.81rem',
                  color: '#451a03'
                }}
              >
                <b>📌 Exemplo da Profª Maria:</b>
                <br />
                Em 2024, a Profª Maria deu uma boa aula seguindo o roteiro padrão e recebeu <b>Nível 4</b>. Em 2026, continuou dando uma aula excelente, cumprindo tudo o que a rede pede, e recebeu <b>Atende Integralmente (Nível 3)</b>.
                <ul style={{ margin: '0.4rem 0 0 0', paddingLeft: '1.15rem' }}>
                  <li>
                    <b style={{ color: '#b91c1c' }}>Sem a tradução:</b> O computador fazia a conta <code>4 ➔ 3</code> e dizia que a Profª Maria <b>"Regrediu (-1)"</b>! Isso gerava um falso alerta vermelho para <b>168 professores (20,8%)</b>.
                  </li>
                  <li style={{ marginTop: '0.25rem' }}>
                    <b style={{ color: '#15803d' }}>Com a nossa tradução:</b> O sistema lê o texto que o formador escreveu em 2024. Se foi o cumprimento do roteiro padrão da aula, traduzimos a base de 2024 para <b>Nível 3 (Atende Integralmente)</b>. Se o texto de 2024 já relatava protagonismo/autoria dos alunos, ela mantém o <b>Nível 4 (Supera)</b>. Assim, a Profª Maria aparece corretamente como <b>Estável em alto nível (3 ➔ 3)</b> ou <b>Evoluindo (3 ➔ 4)</b>!
                  </li>
                </ul>
              </div>
            </div>

            {/* EXEMPLO 2: 2025 (2º ANO PDP) */}
            <div
              style={{
                backgroundColor: '#f5f3ff',
                border: '1px solid #ddd6fe',
                borderRadius: '10px',
                padding: '1rem 1.15rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontSize: '1.2rem' }}>👨‍🏫</span>
                <span style={{ fontWeight: 800, color: '#5b21b6', fontSize: '0.92rem' }}>
                  Exemplo Prático 2: O que acontecia com 2025 (2º Ano PDP)
                </span>
              </div>

              <p style={{ margin: 0, fontSize: '0.83rem', color: '#4c1d95' }}>
                <b>Como era em 2025:</b> Na temática de Ferramentas Educacionais (2º Ano), o formador não dava nota de 1 a 4; ele marcava uma <b>lista de 7 caixinhas (checklist)</b> sobre o que viu na aula e escrevia os <i>Pontos Fortes</i> e <i>Pontos de Melhoria</i>.
              </p>

              <p style={{ margin: 0, fontSize: '0.83rem', color: '#4c1d95' }}>
                <b>O problema da conta antiga:</b> Uma fórmula antiga exigia que todas as caixinhas fossem marcadas na ordem exata e que não houvesse nenhuma sugestão de melhoria para dar nota máxima. Resultado: quase ninguém (menos de 0,5% da rede) conseguia chegar ao Nível 4 em 2025!
              </p>

              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px dashed #8b5cf6',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  fontSize: '0.81rem',
                  color: '#2e1065'
                }}
              >
                <b>📌 Exemplo do Prof. João:</b>
                <br />
                Em 2025, o Prof. João usou a plataforma digital na aula, colocou os alunos para criarem atividades em duplas (monitoria) e o formador elogiou nos <i>Pontos Fortes</i>: <i>"Excelente engajamento e protagonismo dos alunos"</i>. Mas, como foram marcadas 6 das 7 caixinhas, a conta antiga o rebaixava.
                <ul style={{ margin: '0.4rem 0 0 0', paddingLeft: '1.15rem' }}>
                  <li>
                    <b style={{ color: '#15803d' }}>Com a nossa tradução para 2026:</b> Agrupamos as 7 caixinhas nas <b>2 perguntas essenciais da Rubrica de 2026</b>: <i>(1) A ferramenta digital estava conectada ao objetivo da aula?</i> e <i>(2) Os alunos usaram a ferramenta de forma ativa?</i> Como o Prof. João cumpriu os dois requisitos e recebeu elogio de protagonismo nos <i>Pontos Fortes</i>, ele passa a ter seu <b>Nível 4 (Supera)</b> reconhecido de forma justa!
                  </li>
                </ul>
              </div>
            </div>

          </div>

          {/* 3. RESUMO DO IMPACTO E TRANSPARÊNCIA */}
          <div
            style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '10px',
              padding: '0.9rem 1.15rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <div style={{ flex: '1 1 420px' }}>
              <div style={{ fontWeight: 800, color: '#166534', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                ✅ Resultado na Prática e Garantia de Transparência Total
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#14532d' }}>
                Com essa calibração, corrigimos a distorção histórica sem apagar nenhum dado: <b>dentro do Dossiê de cada cursista, a nota original de 2024 e o checklist de 2025 continuam aparecendo</b> ao lado da nota traduzida para 2026, permitindo que qualquer gestor confira os dois lados.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ backgroundColor: '#ffffff', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #86efac', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Falsas Regressões (4 ➔ 3)</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#15803d' }}>
                  Caiu de 20,8% para <b>2,1%</b>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>(Apenas casos reais de atenção)</div>
              </div>

              <div style={{ backgroundColor: '#ffffff', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #86efac', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Evolução Positiva / Supera</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0369a1' }}>
                  Subiu de 40,3% para <b>57,8%</b>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>(Coorte longitudinal 2024–2026)</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
