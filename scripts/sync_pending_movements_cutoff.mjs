import 'dotenv/config';
import mysql from 'mysql2/promise';

const DB_URL = process.env.DATABASE_URL;

const PENDING_RECORDS = [
  {
    ext_id: 'MOV_TT_7771006838_1143',
    registrado_em: '2026-11-03 10:16:30',
    nome: 'NATANI DE ARAUJO BELIATTO',
    email: 'natani.beliatto@escola.pr.gov.br',
    cpf: '05199345982',
    cgm: '7771006838',
    tipo_acao: 'Troca de Turma',
    turma_anterior: 'A Definir',
    turma_nova: '',
    motivo: 'Incompatibilidade com o horário na escola.',
    justificativa: 'Ciências | 08:00-09:40 -> Pretendido: 13:30-15:10'
  },
  {
    ext_id: 'MOV_TT_7770515070_1144',
    registrado_em: '2026-11-04 13:07:12',
    nome: 'WILLIAN JOSÉ SCHEDERSKI',
    email: 'willian.schederski@escola.pr.gov.br',
    cpf: '09343322909',
    cgm: '7770515070',
    tipo_acao: 'Troca de Turma',
    turma_anterior: 'A Definir',
    turma_nova: '',
    motivo: 'Retorno para turma do Prof. Joelson Emerenciano',
    justificativa: 'Matemática | 10:00-11:40'
  },
  {
    ext_id: 'MOV_TT_7770987614_1145',
    registrado_em: '2026-11-04 17:51:21',
    nome: 'VARLEI PEREIRA DA LUZ',
    email: 'varlei.luz@escola.pr.gov.br',
    cpf: '03591678961',
    cgm: '7770987614',
    tipo_acao: 'Troca de Turma',
    turma_anterior: 'A Definir',
    turma_nova: '',
    motivo: 'Falta apenas uma implementação, gostaria de encerrar com minha turma.',
    justificativa: 'Física | 18:10-19:50'
  },
  {
    ext_id: 'MOV_TT_7770183493_1146',
    registrado_em: '2026-11-04 19:30:10',
    nome: 'ALEXANDRE PEREIRA DA SILVA NETO',
    email: 'alexandre.silva.neto@escola.pr.gov.br',
    cpf: '01714966984',
    cgm: '7770183493',
    tipo_acao: 'Troca de Turma',
    turma_anterior: 'A Definir',
    turma_nova: '',
    motivo: 'Incompatibilidade com o horário na escola.',
    justificativa: 'Geografia | 18:10-19:50 -> Pretendido: 15:30-17:10'
  },
  {
    ext_id: 'MOV_TT_7770229469_1147',
    registrado_em: '2026-11-04 22:07:19',
    nome: 'JENNIFFER FORBECK DOS SANTOS',
    email: 'jenniffer.santos@escola.pr.gov.br',
    cpf: '05431460900',
    cgm: '7770229469',
    tipo_acao: 'Troca de Turma',
    turma_anterior: 'A Definir',
    turma_nova: '',
    motivo: 'Fui remanejada essa semana, porém quero permanecer em minha turma.',
    justificativa: 'LEM Inglês | 13:30-15:10'
  },
  {
    ext_id: 'MOV_TT_7771190205_1148',
    registrado_em: '2026-11-05 15:27:16',
    nome: 'ISABELLE FERNANDES ORLANDI',
    email: 'isabelle.orlandi@escola.pr.gov.br',
    cpf: '38359845867',
    cgm: '7771190205',
    tipo_acao: 'Troca de Turma',
    turma_anterior: 'A Definir',
    turma_nova: '',
    motivo: 'Formador de área diversa (Artes vs Língua Portuguesa)',
    justificativa: 'Língua Portuguesa | 15:30-17:10'
  },
  {
    ext_id: 'MOV_TT_7771144440_1149',
    registrado_em: '2026-11-05 16:49:32',
    nome: 'PEDRO CARVALHO FERRAZ',
    email: 'pedro.ferraz@escola.pr.gov.br',
    cpf: '86151656539',
    cgm: '7771144440',
    tipo_acao: 'Troca de Turma',
    turma_anterior: 'A Definir',
    turma_nova: '',
    motivo: 'Retorno para turma da Prof. Solange (Literatura)',
    justificativa: 'Língua Portuguesa | 15:30-17:10'
  },
  {
    ext_id: 'MOV_TT_7770159924_1150',
    registrado_em: '2026-11-06 15:58:39',
    nome: 'Simone Nicoletti',
    email: 'simone.nicoletti@escola.pr.gov.br',
    cpf: '70282617949',
    cgm: '7770159924',
    tipo_acao: 'Troca de Turma',
    turma_anterior: 'A Definir',
    turma_nova: '',
    motivo: 'Retorno para Turma L de Arte',
    justificativa: 'Artes | 15:30-17:10'
  }
];

async function main() {
  const conn = await mysql.createConnection({ uri: DB_URL, ssl: { rejectUnauthorized: true } });
  console.log('Connected to TiDB Cloud!');

  // 1. Marca todas as movimentações anteriores a 2026-11-03 como 'Resolvido'
  const [resUpdate] = await conn.query(
    `UPDATE movimentacao SET status = 'Resolvido', nota_resolucao = 'Concluído em ciclo anterior a 03/11/2026' WHERE registrado_em < '2026-11-03' AND (status = 'Pendente' OR status IS NULL OR status = 'Em Análise')`
  );
  console.log('Old pending movements resolved:', resUpdate.affectedRows);

  // 2. Insere ou atualiza as 8 novas solicitações a partir de 03/11/2026
  for (const item of PENDING_RECORDS) {
    // Busca se usuário já existe por email ou cgm
    const [uRows] = await conn.query(
      `SELECT u.id, u.nome, u.cgm_ultimos3, v.id as vinculo_id, v.linha_funcional, t.codigo as turma_atual
       FROM usuario u
       LEFT JOIN vinculo v ON v.usuario_id = u.id AND v.linha_funcional = 1
       LEFT JOIN matricula m ON m.vinculo_id = v.id AND m.na_base_ativa = 1
       LEFT JOIN turma t ON t.id = m.turma_id
       WHERE u.email_inst = ? OR u.cgm_ultimos3 = ? LIMIT 1`,
      [item.email, item.cgm.slice(-3)]
    );

    let usuarioId = null;
    let matriculaId = null;
    let turmaAnterior = item.turma_anterior;

    if (uRows.length > 0) {
      usuarioId = uRows[0].id;
      if (uRows[0].turma_atual) {
        turmaAnterior = uRows[0].turma_atual;
      }
    }

    const [exists] = await conn.query('SELECT id FROM movimentacao WHERE ext_id = ?', [item.ext_id]);
    if (exists.length > 0) {
      await conn.query(
        `UPDATE movimentacao SET 
          registrado_em = ?, turma_anterior = ?, motivo = ?, justificativa = ?, status = 'Pendente', solicitado_por_nome = ?
         WHERE ext_id = ?`,
        [item.registrado_em, turmaAnterior, item.motivo, item.justificativa, item.nome, item.ext_id]
      );
      console.log('Updated existing:', item.ext_id);
    } else {
      await conn.query(
        `INSERT INTO movimentacao (
          ext_id, registrado_em, usuario_id, matricula_id, turma_anterior, turma_nova, tipo_acao, motivo, justificativa, status, solicitado_por_nome
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendente', ?)`,
        [item.ext_id, item.registrado_em, usuarioId, matriculaId, turmaAnterior, item.turma_nova, item.tipo_acao, item.motivo, item.justificativa, item.nome]
      );
      console.log('Inserted new pending movement:', item.ext_id);
    }
  }

  // Verifica as pendências atuais no TiDB
  const [pend] = await conn.query(
    `SELECT ext_id, registrado_em, status, solicitado_por_nome, turma_anterior, motivo 
     FROM movimentacao 
     WHERE registrado_em >= '2026-11-03' AND status = 'Pendente'
     ORDER BY registrado_em ASC`
  );
  console.log('\n--- ATUALMENTE PENDENTES (>= 03/11/2026) NO TIDB: ---');
  console.table(pend);

  await conn.end();
}

main().catch(console.error);
