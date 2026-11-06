/**
 * Utilitário de Cálculo de SLA e Prazos para Solicitações e Movimentações
 * SEED-PR - Estágio Probatório
 * 
 * Regras de Cores por Tempo Decorrido:
 * - Verde: de 0 a 3 dias (Dentro do prazo)
 * - Amarelo: de 4 a 7 dias (Atenção / Intermediário)
 * - Laranja: de 8 a 10 dias (Urgente / Limite)
 * - Vermelho: mais de 10 dias (Crítico / Atrasado)
 */

export function calculateSLA(timestampStr) {
  if (!timestampStr) {
    return {
      days: 0,
      color: '#15803d',
      bg: 'rgba(21, 128, 61, 0.12)',
      border: '#bbf7d0',
      label: '0-3 dias',
      statusText: 'Prazo Normal',
      level: 'verde'
    };
  }

  let requestDate;
  try {
    requestDate = new Date(timestampStr);
    if (isNaN(requestDate.getTime())) {
      // Tenta parse de string no formato brasileiro "DD/MM/YYYY HH:mm"
      const parts = String(timestampStr).split(/[\s,/:]+/);
      if (parts.length >= 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        const hour = parts[3] ? parseInt(parts[3], 10) : 0;
        const min = parts[4] ? parseInt(parts[4], 10) : 0;
        requestDate = new Date(year, month, day, hour, min);
      } else {
        requestDate = new Date();
      }
    }
  } catch (e) {
    requestDate = new Date();
  }

  const now = new Date();
  const diffTime = Math.max(0, now - requestDate);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 3) {
    return {
      days: diffDays,
      color: '#15803d',
      bg: 'rgba(21, 128, 61, 0.12)',
      border: '#bbf7d0',
      label: `${diffDays}d • 0-3 dias`,
      statusText: 'Prazo Normal',
      level: 'verde'
    };
  } else if (diffDays <= 7) {
    return {
      days: diffDays,
      color: '#b45309',
      bg: 'rgba(245, 158, 11, 0.15)',
      border: '#fde68a',
      label: `${diffDays}d • 4-7 dias`,
      statusText: 'Atenção',
      level: 'amarelo'
    };
  } else if (diffDays <= 10) {
    return {
      days: diffDays,
      color: '#c2410c',
      bg: 'rgba(249, 115, 22, 0.18)',
      border: '#ffedd5',
      label: `${diffDays}d • 8-10 dias`,
      statusText: 'Urgente',
      level: 'laranja'
    };
  } else {
    return {
      days: diffDays,
      color: '#b91c1c',
      bg: 'rgba(220, 38, 38, 0.18)',
      border: '#fecaca',
      label: `${diffDays}d • >10 dias`,
      statusText: 'Crítico / Atrasado',
      level: 'vermelho'
    };
  }
}
