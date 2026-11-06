import React, { useState, useMemo } from 'react';
import { exportToCSV } from '../utils/exportUtils';

const EXONERADOS_OFICIAIS_FALLBACK = [
  { nome_cursista: 'EMMANUEL FLAVIO NOIMANN', email: 'emmanuel.noimann@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'SOCIOLOGIA', chamamento: '', status: '' },
  { nome_cursista: 'JOAO PAULO DE FARIAS', email: 'joao.farias12@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: '', chamamento: '5º Chamamento', status: '' },
  { nome_cursista: 'MARCIA CRISTINA RODRIGUES DA SILVA MUXFELDT', email: 'silva.marcia22@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: '', chamamento: '5º Chamamento', status: '' },
  { nome_cursista: 'SONIA APARECIDA BATISTA DA SILVA', email: 'silva.sonia@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: '', chamamento: '5º Chamamento', status: '' },
  { nome_cursista: 'LUCAS ADILSON ZAQUI', email: 'zaqui.lucas@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'MATEMATICA', chamamento: '5º Chamamento', status: 'Exonerado' },
  { nome_cursista: 'CARLOS EDUARDO MAMUS', email: 'carlos.mamus@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'MATEMATICA', chamamento: '5º Chamamento', status: '' },
  { nome_cursista: 'GABRIELLE THAIS WERLE', email: 'gabrielle.werle@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'MATEMATICA', chamamento: '4º Chamamento', status: '' },
  { nome_cursista: 'LUCIANO LAZZARINI WOLFF', email: 'luciano.wolff@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'BIOLOGIA', chamamento: '4º Chamamento', status: '' },
  { nome_cursista: 'JESUS MARCOS CAMARGO', email: 'camargo.jesus@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'MATEMATICA', chamamento: '4º Chamamento', status: '' },
  { nome_cursista: 'EDUARDO AUGUSTO FARIAS', email: 'eduardo.augusto.farias@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'SOCIOLOGIA', chamamento: '4º Chamamento', status: '' },
  { nome_cursista: 'JEANDREY SCUISSIATTO CORREA', email: 'jeandrey.correa@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'ARTE', chamamento: '4º Chamamento', status: '' },
  { nome_cursista: 'MARCUS VINICIUS MARTINEZ PIRATELO', email: 'marcus.piratelo@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'FISICA', chamamento: '4º Chamamento', status: '' },
  { nome_cursista: 'PEDRO PAULO TEIXEIRA', email: 'teixeira.pedro@escola.pr.gov.br', cargo: '', disciplina: '', chamamento: '', status: '' },
  { nome_cursista: 'ALISSON YOUNIO DE SOUZA FRANCO', email: 'franco.alisson@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'MATEMATICA', chamamento: '4º Chamamento', status: 'Exonerado em 05/05/2026' },
  { nome_cursista: 'CAIO JUVANELLI', email: 'caio.juvanelli@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'MATEMATICA', chamamento: '4º Chamamento', status: 'Exonerado (a pedido) em 18/05/2026' },
  { nome_cursista: 'THAIS CHARELLO DE BONA', email: 'thais.bona@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'MATEMATICA', chamamento: '4º Chamamento', status: 'Exonerado (a pedido) em 13/03/2026' },
  { nome_cursista: 'DANIELLE MARI STAPASSOLI', email: 'danielle.stapassoli@escola.pr.gov.br', cargo: 'EQUIPE GESTORA', disciplina: 'PEDAGOGO', chamamento: '4º Chamamento', status: 'Exonerado (a pedido) em 27/04/2026' },
  { nome_cursista: 'LEANDRO RANUCCI SILVA', email: 'leandro.ranucci.silva@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'BIOLOGIA', chamamento: '3º Chamamento', status: '' },
  { nome_cursista: 'ADRIANA CHRISTINA HERCULANO DA SILVA MODESTO', email: 'adriana.silva.modesto@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'MATEMATICA', chamamento: '4º Chamamento', status: 'Exonerado (a pedido) em 04/05/2026' },
  { nome_cursista: 'TARIK VIVAN ALEXANDRE', email: 'tarik.alexandre@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'ARTE', chamamento: '', status: 'Exonerado (a pedido) em 25/02/2026' },
  { nome_cursista: 'VIVIANI BUSKO SOUZA', email: 'souza.viviani@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'ARTE', chamamento: '4º Chamamento', status: 'Exonerado (a pedido) em 06/02/2026' },
  { nome_cursista: 'PAULA DANIELE DEPINE SCARAMUSSA', email: 'paula.scaramussa@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'INGLES', chamamento: '', status: 'Demitido em 13/04/2026' },
  { nome_cursista: 'SUEELEM WITSMISZYN', email: 'switsmiszyn@gmail.com', cargo: 'DOCENTE', disciplina: 'PORTUGUES', chamamento: '', status: 'Exonerado (a pedido) em 06/08/2026' },
  { nome_cursista: 'FERNANDA DARTORA MUSHA', email: 'fernanda.musha@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'MATEMATICA', chamamento: '5º Chamamento', status: '' },
  { nome_cursista: 'FERNANDO MOURA SCOMASSON', email: 'fernando.scomasson@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'MATEMATICA', chamamento: '5º Chamamento', status: '' },
  { nome_cursista: 'GABRIEL AUGUSTO PELARIN', email: 'gabriel.pelarin@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'HISTORIA', chamamento: '1º Chamamento', status: '' },
  { nome_cursista: 'GABRIELA DO AMARAL COSTA', email: 'gabriela.costa06@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'ARTE', chamamento: '3º Chamamento', status: '' },
  { nome_cursista: 'GRACIELI DE FATIMA CAMARGO LIMA', email: 'l.gracieli@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'EDUCACAO FISICA', chamamento: '3º Chamamento', status: '' },
  { nome_cursista: 'HELENA YOKO UE', email: 'helena.ue@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'MATEMATICA', chamamento: '2º Chamamento', status: '' },
  { nome_cursista: 'JOAB MONTEIRO DE SOUSA', email: 'joab.sousa@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'SOCIOLOGIA', chamamento: '2º Chamamento', status: '' },
  { nome_cursista: 'KENNY ZIMERMANN JARDIM CLARO', email: 'kenny.jardim@escola.pr.gov.br', cargo: 'EQUIPE GESTORA', disciplina: 'PEDAGOGO', chamamento: '3º Chamamento', status: '' },
  { nome_cursista: 'LUCIANO FILOSO', email: 'luciano.filoso@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'FILOSOFIA', chamamento: '3º Chamamento', status: '' },
  { nome_cursista: 'LUIZ FERNANDO RIBEIRO', email: 'luiz.fernando.ribeiro12@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'CIENCIAS', chamamento: '3º Chamamento', status: '' },
  { nome_cursista: 'MAIQUELI HAMMERER', email: 'maiqueli.hammerer@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'MATEMATICA', chamamento: '3º Chamamento', status: '' },
  { nome_cursista: 'MICHELLE CORREA DA SILVA', email: 'smichelle@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'GEOGRAFIA', chamamento: '1º Chamamento', status: '' },
  { nome_cursista: 'NEUMAR REGIANE MACHADO ALBERTONI', email: 'neumar.albertoni@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'MATEMATICA', chamamento: '4º Chamamento', status: '' },
  { nome_cursista: 'PALOMA APARECIDA OLIVEIRA RATUCHNE', email: 'paloma.ratuchne@escola.pr.gov.br', cargo: 'EQUIPE GESTORA', disciplina: 'PEDAGOGO', chamamento: '3º Chamamento', status: '' },
  { nome_cursista: 'PRISCILA DE LIMA SOUZA', email: 'priscila.lima09@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'HISTORIA', chamamento: '1º Chamamento', status: '' },
  { nome_cursista: 'RENAN MATHEUS DE OLIVEIRA', email: 'renan.matheus.oliveira@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'PORTUGUES', chamamento: '4º Chamamento', status: '' },
  { nome_cursista: 'RICARDO ALVES DE LIMA', email: 'alves.lima.ricardo@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'MATEMATICA', chamamento: '3º Chamamento', status: '' },
  { nome_cursista: 'RICARDO DA SILVA SOUZA', email: 'souza.ricardo28@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'MATEMATICA', chamamento: '2º Chamamento', status: '' },
  { nome_cursista: 'THAYSE REGINA LAUER LIEVORE', email: 'thayse.lievore@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'INGLES', chamamento: '4º Chamamento', status: '' },
  { nome_cursista: 'THIAGO BENITEZ DE MELO', email: 'melo.thiago@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'PORTUGUES', chamamento: '1º Chamamento', status: '' },
  { nome_cursista: 'TIBERIO BERNARDIM DE OLIVEIRA', email: 'tiberio.oliveira@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'PORTUGUES', chamamento: '4º Chamamento', status: '' },
  { nome_cursista: 'VANESSA APARECIDA TELES MEIRELES', email: 'vanessa.meireles@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'INGLES', chamamento: '2º Chamamento', status: '' },
  { nome_cursista: 'VINICIUS CAMARGO PRATTES', email: 'vinicius.prattes@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'EDUCACAO FISICA', chamamento: '3º Chamamento', status: '' },
  { nome_cursista: 'ANDRE FELIPE ANDRADE SCHERER', email: 'andre.andrade.scherer@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'GEOGRAFIA', chamamento: '4º Chamamento', status: '' },
  { nome_cursista: 'SIRLENE PETRECONI MIRANDA', email: 'lenepetreconi@gmail.com', cargo: 'DOCENTE', disciplina: 'MATEMATICA', chamamento: '6º Chamamento', status: 'Exonerado (a pedido) em 23/07/2026' },
  { nome_cursista: 'CAROLINA NATALE TOTI', email: 'carolina.ntoti@gmail.com', cargo: 'DOCENTE', disciplina: 'INGLES', chamamento: '6º Chamamento', status: '' },
  { nome_cursista: 'CARLOS EDUARDO BAO', email: 'carlos.bao@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'SOCIOLOGIA', chamamento: '3º Chamamento', status: 'Exonerado (a pedido) em 28/07/2026' },
  { nome_cursista: 'SARA DA SILVA DOS SANTOS', email: 'sara.silva.santos07@escola.pr.gov.br', cargo: 'EQUIPE GESTORA', disciplina: 'PEDAGOGO', chamamento: '2º Chamamento', status: '' },
  { nome_cursista: 'MARCELLA BORDINI', email: 'marcella.bordini@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'INGLES', chamamento: '4º Chamamento', status: '' },
  { nome_cursista: 'ROSMARY TEREZINHA PERIN DONDE', email: 'rosmary.donde@escola.pr.gov.br', cargo: 'EQUIPE GESTORA', disciplina: 'PEDAGOGO', chamamento: '5º Chamamento', status: '' },
  { nome_cursista: 'GUILHERME SCHMITT DOTAF', email: 'guilherme.dotaf@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'FILOSOFIA', chamamento: '6º Chamamento', status: '' },
  { nome_cursista: 'LILIAN FAVARO ALEGRANCIO IWASSE', email: 'lilian.iwasse@escola.pr.gov.br', cargo: 'EQUIPE GESTORA', disciplina: 'PEDAGOGO', chamamento: '1º Chamamento', status: '' },
  { nome_cursista: 'ADRIELE ANDRADE CEOLA', email: 'adriele.ceola@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'HISTORIA', chamamento: '4º Chamamento', status: 'Exonerado (a pedido) em 03/03/2026' },
  { nome_cursista: 'CAROLINE RODRIGUES PEREIRA DE PAULA', email: 'caroline.pereira.paula@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'MATEMATICA', chamamento: '4º Chamamento', status: '' },
  { nome_cursista: 'CLEBER DA SILVA LUZ', email: 'cleber.luz@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'PORTUGUES', chamamento: '4º Chamamento', status: '' },
  { nome_cursista: 'BARBARA LIZANDRA PERINI DE SOUZA', email: 'barbara.souza7@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'BIOLOGIA', chamamento: '1º Chamamento', status: '' },
  { nome_cursista: 'CLAUDINEI CERCONI', email: 'claudinei.cerconi@escola.pr.gov.br', cargo: 'DOCENTE', disciplina: 'FISICA', chamamento: '', status: '' }
];

export default function Exonerados({ exonerados = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCargo, setSelectedCargo] = useState('');
  const [selectedDisciplina, setSelectedDisciplina] = useState('');
  const [selectedChamamento, setSelectedChamamento] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Usa os dados vindos do TiDB se tiverem a estrutura completa; caso contrário, usa o fallback oficial sincronizado
  const baseExonerados = useMemo(() => {
    const raw = (Array.isArray(exonerados) && exonerados.length > 0) ? exonerados : EXONERADOS_OFICIAIS_FALLBACK;
    return raw.map((item, idx) => ({
      id: item.id || idx + 1,
      nome: (item.nome_cursista || item.nome || '').trim(),
      email: (item.email || item['e-mail'] || '').trim().toLowerCase(),
      cargo: (item.cargo || item.modalidade || '').trim().toUpperCase(),
      disciplina: (item.disciplina || item.componente || '').trim().toUpperCase(),
      chamamento: (item.chamamento || '').trim(),
      status: (item.status || item.motivo || '').trim()
    }));
  }, [exonerados]);

  // Normalizador de texto para busca flexível
  const normalize = (str) => {
    if (!str) return '';
    return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  };

  // Listas para filtros dinâmicos
  const cargosUnicos = useMemo(() => {
    const set = new Set();
    baseExonerados.forEach(e => {
      if (e.cargo) set.add(e.cargo);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [baseExonerados]);

  const disciplinasUnicas = useMemo(() => {
    const set = new Set();
    baseExonerados.forEach(e => {
      if (e.disciplina) set.add(e.disciplina);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [baseExonerados]);

  const chamamentosUnicos = useMemo(() => {
    const set = new Set();
    baseExonerados.forEach(e => {
      if (e.chamamento) set.add(e.chamamento);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [baseExonerados]);

  // Contagens por cargo para os cards
  const stats = useMemo(() => {
    let docentes = 0;
    let equipeGestora = 0;
    let comPortariaStatus = 0;
    baseExonerados.forEach(e => {
      if (e.cargo.includes('DOCENTE')) docentes++;
      else if (e.cargo.includes('GESTOR') || e.cargo.includes('PEDAGOG')) equipeGestora++;
      if (e.status) comPortariaStatus++;
    });
    return { docentes, equipeGestora, comPortariaStatus };
  }, [baseExonerados]);

  // Filtro dos registros
  const exoneradosFiltrados = useMemo(() => {
    const term = normalize(searchTerm);

    return baseExonerados.filter(item => {
      if (selectedCargo && item.cargo !== selectedCargo) return false;
      if (selectedDisciplina && item.disciplina !== selectedDisciplina) return false;
      if (selectedChamamento && item.chamamento !== selectedChamamento) return false;

      if (!term) return true;

      return (
        normalize(item.nome).includes(term) ||
        normalize(item.email).includes(term) ||
        normalize(item.cargo).includes(term) ||
        normalize(item.disciplina).includes(term) ||
        normalize(item.chamamento).includes(term) ||
        normalize(item.status).includes(term)
      );
    });
  }, [baseExonerados, searchTerm, selectedCargo, selectedDisciplina, selectedChamamento]);

  // Paginação
  const totalPages = Math.ceil(exoneradosFiltrados.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return exoneradosFiltrados.slice(start, start + itemsPerPage);
  }, [exoneradosFiltrados, currentPage, itemsPerPage]);

  const handleExportCSV = () => {
    const columns = [
      { header: 'Nome', accessor: r => r.nome || '' },
      { header: 'Email', accessor: r => r.email || '' },
      { header: 'Cargo', accessor: r => r.cargo || '' },
      { header: 'Disciplina', accessor: r => r.disciplina || '' },
      { header: 'Chamamento', accessor: r => r.chamamento || '' },
      { header: 'Status', accessor: r => r.status || '' }
    ];
    exportToCSV(`relatorio_exonerados_${new Date().toISOString().split('T')[0]}`, columns, exoneradosFiltrados);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease-in-out' }}>
      
      {/* CABEÇALHO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#dc2626', backgroundColor: '#fee2e2', padding: '0.2rem 0.6rem', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              SEED/PR · Estágio Probatório
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', backgroundColor: '#f1f5f9', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
              Aba: EXONERADOS
            </span>
          </div>
          <h2 style={{ fontSize: '1.5rem', color: '#002d5c', margin: 0, fontWeight: 800 }}>
            🚪 Servidores Exonerados / Desligados
          </h2>
          <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.9rem', color: '#475569', lineHeight: 1.5 }}>
            Relação oficial da aba <b>EXONERADOS</b> (Nome, Email, Cargo, Disciplina, Chamamento e Status).
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={exoneradosFiltrados.length === 0}
          style={{
            backgroundColor: '#002d5c',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '0.65rem 1.1rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: exoneradosFiltrados.length === 0 ? 'not-allowed' : 'pointer',
            opacity: exoneradosFiltrados.length === 0 ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 2px 6px rgba(0, 45, 92, 0.15)'
          }}
        >
          <span>📥</span>
          <span>Exportar Planilha (CSV)</span>
        </button>
      </div>

      {/* CARDS DE RESUMO */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        <div style={{ padding: '1.2rem', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid #fee2e2', borderLeft: '4px solid #ef4444', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>
            Total de Exonerados
          </span>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#b91c1c', margin: '0.25rem 0' }}>
            {baseExonerados.length.toLocaleString('pt-BR')}
          </div>
          <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
            Registros na aba EXONERADOS
          </span>
        </div>

        <div style={{ padding: '1.2rem', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #0072bc', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0072bc', textTransform: 'uppercase' }}>
            Docentes
          </span>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#002d5c', margin: '0.25rem 0' }}>
            {stats.docentes.toLocaleString('pt-BR')}
          </div>
          <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
            Cargo Docente
          </span>
        </div>

        <div style={{ padding: '1.2rem', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #8b5cf6', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase' }}>
            Equipe Gestora
          </span>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#5b21b6', margin: '0.25rem 0' }}>
            {stats.equipeGestora.toLocaleString('pt-BR')}
          </div>
          <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
            Pedagogos / Equipe Gestora
          </span>
        </div>

        <div style={{ padding: '1.2rem', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
            Registros Filtrados
          </span>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#047857', margin: '0.25rem 0' }}>
            {exoneradosFiltrados.length.toLocaleString('pt-BR')}
          </div>
          <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
            Exibidos na listagem abaixo
          </span>
        </div>
      </div>

      {/* FILTROS E BUSCA */}
      <div style={{ backgroundColor: '#ffffff', padding: '1.2rem 1.4rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          
          {/* Campo de Busca Livre */}
          <div style={{ flex: '1 1 280px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
            <input
              type="text"
              placeholder="Buscar por Nome, Email, Disciplina, Chamamento ou Status..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem 0.65rem 2.4rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Filtro por Cargo */}
          <select
            value={selectedCargo}
            onChange={(e) => { setSelectedCargo(e.target.value); setCurrentPage(1); }}
            style={{ padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff', outline: 'none' }}
          >
            <option value="">Todos os Cargos ({cargosUnicos.length})</option>
            {cargosUnicos.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Filtro por Disciplina */}
          <select
            value={selectedDisciplina}
            onChange={(e) => { setSelectedDisciplina(e.target.value); setCurrentPage(1); }}
            style={{ padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff', outline: 'none' }}
          >
            <option value="">Todas as Disciplinas ({disciplinasUnicas.length})</option>
            {disciplinasUnicas.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          {/* Filtro por Chamamento */}
          <select
            value={selectedChamamento}
            onChange={(e) => { setSelectedChamamento(e.target.value); setCurrentPage(1); }}
            style={{ padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff', outline: 'none' }}
          >
            <option value="">Todos os Chamamentos ({chamamentosUnicos.length})</option>
            {chamamentosUnicos.map(ch => <option key={ch} value={ch}>{ch}</option>)}
          </select>

          {(searchTerm || selectedCargo || selectedDisciplina || selectedChamamento) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCargo('');
                setSelectedDisciplina('');
                setSelectedChamamento('');
                setCurrentPage(1);
              }}
              style={{ padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '0.82rem', fontWeight: 700, color: '#64748b', cursor: 'pointer' }}
            >
              ✕ Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* TABELA DE EXONERADOS (Colunas Oficiais: Nome, Email, Cargo, Disciplina, Chamamento, Status) */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '0.85rem 1rem' }}>Nome</th>
                <th style={{ padding: '0.85rem 1rem' }}>Email</th>
                <th style={{ padding: '0.85rem 1rem' }}>Cargo</th>
                <th style={{ padding: '0.85rem 1rem' }}>Disciplina</th>
                <th style={{ padding: '0.85rem 1rem' }}>Chamamento</th>
                <th style={{ padding: '0.85rem 1rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length > 0 ? (
                paginatedData.map((item, idx) => (
                  <tr 
                    key={item.id || item.email || idx}
                    style={{ 
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                      transition: 'background-color 0.15s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#fafafa'; }}
                  >
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#002d5c' }}>
                      {item.nome || '—'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#0284c7', fontSize: '0.82rem' }}>
                      {item.email ? (
                        <a href={`mailto:${item.email}`} style={{ color: '#0284c7', textDecoration: 'none' }}>
                          {item.email}
                        </a>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#334155' }}>
                      {item.cargo ? (
                        <span style={{
                          backgroundColor: item.cargo.includes('GESTOR') ? '#ede9fe' : '#e0f2fe',
                          color: item.cargo.includes('GESTOR') ? '#6d28d9' : '#0369a1',
                          padding: '0.22rem 0.55rem',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 700
                        }}>
                          {item.cargo}
                        </span>
                      ) : <span style={{ color: '#94a3b8' }}>—</span>}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#334155' }}>
                      {item.disciplina ? (
                        <span style={{ backgroundColor: '#f1f5f9', color: '#334155', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                          {item.disciplina}
                        </span>
                      ) : <span style={{ color: '#94a3b8' }}>—</span>}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#334155', fontWeight: 600 }}>
                      {item.chamamento || <span style={{ color: '#94a3b8', fontWeight: 400 }}>—</span>}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#475569', maxWidth: '300px' }}>
                      {item.status ? (
                        <span style={{
                          backgroundColor: item.status.toLowerCase().includes('demitido') ? '#fef2f2' : '#fff7ed',
                          color: item.status.toLowerCase().includes('demitido') ? '#b91c1c' : '#c2410c',
                          border: `1px solid ${item.status.toLowerCase().includes('demitido') ? '#fecaca' : '#fed7aa'}`,
                          padding: '0.22rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          display: 'inline-block'
                        }}>
                          {item.status}
                        </span>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '0.78rem' }}>Exonerado</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚪</div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#334155' }}>
                      Nenhum registro de exoneração encontrado para os filtros selecionados.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINAÇÃO */}
        {exoneradosFiltrados.length > 0 && (
          <div style={{ padding: '0.9rem 1.2rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Mostrando <b>{Math.min((currentPage - 1) * itemsPerPage + 1, exoneradosFiltrados.length)}</b> a <b>{Math.min(currentPage * itemsPerPage, exoneradosFiltrados.length)}</b> de <b>{exoneradosFiltrados.length}</b> registros
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', backgroundColor: '#ffffff' }}
              >
                <option value={15}>15 por página</option>
                <option value={20}>20 por página</option>
                <option value={50}>50 por página</option>
                <option value={100}>100 por página</option>
              </select>

              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: currentPage === 1 ? '#f1f5f9' : '#ffffff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
              >
                Anterior
              </button>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', padding: '0 0.4rem' }}>
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: currentPage === totalPages ? '#f1f5f9' : '#ffffff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
