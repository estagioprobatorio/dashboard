/**
 * Utilitário para cálculo de tempo em Estágio Probatório
 * Período total: 3 anos (1.095 dias / 156 semanas / 36 meses)
 * Base de contagem: periodo_ini (data de posse/exercício)
 */

export function parsePeriodoIni(periodoIni) {
  if (!periodoIni) return null;
  if (periodoIni instanceof Date) {
    return isNaN(periodoIni.getTime()) ? null : periodoIni;
  }
  const s = String(periodoIni).trim();
  if (!s || s === '-' || s === '—') return null;

  // Formato ISO (YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s.length === 10 ? `${s}T00:00:00` : s);
    return isNaN(d.getTime()) ? null : d;
  }

  // Formato brasileiro (DD/MM/YYYY)
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (m) {
    const dd = String(m[1]).padStart(2, '0');
    const mm = String(m[2]).padStart(2, '0');
    const yyyy = m[3];
    const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function calcularTempoEstagio(periodoIni, diasAfastamento = 0) {
  const dtInicio = parsePeriodoIni(periodoIni);
  if (!dtInicio) return null;

  const TOTAL_DIAS = 1095; // 3 anos x 365 dias
  const TOTAL_SEMANAS = Math.round(TOTAL_DIAS / 7); // 156 semanas
  const TOTAL_MESES = 36; // 36 meses

  const hoje = new Date();
  const afastamento = Number(diasAfastamento || 0);

  // Data de término = Início + 1095 dias + afastamentos
  const dtFim = new Date(dtInicio.getTime() + (TOTAL_DIAS + afastamento) * 24 * 60 * 60 * 1000);

  const diffMs = hoje.getTime() - dtInicio.getTime();
  const diasDecorridosBrutos = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  
  // Desconta afastamento dos dias efetivamente computados
  const diasEfetivos = Math.max(0, diasDecorridosBrutos - afastamento);
  const diasDecorridos = Math.min(TOTAL_DIAS, diasEfetivos);
  const diasRestantes = Math.max(0, TOTAL_DIAS - diasDecorridos);

  const semanasDecorridas = Math.min(TOTAL_SEMANAS, Math.floor(diasDecorridos / 7));
  const semanasRestantes = Math.max(0, Math.ceil(diasRestantes / 7));

  // Cálculo de meses decorridos
  let mesesCalc = (hoje.getFullYear() - dtInicio.getFullYear()) * 12 + (hoje.getMonth() - dtInicio.getMonth());
  if (hoje.getDate() < dtInicio.getDate()) mesesCalc = Math.max(0, mesesCalc - 1);
  const mesesDecorridos = Math.min(TOTAL_MESES, Math.max(0, mesesCalc));
  const mesesRestantes = Math.max(0, TOTAL_MESES - mesesDecorridos);

  const pct = Math.min(100, Math.max(0, Math.round((diasDecorridos / TOTAL_DIAS) * 100)));
  const concluido = diasDecorridos >= TOTAL_DIAS;

  // Fase final: últimos 90 dias
  const faseFinal = !concluido && diasRestantes <= 90;

  return {
    dtInicio,
    dtFim,
    inicioFormatado: dtInicio.toLocaleDateString('pt-BR'),
    fimFormatado: dtFim.toLocaleDateString('pt-BR'),
    diasDecorridos,
    diasRestantes,
    totalDias: TOTAL_DIAS,
    semanasDecorridas,
    semanasRestantes,
    totalSemanas: TOTAL_SEMANAS,
    mesesDecorridos,
    mesesRestantes,
    totalMeses: TOTAL_MESES,
    percentual: pct,
    concluido,
    faseFinal,
    afastamento
  };
}
