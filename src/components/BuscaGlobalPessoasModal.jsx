import React, { useState, useMemo } from 'react';

export default function BuscaGlobalPessoasModal({
  isOpen,
  onClose,
  cursistas = [],
  tutores = [],
  onAbrirDossie
}) {
  const [termo, setTermo] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos'); // 'todos', 'cursistas', 'formadores', 'tutores'
  const [selecionado, setSelecionado] = useState(null);

  // Mapeia formadores únicos
  const listaFormadores = useMemo(() => {
    const map = new Map();
    cursistas.forEach(c => {
      const email = (c['e-mail_formador'] || c.email_formador || '').trim().toLowerCase();
      const nome = c.nome_formador;
      if (email && email.includes('@') && !map.has(email)) {
        map.set(email, {
          tipo: 'formador',
          nome: nome || email.split('@')[0],
          email: email,
          nre: c.nre_formador || c.nre || 'Não informado',
          tutor_responsavel: c.tutor_responsavel || 'Não informado',
          turmas: new Set([c.turmas || c.turma]),
          totalCursistas: 1
        });
      } else if (email && map.has(email)) {
        const item = map.get(email);
        if (c.turmas || c.turma) item.turmas.add(c.turmas || c.turma);
        item.totalCursistas += 1;
      }
    });
    return Array.from(map.values()).map(f => ({
      ...f,
      turmas: Array.from(f.turmas).filter(Boolean)
    }));
  }, [cursistas]);

  // Mapeia tutores
  const listaTutoresFormatados = useMemo(() => {
    return tutores.map(t => ({
      tipo: 'tutor',
      nome: t.tutor_responsavel || 'Tutor',
      email: t.email_educ || t.email_adm || '',
      email_adm: t.email_adm || '',
      telefone: t.telefone || '',
      nre: t.nre_tutor || 'Não informado',
      municipio: t.municipio || ''
    }));
  }, [tutores]);

  // Mapeia cursistas
  const listaCursistasFormatados = useMemo(() => {
    return cursistas.map(c => ({
      tipo: 'cursista',
      nome: c.nome_cursista || c.nome || 'Cursista',
      cgm: c.cgm ? String(c.cgm).trim() : '',
      cpf: c.cpf || c.cpf_cursista || '',
      email: (c['e-mail'] || c.email || c.email_cursista || '').trim(),
      componente: c.componente || c.componente_conc || 'Geral',
      turma: c.turmas || c.turma || 'Sem turma',
      nre: c.nre || c.nre_cursista || '',
      municipio: c.municipio || '',
      nome_formador: c.nome_formador || '',
      tutor_responsavel: c.tutor_responsavel || '',
      raw: c
    }));
  }, [cursistas]);

  // Filtro de Busca Unificado
  const resultados = useMemo(() => {
    const q = termo.trim().toLowerCase();
    if (!q) return [];

    let pool = [];
    if (filtroTipo === 'todos' || filtroTipo === 'cursistas') {
      pool = pool.concat(listaCursistasFormatados);
    }
    if (filtroTipo === 'todos' || filtroTipo === 'formadores') {
      pool = pool.concat(listaFormadores);
    }
    if (filtroTipo === 'todos' || filtroTipo === 'tutores') {
      pool = pool.concat(listaTutoresFormatados);
    }

    return pool.filter(item => {
      const nomeMatch = (item.nome || '').toLowerCase().includes(q);
      const emailMatch = (item.email || '').toLowerCase().includes(q);
      const nreMatch = (item.nre || '').toLowerCase().includes(q);
      const cgmMatch = item.cgm ? item.cgm.toLowerCase().includes(q) : false;
      const cpfMatch = item.cpf ? item.cpf.toLowerCase().includes(q) : false;
      const compMatch = item.componente ? item.componente.toLowerCase().includes(q) : false;
      const turmaMatch = item.turma ? item.turma.toLowerCase().includes(q) : false;

      return nomeMatch || emailMatch || nreMatch || cgmMatch || cpfMatch || compMatch || turmaMatch;
    }).slice(0, 50); // Limite de 50 para máxima performance
  }, [termo, filtroTipo, listaCursistasFormatados, listaFormadores, listaTutoresFormatados]);

  if (!isOpen) return null;

  return (
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
        borderRadius: '14px',
        width: '100%',
        maxWidth: '850px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
        overflow: 'hidden'
      }}>
        {/* Cabeçalho de Busca */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #e2e8f0',
          background: 'linear-gradient(135deg, #002b7f 0%, #001f5c 100%)',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🔍 Busca Global de Dados: Cursistas, Formadores & Tutores
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', opacity: 0.85 }}>
              Pesquise instantaneamente por Nome, CGM, CPF, E-mail @escola, NRE ou Componente
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.4rem', cursor: 'pointer', opacity: 0.8 }}
          >
            ✕
          </button>
        </div>

        {/* Input de Pesquisa e Filtros */}
        <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <input
              type="text"
              autoFocus
              placeholder="Digite o nome, CGM, CPF, e-mail institucional @escola, NRE..."
              value={termo}
              onChange={e => setTermo(e.target.value)}
              style={{
                flex: 1,
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                border: '2px solid #cbd5e1',
                fontSize: '0.95rem',
                outline: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
            />
            {termo && (
              <button
                onClick={() => setTermo('')}
                style={{
                  padding: '0.5rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.8rem'
                }}
              >
                Limpar
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Filtrar por papel:</span>
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'cursistas', label: '👥 Cursistas' },
              { id: 'formadores', label: '🎓 Formadores' },
              { id: 'tutores', label: '🤝 Tutores' },
            ].map(b => (
              <button
                key={b.id}
                onClick={() => setFiltroTipo(b.id)}
                style={{
                  padding: '0.25rem 0.65rem',
                  borderRadius: '20px',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: filtroTipo === b.id ? '#002b7f' : '#e2e8f0',
                  color: filtroTipo === b.id ? 'white' : '#475569'
                }}
              >
                {b.label}
              </button>
            ))}
            {termo && (
              <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#64748b' }}>
                {resultados.length} resultado(s)
              </span>
            )}
          </div>
        </div>

        {/* Resultados da Busca */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem', maxHeight: '55vh' }}>
          {!termo.trim() ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⌨️</div>
              <p style={{ margin: 0, fontWeight: 600 }}>Comece a digitar para pesquisar qualquer pessoa do Estágio Probatório.</p>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem' }}>Ex: "Luciane", "89044553", "Londrina", "Matemática", "ana.silva"</p>
            </div>
          ) : resultados.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔍</div>
              <h4 style={{ margin: 0, color: '#1e293b' }}>Nenhum resultado encontrado</h4>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>Tente outro termo ou limpe os filtros de categoria.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {resultados.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.9rem 1.1rem',
                    backgroundColor: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                      <span style={{
                        backgroundColor: item.tipo === 'cursista' ? '#e0f2fe' : item.tipo === 'formador' ? '#f0fdf4' : '#fef3c7',
                        color: item.tipo === 'cursista' ? '#0369a1' : item.tipo === 'formador' ? '#15803d' : '#b45309',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        textTransform: 'uppercase'
                      }}>
                        {item.tipo}
                      </span>
                      <strong style={{ color: '#0f172a', fontSize: '0.98rem' }}>{item.nome}</strong>
                      {item.cgm && (
                        <span style={{ fontSize: '0.75rem', color: '#64748b', backgroundColor: '#f1f5f9', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                          CGM: {item.cgm}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.82rem', color: '#475569', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <span>✉️ {item.email}</span>
                      {item.nre && <span>🏛️ NRE: {item.nre}</span>}
                      {item.componente && <span>📚 {item.componente}</span>}
                      {item.turma && <span>🏫 Turma: {item.turma}</span>}
                      {item.tipo === 'formador' && <span>👥 {item.totalCursistas} Cursista(s) vinculados</span>}
                      {item.tipo === 'tutor' && item.telefone && <span>📞 {item.telefone}</span>}
                    </div>

                    {item.tipo === 'cursista' && (item.nome_formador || item.tutor_responsavel) && (
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
                        {item.nome_formador && <span>Formador(a): <b>{item.nome_formador}</b></span>}
                        {item.tutor_responsavel && <span style={{ marginLeft: '0.75rem' }}>Tutor(a): <b>{item.tutor_responsavel}</b></span>}
                      </div>
                    )}
                  </div>

                  {item.tipo === 'cursista' && onAbrirDossie && (
                    <button
                      onClick={() => {
                        onAbrirDossie(item.raw);
                        onClose();
                      }}
                      style={{
                        backgroundColor: '#002b7f',
                        color: 'white',
                        border: 'none',
                        padding: '0.45rem 0.85rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Dossiê 📂
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div style={{ padding: '0.75rem 1.5rem', backgroundColor: '#f1f5f9', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.45rem 1.25rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.85rem'
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
