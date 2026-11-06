import React, { useState, useEffect, useMemo } from 'react';
import { supabase, isConfigured as isSupabaseConfigured } from '../supabase';
import { tidbService } from '../services/tidbService';

export default function DiarioFormativo({ 
  userRole, 
  userEmail, 
  cursistas = [], 
  tutores = [] 
}) {
  const [apontamentos, setApontamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [novoModalAberto, setNovoModalAberto] = useState(false);
  const [respostaModal, setRespostaModal] = useState(null); // id do apontamento sendo respondido
  const [textoResposta, setTextoResposta] = useState('');

  // Formulário de novo apontamento
  const [formNovo, setFormNovo] = useState({
    categoria: 'Dificuldade na Prática de Aula',
    titulo: '',
    descricao: '',
    componente: '',
    turma: '',
    nivelApoio: 'Moderado'
  });

  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [buscaTexto, setBuscaTexto] = useState('');

  // Identifica se o usuário é cursista
  const isCursista = userRole === 'cursista';

  // Identifica dados do cursista atual se for cursista
  const meuPerfilCursista = useMemo(() => {
    if (!isCursista || !userEmail) return null;
    const cleanEmail = userEmail.trim().toLowerCase();
    return cursistas.find(c => {
      const em = (c['e-mail'] || c.email || c.email_cursista || '').trim().toLowerCase();
      return em === cleanEmail;
    }) || null;
  }, [isCursista, userEmail, cursistas]);

  // Carrega apontamentos do TiDB Cloud, Supabase ou localStorage
  const carregarApontamentos = async () => {
    setLoading(true);
    let dadosCarregados = [];

    // 1. Prioridade: TiDB Cloud Serverless (Cache ou API)
    try {
      const cached = localStorage.getItem('ep_tidb_cached_bundle');
      let diarioTiDB = [];
      if (cached) {
        const pacote = JSON.parse(cached);
        if (pacote.diario && Array.isArray(pacote.diario) && pacote.diario.length > 0) {
          diarioTiDB = pacote.diario;
        }
      }
      if (diarioTiDB.length === 0) {
        const res = await fetch('/api/tidb?action=bundle');
        if (res.ok) {
          const pacote = await res.json();
          if (pacote.diario && Array.isArray(pacote.diario) && pacote.diario.length > 0) {
            diarioTiDB = pacote.diario;
          }
        }
      }
      if (diarioTiDB.length > 0) {
        dadosCarregados = diarioTiDB.map(d => ({
          id: d.id,
          created_at: d.data_registro || d.created_at || new Date().toISOString(),
          nome_cursista: d.nome_cursista || d.nome_autor || 'Docente Cursista',
          email_cursista: d.email_autor || '',
          cgm_cursista: d.cgm_cursista || '',
          turma: d.turma || '',
          categoria: d.categoria || 'Geral',
          titulo: d.titulo || 'Registro Formativo',
          descricao: d.conteudo || '',
          nivelApoio: 'Moderado',
          respostas: []
        }));
      }
    } catch (e) {
      console.warn('[Diário Formativo] Falha ao consultar TiDB Cloud:', e);
    }

    if (dadosCarregados.length === 0 && isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('diario_formativo')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          dadosCarregados = data;
        }
      } catch (err) {
        console.warn('Erro ao buscar diário no Supabase, tentando local:', err);
      }
    }

    // Fallback localStorage
    if (dadosCarregados.length === 0) {
      try {
        const local = localStorage.getItem('diario_formativo_dados');
        if (local) {
          dadosCarregados = JSON.parse(local);
        }
      } catch (e) {
        console.error('Erro ao ler localStorage do diário:', e);
      }
    }

    // Se ainda vazio, inclui exemplos formativos reais para visualização
    if (dadosCarregados.length === 0) {
      dadosCarregados = [
        {
          id: 'diario-mock-1',
          created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          nome_cursista: 'Luciane Jovinski',
          email_cursista: 'luciane.jovinski@escola.pr.gov.br',
          cgm_cursista: '89044553',
          turma: 'FORM-SOCIOLOGIA EST PROB A MANHA',
          componente: 'Sociologia',
          nome_formador: 'Carlos Formador',
          email_formador: 'carlos.formador@escola.pr.gov.br',
          tutor_responsavel: 'Ana Silva',
          nre: 'AREA METROP.NORTE',
          categoria: 'Gestão de Tempo na Aula',
          titulo: 'Dificuldade em concluir a atividade avaliativa em 50 minutos',
          descricao: 'Estou com dificuldade de cumprir todas as etapas planejadas. Quando os alunos debatem sobre o tema social, o tempo estoura e acabo não conseguindo fazer o fechamento formativo com a rubrica.',
          nivelApoio: 'Moderado',
          respostas: [
            {
              autor: 'Carlos Formador (Formador)',
              email: 'carlos.formador@escola.pr.gov.br',
              data: new Date(Date.now() - 86400000 * 1).toISOString(),
              texto: 'Olá Luciane! Uma estratégia excelente da nossa formação é pré-determinar 10 minutos para o debate em duplas com temporizador visual no quadro. Vamos ajustar isso no seu próximo plano de aula!'
            }
          ]
        },
        {
          id: 'diario-mock-2',
          created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
          nome_cursista: 'Marcio Silva',
          email_cursista: 'marcio.silva@escola.pr.gov.br',
          cgm_cursista: '74561230',
          turma: 'FORM-MATEMATICA EST PROB B TARDE',
          componente: 'Matemática',
          nome_formador: 'Daniela Formadora',
          email_formador: 'daniela.formadora@escola.pr.gov.br',
          tutor_responsavel: 'Bruno Santos',
          nre: 'LONDRINA',
          categoria: 'Metodologias Ativas',
          titulo: 'Dúvida na aplicação do RCO+Aulas com estudo de caso',
          descricao: 'Gostaria de saber como integrar melhor a trilha do RCO com atividades em grupos menores sem dispersar a atenção dos estudantes.',
          nivelApoio: 'Leve',
          respostas: []
        }
      ];
    }

    setApontamentos(dadosCarregados);
    setLoading(false);
  };

  useEffect(() => {
    carregarApontamentos();
  }, []);

  // Salvar novo apontamento
  const handleCriarApontamento = async (e) => {
    e.preventDefault();
    if (!formNovo.titulo || !formNovo.descricao) {
      alert('Por favor, preencha o título e a descrição do apontamento.');
      return;
    }

    const novo = {
      id: `diario-${Date.now()}`,
      created_at: new Date().toISOString(),
      nome_cursista: meuPerfilCursista?.nome_cursista || 'Docente Cursista',
      email_cursista: userEmail,
      cgm_cursista: meuPerfilCursista?.cgm || '',
      turma: formNovo.turma || meuPerfilCursista?.turmas || 'Turma Geral',
      componente: formNovo.componente || meuPerfilCursista?.componente || 'Geral',
      nome_formador: meuPerfilCursista?.nome_formador || '',
      email_formador: meuPerfilCursista?.['e-mail_formador'] || meuPerfilCursista?.email_formador || '',
      tutor_responsavel: meuPerfilCursista?.tutor_responsavel || '',
      nre: meuPerfilCursista?.nre || '',
      categoria: formNovo.categoria,
      titulo: formNovo.titulo,
      descricao: formNovo.descricao,
      nivelApoio: formNovo.nivelApoio,
      respostas: []
    };

    // 1. Salva prioritariamente no TiDB Serverless Cloud
    try {
      await tidbService.salvarDiario({
        email_autor: userEmail,
        nome_autor: meuPerfilCursista?.nome_cursista || 'Docente Cursista',
        papel_autor: userRole,
        turma: formNovo.turma || meuPerfilCursista?.turmas || 'Turma Geral',
        cgm_cursista: meuPerfilCursista?.cgm || '',
        nome_cursista: meuPerfilCursista?.nome_cursista || 'Docente Cursista',
        titulo: formNovo.titulo,
        conteudo: formNovo.descricao,
        categoria: formNovo.categoria,
        visibilidade: 'publico'
      });
    } catch (err) {
      console.warn('[Diário Formativo] Erro ao inserir no TiDB Cloud:', err);
    }

    // 2. Salva no Supabase se disponível (redundância)
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('diario_formativo').insert([novo]);
      } catch (err) {
        console.warn('Erro ao inserir no Supabase:', err);
      }
    }

    // Salva no localStorage
    const atualizados = [novo, ...apontamentos];
    setApontamentos(atualizados);
    try {
      localStorage.setItem('diario_formativo_dados', JSON.stringify(atualizados));
    } catch (err) {
      console.error(err);
    }

    setFormNovo({
      categoria: 'Dificuldade na Prática de Aula',
      titulo: '',
      descricao: '',
      componente: '',
      turma: '',
      nivelApoio: 'Moderado'
    });
    setNovoModalAberto(false);
    alert('Apontamento registrado com sucesso no Diário Formativo! Seu Formador, Tutor e Técnicos já podem acompanhar.');
  };

  // Enviar resposta / orientação pedagógica
  const handleEnviarResposta = async (apontamentoId) => {
    if (!textoResposta.trim()) return;

    const novaResposta = {
      autor: `${userRole.toUpperCase()} (${userEmail})`,
      email: userEmail,
      data: new Date().toISOString(),
      texto: textoResposta.trim()
    };

    const atualizados = apontamentos.map(item => {
      if (item.id === apontamentoId) {
        const respostas = item.respostas || [];
        return { ...item, respostas: [...respostas, novaResposta] };
      }
      return item;
    });

    setApontamentos(atualizados);
    try {
      localStorage.setItem('diario_formativo_dados', JSON.stringify(atualizados));
      if (isSupabaseConfigured && supabase) {
        await supabase
          .from('diario_formativo')
          .update({ respostas: atualizados.find(i => i.id === apontamentoId)?.respostas })
          .eq('id', apontamentoId);
      }
    } catch (err) {
      console.error(err);
    }

    setTextoResposta('');
    setRespostaModal(null);
  };

  // Filtragem de apontamentos de acordo com o RBAC do usuário
  const apontamentosFiltrados = useMemo(() => {
    const cleanUserEmail = (userEmail || '').trim().toLowerCase();

    return apontamentos.filter(item => {
      // 1. Filtro de permissão hierárquica
      if (userRole === 'cursista') {
        const itemCursistaEmail = (item.email_cursista || '').trim().toLowerCase();
        if (itemCursistaEmail !== cleanUserEmail) return false;
      } else if (userRole === 'formador') {
        const itemFormadorEmail = (item.email_formador || '').trim().toLowerCase();
        if (itemFormadorEmail && itemFormadorEmail !== cleanUserEmail) return false;
      } else if (userRole === 'tutor') {
        // Tutor vê os apontamentos dos cursistas dos seus formadores ou do seu NRE
        const tutorInfo = tutores.find(t => (t.email_educ || '').trim().toLowerCase() === cleanUserEmail);
        const tutorNome = tutorInfo ? (tutorInfo.tutor_responsavel || '').trim().toUpperCase() : '';
        const itemTutor = (item.tutor_responsavel || '').trim().toUpperCase();
        if (tutorNome && itemTutor && itemTutor !== tutorNome) return false;
      }
      // Técnicos e Admins veem todos

      // 2. Filtro de categoria
      if (filtroCategoria !== 'todos' && item.categoria !== filtroCategoria) return false;

      // 3. Filtro de busca textual
      if (buscaTexto) {
        const q = buscaTexto.toLowerCase();
        const textoMatch = (
          (item.titulo || '').toLowerCase().includes(q) ||
          (item.descricao || '').toLowerCase().includes(q) ||
          (item.nome_cursista || '').toLowerCase().includes(q) ||
          (item.componente || '').toLowerCase().includes(q)
        );
        if (!textoMatch) return false;
      }

      return true;
    });
  }, [apontamentos, userRole, userEmail, tutores, filtroCategoria, buscaTexto]);

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Banner Superior do Diário */}
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
            Espaço de Escuta & Desenvolvimento Contínuo
          </span>
          <h2 style={{ margin: '0.5rem 0 0.25rem 0', fontSize: '1.6rem', fontWeight: 800 }}>
            📖 Diário Formativo do Docente
          </h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>
            {isCursista
              ? 'Compartilhe suas reflexões, dúvidas e apontamentos de dificuldades na prática pedagógica com seu Formador e Tutoria.'
              : 'Acompanhamento qualificado dos apontamentos, reflexões e desafios pedagógicos relatados pelos professores cursistas.'}
          </p>
        </div>

        {isCursista && (
          <button
            onClick={() => setNovoModalAberto(true)}
            style={{
              backgroundColor: '#f59e0b',
              color: '#0f172a',
              border: 'none',
              padding: '0.75rem 1.5rem',
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
            ✍️ Novo Apontamento no Diário
          </button>
        )}
      </div>

      {/* Alerta de Visibilidade Formativa */}
      <div style={{
        backgroundColor: '#f0f9ff',
        border: '1px solid #bae6fd',
        borderRadius: '8px',
        padding: '0.85rem 1.25rem',
        marginBottom: '1.5rem',
        fontSize: '0.85rem',
        color: '#0369a1',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
        <div>
          <b>Visibilidade Integrada:</b> Os registros deste diário são visíveis para o <b>Formador</b> da sua turma, o <b>Tutor Pedagógico</b> supervisor, <b>Técnicos do NRE/SEED</b> e a <b>Coordenação Geral (Admin)</b>, fortalecendo a rede de apoio pedagógico.
        </div>
      </div>

      {/* Filtros e Barra de Pesquisa */}
      <div style={{
        backgroundColor: 'white',
        padding: '1rem',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        marginBottom: '1.5rem',
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Categoria:</span>
          <select
            value={filtroCategoria}
            onChange={e => setFiltroCategoria(e.target.value)}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              fontWeight: 600
            }}
          >
            <option value="todos">Todas as Categorias</option>
            <option value="Dificuldade na Prática de Aula">Dificuldade na Prática de Aula</option>
            <option value="Gestão de Tempo na Aula">Gestão de Tempo na Aula</option>
            <option value="Metodologias Ativas">Metodologias Ativas</option>
            <option value="Uso do RCO+Aulas">Uso do RCO+Aulas</option>
            <option value="Clima Escolar e Convivência">Clima Escolar e Convivência</option>
            <option value="Avaliação da Aprendizagem">Avaliação da Aprendizagem</option>
            <option value="Outros Apontamentos">Outros Apontamentos</option>
          </select>
        </div>

        <div style={{ flex: '1', maxWidth: '400px' }}>
          <input
            type="text"
            placeholder="🔍 Buscar por título, relato, cursista ou componente..."
            value={buscaTexto}
            onChange={e => setBuscaTexto(e.target.value)}
            style={{
              width: '100%',
              padding: '0.45rem 0.85rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem'
            }}
          />
        </div>
      </div>

      {/* Lista de Apontamentos do Diário */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Carregando diário formativo...</div>
      ) : apontamentosFiltrados.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '12px',
          border: '1px dashed #cbd5e1',
          textAlign: 'center',
          color: '#64748b'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e293b' }}>Nenhum apontamento encontrado</h3>
          <p style={{ margin: 0, fontSize: '0.88rem' }}>
            {isCursista
              ? 'Você ainda não registrou nenhum apontamento no seu diário. Clique no botão acima para compartilhar suas dúvidas ou reflexões!'
              : 'Nenhum apontamento registrado para o perfil/filtros selecionados.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {apontamentosFiltrados.map(item => (
            <div
              key={item.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                padding: '1.25rem',
                boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}
            >
              {/* Topo do Apontamento */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                    <span style={{
                      backgroundColor: item.nivelApoio === 'Prioritário' ? 'rgba(239, 68, 68, 0.15)' : item.nivelApoio === 'Moderado' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: item.nivelApoio === 'Prioritário' ? '#b91c1c' : item.nivelApoio === 'Moderado' ? '#b45309' : '#047857',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px'
                    }}>
                      Apoio: {item.nivelApoio}
                    </span>
                    <span style={{
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px'
                    }}>
                      {item.categoria}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      {new Date(item.created_at).toLocaleDateString('pt-BR')} às {new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <h3 style={{ margin: '0.25rem 0', fontSize: '1.15rem', color: '#0f172a', fontWeight: 800 }}>
                    {item.titulo}
                  </h3>
                </div>

                <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#64748b' }}>
                  <div style={{ fontWeight: 700, color: '#002b7f' }}>{item.nome_cursista}</div>
                  <div>{item.componente} • {item.turma}</div>
                  {item.nre && <div>NRE: {item.nre}</div>}
                </div>
              </div>

              {/* Descrição do Desafio / Apontamento */}
              <div style={{
                backgroundColor: '#f8fafc',
                padding: '1rem',
                borderRadius: '8px',
                borderLeft: '4px solid #002b7f',
                fontSize: '0.9rem',
                color: '#334155',
                lineHeight: 1.6
              }}>
                {item.descricao}
              </div>

              {/* Respostas / Interações Formativas */}
              {item.respostas && item.respostas.length > 0 && (
                <div style={{ marginTop: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#007a33', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    💬 Orientações & Combinados Formativos ({item.respostas.length}):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {item.respostas.map((resp, rIdx) => (
                      <div key={rIdx} style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#166534', fontWeight: 700, marginBottom: '0.25rem' }}>
                          <span>{resp.autor}</span>
                          <span>{new Date(resp.data).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#14532d', lineHeight: 1.5 }}>
                          {resp.texto}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botão de Responder (Para Formador, Tutor, Técnico ou Admin) */}
              {!isCursista && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button
                    onClick={() => {
                      setRespostaModal(item.id);
                      setTextoResposta('');
                    }}
                    style={{
                      backgroundColor: '#007a33',
                      color: 'white',
                      border: 'none',
                      padding: '0.4rem 0.9rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    💬 Orientar / Responder Cursista
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: Novo Apontamento pelo Cursista */}
      {novoModalAberto && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '600px',
            padding: '1.75rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, color: '#002b7f', fontWeight: 800 }}>Novo Registro no Diário Formativo</h3>
              <button
                onClick={() => setNovoModalAberto(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCriarApontamento} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                  Categoria da Reflexão / Desafio:
                </label>
                <select
                  value={formNovo.categoria}
                  onChange={e => setFormNovo({ ...formNovo, categoria: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                >
                  <option value="Dificuldade na Prática de Aula">Dificuldade na Prática de Aula</option>
                  <option value="Gestão de Tempo na Aula">Gestão de Tempo na Aula</option>
                  <option value="Metodologias Ativas">Metodologias Ativas</option>
                  <option value="Uso do RCO+Aulas">Uso do RCO+Aulas</option>
                  <option value="Clima Escolar e Convivência">Clima Escolar e Convivência</option>
                  <option value="Avaliação da Aprendizagem">Avaliação da Aprendizagem</option>
                  <option value="Outros Apontamentos">Outros Apontamentos</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                  Nível de Apoio Solicitado:
                </label>
                <select
                  value={formNovo.nivelApoio}
                  onChange={e => setFormNovo({ ...formNovo, nivelApoio: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                >
                  <option value="Leve">Leve (Apenas registro/dúvida pontual)</option>
                  <option value="Moderado">Moderado (Gostaria de sugestão de material ou estratégia)</option>
                  <option value="Prioritário">Prioritário (Necessito de apoio direto no próximo encontro/diálogo)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                  Título Resumido:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Gestão do tempo nos 10 minutos finais da aula de matemática"
                  value={formNovo.titulo}
                  onChange={e => setFormNovo({ ...formNovo, titulo: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                  Relato Detalhado do Apontamento / Dúvida:
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Descreva o contexto da turma, o que você tentou aplicar, o que deu certo e onde sentiu maior dificuldade..."
                  value={formNovo.descricao}
                  onChange={e => setFormNovo({ ...formNovo, descricao: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setNovoModalAberto(false)}
                  style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: 'none', backgroundColor: '#002b7f', color: 'white', cursor: 'pointer', fontWeight: 700 }}
                >
                  Registrar Apontamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Orientar Cursista */}
      {respostaModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '550px',
            padding: '1.5rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#007a33', fontWeight: 800 }}>
              💬 Enviar Orientação / Combinado Pedagógico
            </h3>
            <textarea
              rows={4}
              placeholder="Digite a orientação pedagógica, recomendação de repertório ou combinado de acompanhamento para o professor cursista..."
              value={textoResposta}
              onChange={e => setTextoResposta(e.target.value)}
              style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontFamily: 'inherit', marginBottom: '1rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setRespostaModal(null)}
                style={{ padding: '0.45rem 0.9rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleEnviarResposta(respostaModal)}
                style={{ padding: '0.45rem 1.2rem', borderRadius: '6px', border: 'none', backgroundColor: '#007a33', color: 'white', cursor: 'pointer', fontWeight: 700 }}
              >
                Enviar Orientação
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
