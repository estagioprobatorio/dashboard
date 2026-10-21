import React, { useState, useEffect } from 'react';
import { supabase, isConfigured as isSupabaseConfigured } from '../supabase';

export default function IntencaoMatricula2027({ cursista, records = [], userEmail }) {
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [registroExistente, setRegistroExistente] = useState(null);

  // Vínculos disponíveis caso tenha 2 padrões
  const vinculosCursista = records.filter(r => {
    const em = (r['e-mail'] || r.email || r.email_cursista || '').trim().toLowerCase();
    const cgm = String(r.cgm || '').trim();
    const curEm = (userEmail || cursista?.['e-mail'] || cursista?.email || '').trim().toLowerCase();
    const curCgm = String(cursista?.cgm || '').trim();
    return (em && em === curEm) || (cgm && curCgm && cgm === curCgm);
  });

  const [form, setForm] = useState({
    vinculoSelecionado: cursista?.turmas || cursista?.turma || '',
    componente: cursista?.componente || cursista?.componente_conc || 'Geral',
    turnoPretendido: 'Noite',
    diasSemana: ['Segunda-feira', 'Quarta-feira'],
    horarioInicio: '19:00',
    horarioFim: '22:30',
    modalidadePretendida: 'Online Síncrono (Google Meet)',
    poloPretendido: cursista?.municipio || cursista?.nre || '',
    observacoes: ''
  });

  // Carrega registro anterior se já houver
  useEffect(() => {
    const carregarRegistro = async () => {
      const email = (userEmail || cursista?.email || cursista?.['e-mail'] || '').trim().toLowerCase();
      if (!email) return;

      // 1. Tenta Supabase
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('intencao_matricula_2027')
            .select('*')
            .eq('email_cursista', email)
            .order('created_at', { ascending: false })
            .limit(1);

          if (!error && data && data.length > 0) {
            setRegistroExistente(data[0]);
            setForm({
              vinculoSelecionado: data[0].turma_atual || '',
              componente: data[0].componente || '',
              turnoPretendido: data[0].turno_pretendido || 'Noite',
              diasSemana: data[0].dias_semana || ['Segunda-feira'],
              horarioInicio: data[0].horario_inicio || '19:00',
              horarioFim: data[0].horario_fim || '22:30',
              modalidadePretendida: data[0].modalidade || 'Online Síncrono (Google Meet)',
              poloPretendido: data[0].polo || '',
              observacoes: data[0].observacoes || ''
            });
            return;
          }
        } catch (e) {
          console.warn('Erro ao consultar Supabase intencao_matricula:', e);
        }
      }

      // 2. Fallback localStorage
      try {
        const local = localStorage.getItem(`intencao_2027_${email}`);
        if (local) {
          const parsed = JSON.parse(local);
          setRegistroExistente(parsed);
          setForm(parsed);
        }
      } catch (e) {
        console.error(e);
      }
    };

    carregarRegistro();
  }, [userEmail, cursista]);

  const handleToggleDia = (dia) => {
    setForm(prev => {
      const exists = prev.diasSemana.includes(dia);
      return {
        ...prev,
        diasSemana: exists ? prev.diasSemana.filter(d => d !== dia) : [...prev.diasSemana, dia]
      };
    });
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setSucesso(false);

    const email = (userEmail || cursista?.email || cursista?.['e-mail'] || '').trim().toLowerCase();

    const dadosRegistro = {
      ...form,
      id: `intencao-${Date.now()}`,
      nome_cursista: cursista?.nome_cursista || 'Docente Cursista',
      email_cursista: email,
      cgm_cursista: cursista?.cgm || '',
      cpf_cursista: cursista?.cpf || '',
      nre: cursista?.nre || '',
      municipio: cursista?.municipio || cursista?.munic_exe || '',
      created_at: new Date().toISOString()
    };

    // 1. Salva no Supabase se disponível
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('intencao_matricula_2027')
          .insert([dadosRegistro]);
      } catch (err) {
        console.warn('Erro ao salvar no Supabase (usando fallback local):', err);
      }
    }

    // 2. Salva no LocalStorage
    try {
      localStorage.setItem(`intencao_2027_${email}`, JSON.stringify(dadosRegistro));
    } catch (err) {
      console.error(err);
    }

    setRegistroExistente(dadosRegistro);
    setSalvando(false);
    setSucesso(true);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem' }} className="page-transition-enter">
      
      {/* Banner Superior */}
      <div style={{
        background: 'linear-gradient(135deg, #002b7f 0%, #007a33 100%)',
        color: 'white',
        padding: '1.75rem',
        borderRadius: '14px',
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
            fontSize: '0.72rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            background: 'rgba(255,255,255,0.2)',
            padding: '0.2rem 0.6rem',
            borderRadius: '4px',
            fontWeight: 800
          }}>
            Planejamento Formativo SEED-PR
          </span>
          <h2 style={{ margin: '0.4rem 0 0.2rem 0', fontSize: '1.5rem', fontWeight: 800 }}>
            📅 Intenção de Matrícula & Disponibilidade 2027
          </h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.88rem' }}>
            Indique sua disponibilidade de horários e preferências para os encontros de formação continuada do próximo ano letivo.
          </p>
        </div>

        {registroExistente && (
          <div style={{
            backgroundColor: '#dcfce7',
            color: '#15803d',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            fontWeight: 800,
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
          }}>
            <span>✓</span> Intenção Registrada para 2027
          </div>
        )}
      </div>

      {/* Alerta de Confirmação */}
      {sucesso && (
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '2px solid #86efac',
          borderRadius: '10px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          color: '#166534',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <span style={{ fontSize: '1.4rem' }}>🎉</span>
          <div>
            <b>Intenção de Matrícula salva com sucesso!</b> Seus horários e disponibilidade para 2027 foram registrados na SEED-PR. Você pode atualizar este formulário a qualquer momento antes do fechamento do período.
          </div>
        </div>
      )}

      {/* Formulário Principal */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        padding: '1.75rem',
        border: '1px solid #cbd5e1',
        boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
      }}>
        <form onSubmit={handleSalvar} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Dados do Cursista */}
          <div style={{ backgroundColor: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'block' }}>PROFESSOR CURSISTA:</span>
              <strong style={{ fontSize: '0.92rem', color: '#002b7f' }}>{cursista?.nome_cursista || 'Não informado'}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'block' }}>CGM:</span>
              <strong style={{ fontSize: '0.92rem', color: '#334155' }}>{cursista?.cgm || '-'}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'block' }}>NRE / MUNICÍPIO:</span>
              <strong style={{ fontSize: '0.92rem', color: '#334155' }}>{cursista?.nre || '-'} ({cursista?.municipio || cursista?.munic_exe || '-'})</strong>
            </div>
          </div>

          {/* Seletor de Vínculo se tiver 2 padrões */}
          {vinculosCursista.length > 1 && (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.35rem' }}>
                Selecione o Vínculo / Padrão Formativo para 2027:
              </label>
              <select
                value={form.vinculoSelecionado}
                onChange={e => setForm({ ...form, vinculoSelecionado: e.target.value })}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: '#f8fafc' }}
              >
                {vinculosCursista.map((v, i) => (
                  <option key={i} value={v.turmas || v.turma}>
                    Padrão {i + 1}: {v.componente || 'Geral'} — {v.turmas || 'Turma Atual'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Turno Pretendido */}
          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>
              ⏰ Turno de Preferência para os Encontros em 2027:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              {[
                { id: 'Manhã', label: 'Manhã', desc: '07:30 às 11:50' },
                { id: 'Tarde', label: 'Tarde', desc: '13:15 às 17:35' },
                { id: 'Noite', label: 'Noite', desc: '18:45 às 22:45' },
                { id: 'Sábado Manhã', label: 'Sábado (Manhã)', desc: '08:00 às 12:00' }
              ].map(t => (
                <div
                  key={t.id}
                  onClick={() => setForm({ ...form, turnoPretendido: t.id })}
                  style={{
                    border: form.turnoPretendido === t.id ? '2px solid #002b7f' : '1px solid #cbd5e1',
                    backgroundColor: form.turnoPretendido === t.id ? '#eff6ff' : '#ffffff',
                    padding: '0.85rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ fontWeight: 800, color: form.turnoPretendido === t.id ? '#002b7f' : '#334155', fontSize: '0.95rem' }}>
                    {t.label}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
                    {t.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Horário Específico de Disponibilidade */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                Horário Inicial Disponível:
              </label>
              <input
                type="time"
                value={form.horarioInicio}
                onChange={e => setForm({ ...form, horarioInicio: e.target.value })}
                style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                Horário Final Limite:
              </label>
              <input
                type="time"
                value={form.horarioFim}
                onChange={e => setForm({ ...form, horarioFim: e.target.value })}
                style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          {/* Dias da Semana com Disponibilidade */}
          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>
              🗓️ Dias da Semana com Disponibilidade para Participação:
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'].map(dia => {
                const ativo = form.diasSemana.includes(dia);
                return (
                  <button
                    key={dia}
                    type="button"
                    onClick={() => handleToggleDia(dia)}
                    style={{
                      padding: '0.45rem 0.9rem',
                      borderRadius: '20px',
                      border: ativo ? '2px solid #007a33' : '1px solid #cbd5e1',
                      backgroundColor: ativo ? '#dcfce7' : '#ffffff',
                      color: ativo ? '#15803d' : '#475569',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    {ativo ? '✓ ' : '+ '} {dia}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modalidade */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
              Modalidade Pretendida:
            </label>
            <select
              value={form.modalidadePretendida}
              onChange={e => setForm({ ...form, modalidadePretendida: e.target.value })}
              style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
            >
              <option value="Online Síncrono (Google Meet)">Online Síncrono (Google Meet / Aulas Remotas)</option>
              <option value="Presencial no Polo / Município">Presencial no Polo / Município de Exercício</option>
              <option value="Híbrido (Encontros Virtuais + Presenciais)">Híbrido (Encontros Virtuais + Presenciais)</option>
            </select>
          </div>

          {/* Observações / Justificativas */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
              Observações ou Justificativa de Horário (Aulas em Escola, Distribuição de Aulas):
            </label>
            <textarea
              rows={3}
              placeholder="Ex: Leciono no período da manhã no Colégio Estadual... portando solicito turma formativa no período noturno às quartas-feiras."
              value={form.observacoes}
              onChange={e => setForm({ ...form, observacoes: e.target.value })}
              style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontFamily: 'inherit' }}
            />
          </div>

          {/* Botão de Submissão */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button
              type="submit"
              disabled={salvando}
              style={{
                backgroundColor: '#007a33',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.75rem',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 10px rgba(0, 122, 51, 0.25)'
              }}
            >
              {salvando ? 'Salvando Disponibilidade...' : '💾 Salvar Intenção de Matrícula 2027'}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
}
