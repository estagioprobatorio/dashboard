/**
 * ADAPTADOR DE TRANSIÇÃO E COMPATIBILIDADE - TiDB SERVERLESS
 * SEED-PR - Estágio Probatório
 * -----------------------------------------------------------
 * Este módulo provê uma interface 100% compatível com a sintaxe Supabase (.from().insert(), .upsert(), .delete())
 * redirecionando as operações de escrita e leitura de forma transparente para o TiDB Cloud (/api/tidb).
 */

import { tidbService } from './services/tidbService';

function createQueryBuilder(table) {
  let _action = 'select';
  let _data = null;
  let _filters = {};

  const builder = {
    select: (fields = '*') => {
      _action = 'select';
      return builder;
    },
    insert: (records) => {
      _action = 'insert';
      _data = Array.isArray(records) ? records[0] : records;
      return builder;
    },
    upsert: (record, options) => {
      _action = 'upsert';
      _data = record;
      return builder;
    },
    update: (updates) => {
      _action = 'update';
      _data = updates;
      return builder;
    },
    delete: () => {
      _action = 'delete';
      return builder;
    },
    eq: (column, value) => {
      _filters[column] = value;
      return builder;
    },
    order: () => builder,
    limit: () => builder,
    then: async (resolve, reject) => {
      try {
        let result = { data: null, error: null };
        if (table === 'observacoes_pratica' && (_action === 'insert' || _action === 'upsert')) {
          const ok = await tidbService.salvarObservacao(_data);
          result = { data: ok ? [_data] : null, error: ok ? null : new Error('Falha ao salvar no TiDB') };
        } else if (table === 'cursistas') {
          if (_action === 'upsert' || _action === 'insert' || _action === 'update') {
            const ok = await tidbService.atualizarCursista(_data);
            result = { data: ok ? [_data] : null, error: ok ? null : new Error('Falha ao atualizar cursista no TiDB') };
          } else if (_action === 'delete') {
            const ok = await tidbService.deletarCursista(_filters);
            result = { data: ok ? true : null, error: ok ? null : new Error('Falha ao deletar cursista no TiDB') };
          }
        } else if (table === 'movimentacoes') {
          if (_action === 'insert' || _action === 'upsert') {
            const ok = await tidbService.salvarMovimentacao(_data);
            result = { data: ok ? [_data] : null, error: ok ? null : new Error('Falha ao registrar movimentação no TiDB') };
          } else if (_action === 'update') {
            const ok = await tidbService.atualizarStatusMovimentacao(_filters.id, _data?.status, _data?.nota_resolucao);
            result = { data: ok ? [_data] : null, error: ok ? null : new Error('Falha ao atualizar movimentação no TiDB') };
          } else if (_action === 'delete') {
            result = { data: true, error: null };
          }
        } else if (table === 'diario_formativo' && (_action === 'insert' || _action === 'upsert')) {
          const ok = await tidbService.salvarDiario(_data);
          result = { data: ok ? [_data] : null, error: ok ? null : new Error('Falha ao salvar diário no TiDB') };
        } else if (table === 'intencao_matricula_2027' && (_action === 'insert' || _action === 'upsert')) {
          const ok = await tidbService.salvarIntencao2027(_data);
          result = { data: ok ? [_data] : null, error: ok ? null : new Error('Falha ao salvar intenção no TiDB') };
        }
        resolve(result);
      } catch (err) {
        resolve({ data: null, error: err });
      }
    }
  };

  return builder;
}

export const isConfigured = true;
export const supabase = {
  from: (table) => createQueryBuilder(table),
  channel: () => ({
    on: () => ({
      subscribe: () => ({})
    })
  }),
  removeChannel: () => {}
};
export const supabaseUrl = 'https://tidb.cloud';
export const supabaseAnonKey = 'tidb-serverless-managed';
