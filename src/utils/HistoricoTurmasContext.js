import { createContext, useContext } from 'react';

/**
 * Disponibiliza as movimentações e a permissão de visualização do histórico
 * de turmas (apenas perfis Admin e Técnico) para o Dossiê do Cursista,
 * evitando propagar props por todos os componentes que o abrem.
 */
export const HistoricoTurmasContext = createContext({
  movimentacoes: [],
  canView: false,
});

export const useHistoricoTurmas = () => useContext(HistoricoTurmasContext);
