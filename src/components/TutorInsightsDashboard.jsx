import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';
import { 
  MOCK_TUTOR_OBSERVATIONS, 
  getTutorObservacoesLocais, 
  salvarNovaObservacaoTutoria,
  CRITERIOS_POR_MODALIDADE 
} from '../data/tutorInsightsData';

const BRAND = {
  green: "#007a33",
  greenDark: "#004d20",
  blue: "#002b7f",
  blueDark: "#001f5c",
  amber: "#f59e0b",
  red: "#c62828",
};

const STATUS_COLORS = {
  superou: "#002b7f",
  atendeu: BRAND.green,
  parcial: BRAND.amber,
  nao: BRAND.red,
};

export default function TutorInsightsDashboard({
  userRole,
  userEmail,
  tutores = []
}) {
  const [observacoes, setObservacoes] = useState(() => getTutorObservacoesLocais());
  const [selectedObs, setSelectedObs] = useState(null);
  const [modalNovaObs, setModalNovaObs] = useState(false);

  // Filtros
  const [filtroAcao, setFiltroAcao] = useState('todas');
  const [filtroModalidade, setFiltroModalidade] = useState('todas');
  const [filtroNre, setFiltroNre] = useState('todos');
  const [filtroPessoa, setFiltroPessoa] = useState('todas');
  const [busca, setBusca] = useState('');

  // Formulário de Nova Observação de Tutoria
  const [formNova, setFormNova] = useState({
    acaoAcompanhamento: 'Observação do Formador pelo Tutor',
    acaoObservada: 'Diálogo Formativo',
    dataObservacao: new Date().toISOString().split('T')[0],
    tutorEmail: userRole === 'tutor' ? userEmail : '',
    tutor: '',
    formadorEmail: '',
    formador: '',
    nre: '',
    tema: 'Planejamento e Prática',
    linkAcaoObservada: '',
    linkFeedback: '',
    checklistRealizadas: '',
    checklistNaoRealizadas: '',
    destaques: '',
    desenvolver: '',
    encaminhamentos: '',
    notas: {}
  });

  // Lista única de NREs presentes nos dados
  const nreList = useMemo(() => {
    const set = new Set();
    observacoes.forEach(o => { if (o.nre) set.add(o.nre); });
    return Array.from(set).sort();
  }, [observacoes]);

  // Observações filtradas
  const filteredObs = useMemo(() => {
    return observacoes.filter(obs => {
      // Regra de Permissão Hierárquica:
      if (userRole === 'tutor') {
        const cleanEmail = (userEmail || '').trim().toLowerCase();
        const tutorEmail = (obs.tutorEmail || '').trim().toLowerCase();
        // Tutor vê observações onde ele é o tutor ou formador observado
        if (tutorEmail !== cleanEmail && (obs.formadorEmail || '').trim().toLowerCase() !== cleanEmail) {
          // Permite se o tutor logado tiver mesmo NRE
          const meuTutor = tutores.find(t => (t.email_educ || '').trim().toLowerCase() === cleanEmail);
          if (!meuTutor || !meuTutor.nre_tutor || meuTutor.nre_tutor !== obs.nre) {
            return false;
          }
        }
      } else if (userRole === 'formador') {
        const cleanEmail = (userEmail || '').trim().toLowerCase();
        if ((obs.formadorEmail || '').trim().toLowerCase() !== cleanEmail) {
          return false;
        }
      }

      if (filtroAcao !== 'todas' && obs.acaoAcompanhamento !== filtroAcao) return false;
      if (filtroModalidade !== 'todas' && (obs.modalidade || obs.acaoObservada) !== filtroModalidade) return false;
      if (filtroNre !== 'todos' && obs.nre !== filtroNre) return false;

      if (busca) {
        const q = busca.toLowerCase();
        const m1 = (obs.tutor || '').toLowerCase().includes(q);
        const m2 = (obs.formador || '').toLowerCase().includes(q);
        const m3 = (obs.destaques || '').toLowerCase().includes(q);
        const m4 = (obs.desenvolver || '').toLowerCase().includes(q);
        if (!m1 && !m2 && !m3 && !m4) return false;
      }

      return true;
    });
  }, [observacoes, userRole, userEmail, tutores, filtroAcao, filtroModalidade, filtroNre, busca]);

  // Cálculos de KPIs
  const kpis = useMemo(() => {
    const total = filteredObs.length;
    if (total === 0) return { total: 0, avg: 0, superouPct: 0, atendeuPct: 0, sobAtencao: 0 };

    let sum = 0;
    let countScores = 0;
    let superouCount = 0;
    let atendeuCount = 0;
    let sobAtencaoCount = 0;

    filteredObs.forEach(obs => {
      if (typeof obs.avgScore === 'number') {
        sum += obs.avgScore;
        countScores++;
        if (obs.avgScore >= 2.5) superouCount++;
        else if (obs.avgScore >= 1.8) atendeuCount++;
        else sobAtencaoCount++;
      }
    });

    const avg = countScores > 0 ? (sum / countScores).toFixed(2) : 0;
    const superouPct = total > 0 ? Math.round((superouCount / total) * 100) : 0;
    const atendeuPct = total > 0 ? Math.round((atendeuCount / total) * 100) : 0;

    return { total, avg, superouPct, atendeuPct, sobAtencao: sobAtencaoCount };
  }, [filteredObs]);

  // Dados para o Radar Chart de Competências
  const radarData = useMemo(() => {
    const compMap = new Map();

    filteredObs.forEach(obs => {
      if (Array.isArray(obs.rubrics)) {
        obs.rubrics.forEach(r => {
          if (r.criterio && typeof r.score === 'number') {
            const key = r.criterio.length > 20 ? r.criterio.slice(0, 18) + '...' : r.criterio;
            if (!compMap.has(key)) compMap.set(key, { total: 0, count: 0 });
            const item = compMap.get(key);
            item.total += r.score;
            item.count += 1;
          }
        });
      }
    });

    return Array.from(compMap.entries()).map(([criterio, val]) => ({
      criterio,
      media: Number((val.total / val.count).toFixed(2)),
      fullMark: 3
    })).slice(0, 8); // Top 8 critérios
  }, [filteredObs]);

  // Dados para o Gráfico de Barras por Modalidade
  const modalidadeBarData = useMemo(() => {
    const map = {
      'Diálogo Formativo': { count: 0, sum: 0 },
      'Devolutiva': { count: 0, sum: 0 },
      'Encontro Formativo': { count: 0, sum: 0 }
    };

    filteredObs.forEach(obs => {
      const mod = obs.modalidade || obs.acaoObservada || 'Diálogo Formativo';
      if (map[mod]) {
        map[mod].count += 1;
        if (typeof obs.avgScore === 'number') map[mod].sum += obs.avgScore;
      }
    });

    return Object.entries(map).map(([modalidade, val]) => ({
      modalidade,
      total: val.count,
      media: val.count > 0 ? Number((val.sum / val.count).toFixed(2)) : 0
    }));
  }, [filteredObs]);

  // Dados para o Gráfico de Pizza (Distribuição de Menções)
  const pieData = useMemo(() => {
    let superou = 0;
    let atendeu = 0;
    let parcial = 0;
    let nao = 0;

    filteredObs.forEach(obs => {
      if (Array.isArray(obs.rubrics)) {
        obs.rubrics.forEach(r => {
          const v = String(r.value || '').toUpperCase();
          if (v.includes('SUPEROU')) superou++;
          else if (v.includes('PARCIAL')) parcial++;
          else if (v.includes('NAO ATENDEU')) nao++;
          else if (v.includes('INTEGRALMENTE') || v.includes('ATENDEU')) atendeu++;
        });
      }
    });

    return [
      { name: 'Superou (3.0)', value: superou, color: STATUS_COLORS.superou },
      { name: 'Atendeu (2.0)', value: atendeu, color: STATUS_COLORS.atendeu },
      { name: 'Parcial (1.0)', value: parcial, color: STATUS_COLORS.parcial },
      { name: 'Não Atendeu (0.0)', value: nao, color: STATUS_COLORS.nao }
    ].filter(d => d.value > 0);
  }, [filteredObs]);

  // Envio de nova observação
  const handleSalvarNova = (e) => {
    e.preventDefault();
    if (!formNova.tutor || !formNova.formador) {
      alert('Preencha os nomes do tutor e do formador/técnico.');
      return;
    }

    const criterios = CRITERIOS_POR_MODALIDADE[formNova.acaoObservada] || [];
    const rubrics = criterios.map(crit => {
      const notaStr = formNova.notas[crit] || 'Atendeu integralmente';
      let score = 2;
      if (notaStr.includes('Superou')) score = 3;
      else if (notaStr.includes('parcialmente')) score = 1;
      else if (notaStr.includes('Não atendeu')) score = 0;
      return { criterio: crit, value: notaStr, score };
    });

    const sum = rubrics.reduce((acc, r) => acc + (r.score || 0), 0);
    const avgScore = rubrics.length > 0 ? Number((sum / rubrics.length).toFixed(2)) : 2.0;

    const nova = {
      ...formNova,
      modalidade: formNova.acaoObservada,
      rubrics,
      avgScore
    };

    const salva = salvarNovaObservacaoTutoria(nova);
    setObservacoes(prev => [salva, ...prev]);
    setModalNovaObs(false);
    alert('Nova Observação de Tutoria registrada com sucesso!');
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Header do Módulo Tutor Insights */}
      <div style={{
        background: 'linear-gradient(135deg, #002b7f 0%, #004d20 100%)',
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
            Módulo Integrado • Tutor Insights SEED-PR
          </span>
          <h2 style={{ margin: '0.5rem 0 0.25rem 0', fontSize: '1.6rem', fontWeight: 800 }}>
            🤝 Acompanhamento de Tutoria & Formadores
          </h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>
            Monitoramento das observações formativas de <b>Técnicos sobre Tutores</b> e <b>Tutores sobre Formadores</b>.
          </p>
        </div>

        {(userRole === 'admin' || userRole === 'tecnico' || userRole === 'tutor') && (
          <button
            onClick={() => setModalNovaObs(true)}
            style={{
              backgroundColor: '#007a33',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.4rem',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
          >
            ➕ Inserir Observação de Tutoria
          </button>
        )}
      </div>

      {/* Cards de KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>TOTAL DE OBSERVAÇÕES</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#002b7f', marginTop: '0.25rem' }}>{kpis.total}</div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>Ações de Tutoria registradas</div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>MÉDIA GERAL (0 A 3.0)</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#007a33', marginTop: '0.25rem' }}>{kpis.avg}</div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.2rem' }}>Padrão institucional atendido</div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>% SUPEROU EXPECTATIVAS</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0284c7', marginTop: '0.25rem' }}>{kpis.superouPct}%</div>
          <div style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: '0.2rem' }}>Nota máxima nas rubricas</div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>ACOMPANHAMENTO PRIORITÁRIO</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: kpis.sobAtencao > 0 ? '#c62828' : '#16a34a', marginTop: '0.25rem' }}>
            {kpis.sobAtencao}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Média formativa &lt; 1.8</div>
        </div>
      </div>

      {/* Seção de Gráficos (Radar, Barras e Donut) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        
        {/* Radar de Competências Formativas */}
        <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#002b7f', fontSize: '1.05rem', fontWeight: 800 }}>
            🎯 Radar de Competências Formativas
          </h3>
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#64748b' }}>
            Média de pontuação (0 a 3.0) por critério oficial nas sessões de tutoria.
          </p>
          <div style={{ width: '100%', height: '280px' }}>
            <ResponsiveContainer>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#cbd5e1" />
                <PolarAngleAxis dataKey="criterio" tick={{ fill: '#334155', fontSize: 11, fontWeight: 600 }} />
                <PolarRadiusAxis angle={30} domain={[0, 3]} stroke="#94a3b8" />
                <Radar name="Média Formativa" dataKey="media" stroke="#007a33" fill="#007a33" fillOpacity={0.4} />
                <Tooltip formatter={(value) => [`${value} / 3.0`, 'Média']} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Barras por Modalidade */}
        <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#002b7f', fontSize: '1.05rem', fontWeight: 800 }}>
            📊 Ações por Formato de Tutoria
          </h3>
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#64748b' }}>
            Volume e média comparativa de Diálogo, Devolutiva e Encontro Formativo.
          </p>
          <div style={{ width: '100%', height: '280px' }}>
            <ResponsiveContainer>
              <BarChart data={modalidadeBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="modalidade" tick={{ fill: '#334155', fontSize: 12, fontWeight: 600 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" name="Total de Ações" fill="#002b7f" radius={[4, 4, 0, 0]} />
                <Bar dataKey="media" name="Média Formativa" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart de Distribuição de Menções */}
        <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#002b7f', fontSize: '1.05rem', fontWeight: 800 }}>
            🍩 Distribuição Geral de Conceitos
          </h3>
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#64748b' }}>
            Proporção de menções concedidas em todos os critérios avaliados.
          </p>
          <div style={{ width: '100%', height: '280px' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Barra de Filtros e Pesquisa da Tabela */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '10px',
        padding: '1rem',
        border: '1px solid #e2e8f0',
        marginBottom: '1rem',
        display: 'flex',
        gap: '0.75rem',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>Ação:</span>
          <select
            value={filtroAcao}
            onChange={e => setFiltroAcao(e.target.value)}
            style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
          >
            <option value="todas">Todas as Ações</option>
            <option value="Observação de Tutor pelo Técnico">Observação de Tutor pelo Técnico</option>
            <option value="Observação do Formador pelo Tutor">Observação do Formador pelo Tutor</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>Modalidade:</span>
          <select
            value={filtroModalidade}
            onChange={e => setFiltroModalidade(e.target.value)}
            style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
          >
            <option value="todas">Todas</option>
            <option value="Diálogo Formativo">Diálogo Formativo</option>
            <option value="Devolutiva">Devolutiva</option>
            <option value="Encontro Formativo">Encontro Formativo</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>NRE:</span>
          <select
            value={filtroNre}
            onChange={e => setFiltroNre(e.target.value)}
            style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
          >
            <option value="todos">Todos os NREs</option>
            {nreList.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <div style={{ flex: 1, minWidth: '220px' }}>
          <input
            type="text"
            placeholder="🔍 Buscar por tutor, formador, destaques..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{ width: '100%', padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
          />
        </div>
      </div>

      {/* Tabela de Observações de Tutoria */}
      <div style={{ backgroundColor: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#1e293b', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem 1rem' }}>Ação de Acompanhamento</th>
              <th style={{ padding: '0.75rem 1rem' }}>Modalidade</th>
              <th style={{ padding: '0.75rem 1rem' }}>Tutor</th>
              <th style={{ padding: '0.75rem 1rem' }}>Formador / Técnico</th>
              <th style={{ padding: '0.75rem 1rem' }}>NRE</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Média Formativa</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredObs.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  Nenhum registro encontrado com os filtros selecionados.
                </td>
              </tr>
            ) : (
              filteredObs.map((obs, idx) => (
                <tr key={obs.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{
                      backgroundColor: obs.acaoAcompanhamento.includes('Técnico') ? '#e0f2fe' : '#f0fdf4',
                      color: obs.acaoAcompanhamento.includes('Técnico') ? '#0369a1' : '#15803d',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px'
                    }}>
                      {obs.acaoAcompanhamento}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#334155' }}>
                    {obs.modalidade || obs.acaoObservada}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#002b7f' }}>
                    {obs.tutor}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                    {obs.formador}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                    {obs.nre || 'Não informado'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <span style={{
                      backgroundColor: (obs.avgScore || 0) >= 2.5 ? 'rgba(0,43,127,0.1)' : (obs.avgScore || 0) >= 1.8 ? 'rgba(0,122,51,0.1)' : 'rgba(198,40,40,0.1)',
                      color: (obs.avgScore || 0) >= 2.5 ? '#002b7f' : (obs.avgScore || 0) >= 1.8 ? '#007a33' : '#c62828',
                      fontWeight: 800,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px'
                    }}>
                      {typeof obs.avgScore === 'number' ? obs.avgScore.toFixed(2) : '-'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <button
                      onClick={() => setSelectedObs(obs)}
                      style={{
                        backgroundColor: '#002b7f',
                        color: 'white',
                        border: 'none',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                        fontWeight: 700
                      }}
                    >
                      Ver Detalhes 👁️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Detalhes da Observação de Tutoria */}
      {selectedObs && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '750px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            overflow: 'hidden'
          }}>
            {/* Header Modal */}
            <div style={{
              padding: '1.25rem 1.5rem',
              background: 'linear-gradient(135deg, #002b7f 0%, #007a33 100%)',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.2)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                  {selectedObs.acaoAcompanhamento}
                </span>
                <h3 style={{ margin: '0.35rem 0 0 0', fontSize: '1.25rem', fontWeight: 800 }}>
                  {selectedObs.modalidade || selectedObs.acaoObservada}
                </h3>
              </div>
              <button
                onClick={() => setSelectedObs(null)}
                style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.4rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Conteúdo com Scroll */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>TUTOR:</div>
                  <div style={{ fontWeight: 800, color: '#002b7f' }}>{selectedObs.tutor}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{selectedObs.tutorEmail}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>FORMADOR / TÉCNICO:</div>
                  <div style={{ fontWeight: 800, color: '#007a33' }}>{selectedObs.formador}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{selectedObs.formadorEmail}</div>
                </div>
              </div>

              {/* Rubricas */}
              {Array.isArray(selectedObs.rubrics) && selectedObs.rubrics.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#002b7f', fontWeight: 800 }}>
                    Critérios & Rubricas Avaliadas:
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {selectedObs.rubrics.map((r, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', fontSize: '0.85rem' }}>
                        <span style={{ color: '#334155', fontWeight: 600 }}>{r.criterio}</span>
                        <span style={{
                          backgroundColor: r.score === 3 ? 'rgba(0,43,127,0.1)' : r.score === 2 ? 'rgba(0,122,51,0.1)' : r.score === 1 ? 'rgba(245,158,11,0.1)' : 'rgba(198,40,40,0.1)',
                          color: r.score === 3 ? '#002b7f' : r.score === 2 ? '#007a33' : r.score === 1 ? '#d97706' : '#c62828',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px'
                        }}>
                          {r.value} ({r.score !== null ? r.score : '-'})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Destaques e A Desenvolver */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.9rem', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 800, color: '#166534', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    🌟 Habilidades de Destaque:
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#14532d', lineHeight: 1.5 }}>
                    {selectedObs.destaques || 'Nenhum destaque específico registrado.'}
                  </div>
                </div>

                <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '0.9rem', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 800, color: '#b45309', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    🎯 A Desenvolver / Metas Formativas:
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#78350f', lineHeight: 1.5 }}>
                    {selectedObs.desenvolver || 'Nenhum ponto registrado.'}
                  </div>
                </div>
              </div>

              {/* Encaminhamentos */}
              {selectedObs.encaminhamentos && (
                <div style={{ backgroundColor: '#f1f5f9', padding: '0.9rem', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    📌 Próximos Passos & Encaminhamentos:
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                    {selectedObs.encaminhamentos}
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé */}
            <div style={{ padding: '0.75rem 1.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedObs(null)}
                style={{ padding: '0.45rem 1.25rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer', fontWeight: 700 }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Inserir Nova Observação de Tutoria */}
      {modalNovaObs && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '700px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              background: 'linear-gradient(135deg, #007a33 0%, #002b7f 100%)',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                ➕ Nova Observação de Tutoria
              </h3>
              <button
                onClick={() => setModalNovaObs(false)}
                style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.4rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarNova} style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.2rem' }}>
                    Ação de Acompanhamento:
                  </label>
                  <select
                    value={formNova.acaoAcompanhamento}
                    onChange={e => setFormNova({ ...formNova, acaoAcompanhamento: e.target.value })}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  >
                    <option value="Observação do Formador pelo Tutor">Observação do Formador pelo Tutor</option>
                    <option value="Observação de Tutor pelo Técnico">Observação de Tutor pelo Técnico</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.2rem' }}>
                    Modalidade Formativa:
                  </label>
                  <select
                    value={formNova.acaoObservada}
                    onChange={e => setFormNova({ ...formNova, acaoObservada: e.target.value })}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  >
                    <option value="Diálogo Formativo">Diálogo Formativo (10 Critérios)</option>
                    <option value="Devolutiva">Devolutiva Formativa (6 Critérios)</option>
                    <option value="Encontro Formativo">Encontro Formativo (7 Critérios)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.2rem' }}>
                    Nome do Tutor:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Ana Silva"
                    value={formNova.tutor}
                    onChange={e => setFormNova({ ...formNova, tutor: e.target.value })}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.2rem' }}>
                    Nome do Formador / Avaliado:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Formador"
                    value={formNova.formador}
                    onChange={e => setFormNova({ ...formNova, formador: e.target.value })}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.2rem' }}>
                  NRE:
                </label>
                <input
                  type="text"
                  placeholder="Ex: NRE Curitiba"
                  value={formNova.nre}
                  onChange={e => setFormNova({ ...formNova, nre: e.target.value })}
                  style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              {/* Rubricas dinâmicas da modalidade selecionada */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#002b7f' }}>
                  Rubricas Oficiais: {formNova.acaoObservada}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {(CRITERIOS_POR_MODALIDADE[formNova.acaoObservada] || []).map(crit => (
                    <div key={crit} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                      <span style={{ color: '#334155', fontWeight: 600 }}>{crit}</span>
                      <select
                        value={formNova.notas[crit] || 'Atendeu integralmente'}
                        onChange={e => setFormNova({
                          ...formNova,
                          notas: { ...formNova.notas, [crit]: e.target.value }
                        })}
                        style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                      >
                        <option value="Superou">Superou (3.0)</option>
                        <option value="Atendeu integralmente">Atendeu integralmente (2.0)</option>
                        <option value="Atendeu parcialmente">Atendeu parcialmente (1.0)</option>
                        <option value="Não atendeu">Não atendeu (0.0)</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.2rem' }}>
                  Habilidades de Destaque:
                </label>
                <textarea
                  rows={2}
                  placeholder="Pontos fortes observados durante a ação..."
                  value={formNova.destaques}
                  onChange={e => setFormNova({ ...formNova, destaques: e.target.value })}
                  style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.2rem' }}>
                  Pontos a Desenvolver & Encaminhamentos:
                </label>
                <textarea
                  rows={2}
                  placeholder="Orientações e combinados para a próxima ação..."
                  value={formNova.desenvolver}
                  onChange={e => setFormNova({ ...formNova, desenvolver: e.target.value })}
                  style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setModalNovaObs(false)}
                  style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: 'none', backgroundColor: '#007a33', color: 'white', cursor: 'pointer', fontWeight: 700 }}
                >
                  Salvar Observação de Tutoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
