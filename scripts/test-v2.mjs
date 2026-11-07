/**
 * Teste ponta a ponta LOCAL da API v2 com dados SINTÉTICOS (sem dados reais).
 * Pré-requisitos: banco local no ar, `npm run dev:api` rodando, .env.local com DEV_AUTH=1.
 * Uso: npm run test:v2
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const BASE = process.env.API_BASE || 'http://127.0.0.1:3001/api/v2';
const SYNC = process.env.SYNC_TOKEN;
let falhas = 0;

const ok = (cond, msg) => { console.log(`${cond ? '✔' : '✘'} ${msg}`); if (!cond) falhas++; };

async function call(action, body = {}, { token, sync } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (sync) headers['x-sync-token'] = sync;
  const r = await fetch(`${BASE}?action=${action}`, { method: 'POST', headers, body: JSON.stringify({ action, ...body }) });
  let j = {}; try { j = await r.json(); } catch {}
  return { status: r.status, body: j };
}
const dev = (email) => `dev:${email}`;

const A = 'super.teste@escola.pr.gov.br';
const ADM = 'admin.teste@escola.pr.gov.br';

// --- bootstrap de contas de equipe (somente teste) ---
const { default: mysql } = await import('mysql2/promise');
const u = new URL(process.env.DATABASE_URL);
const db = await mysql.createConnection({ host: u.hostname, port: Number(u.port), user: decodeURIComponent(u.username), password: decodeURIComponent(u.password), database: u.pathname.slice(1) });

// Limpa dados de testes anteriores para teste limpo e determinístico
await db.query("SET FOREIGN_KEY_CHECKS = 0");
await db.query("DELETE FROM auditoria");
await db.query("DELETE FROM diario_registro");
await db.query("DELETE FROM intencao_matricula");
await db.query("DELETE FROM movimentacao");
await db.query("DELETE FROM observacao_pratica");
await db.query("DELETE FROM observacao_tutor");
await db.query("DELETE FROM matricula_status_hist");
await db.query("DELETE FROM matricula");
await db.query("DELETE FROM turma");
await db.query("DELETE FROM vinculo");
await db.query("DELETE FROM usuario");
await db.query("SET FOREIGN_KEY_CHECKS = 1");

for (const [e, f] of [[A, 'superadmin'], [ADM, 'admin']]) {
  await db.query("INSERT INTO usuario (email_inst, nome, funcao) VALUES (?,?,?) ON DUPLICATE KEY UPDATE funcao = VALUES(funcao)", [e, e.split('@')[0], f]);
}

console.log('\n# 1. Segurança básica');
ok((await call('bundle')).status === 401, 'sem token -> 401');
ok((await call('bundle', {}, { token: dev('ninguem@gmail.com') })).status === 403, 'e-mail não institucional -> 403');
ok((await call('bundle', {}, { token: dev('desconhecido@escola.pr.gov.br') })).status === 403, '@escola não cadastrado NÃO vira admin -> 403');
ok((await call('sync_cursistas_bulk', { cursistas: [{ cgm: '1' }] }, { sync: 'errado' })).status === 401, 'sync com token errado -> 401');

console.log('\n# 2. Carga das planilhas (payloads no formato do Apps Script)');
const cursistas = [
  { cgm: '1000123', nome_cursista: 'ANA TESTE', email: 'ana.teste@escola.pr.gov.br', cpf_cursista: '11122233344', turmas: 'T-MAT-01', componente: 'Matemática', modalidade: 'Presencial', turno: 'Noite', ano_formativo: '1º ANO', chamamento: '1º Chamamento', nome_formador: 'FORMADOR UM', email_formador: 'formador.um@escola.pr.gov.br', tutor_responsavel: 'TUTORA UM', email_tutor: 'tutora.um@escola.pr.gov.br', nre_tutor: 'NRE Curitiba', email_nre: 'nre.cwb@escola.pr.gov.br', nre_exe: 'NRE Curitiba', munic_exe: 'Curitiba' },
  // mesma pessoa, 2ª linha funcional (MESMO CGM, turma e LF diferentes)
  { cgm: '1000123', nome_cursista: 'ANA TESTE', email: 'ana.teste@escola.pr.gov.br', turmas: 'T-POR-02', componente: 'Língua Portuguesa', modalidade: 'Presencial', turno: 'Tarde', ano_formativo: '1º ANO', chamamento: '1º Chamamento', nome_formador: 'FORMADOR DOIS', email_formador: 'formador.dois@escola.pr.gov.br', tutor_responsavel: 'TUTORA DOIS', email_tutor: 'tutora.dois@escola.pr.gov.br', nre_tutor: 'NRE Londrina', nre_exe: 'NRE Londrina', munic_exe: 'Londrina' },
  { cgm: '3000789', nome_cursista: 'BRUNO TESTE', email: 'bruno.teste@escola.pr.gov.br', turmas: 'T-MAT-01', componente: 'Matemática', modalidade: 'Presencial', turno: 'Noite', ano_formativo: '1º ANO', chamamento: '1º Chamamento', nome_formador: 'FORMADOR UM', email_formador: 'formador.um@escola.pr.gov.br', tutor_responsavel: 'TUTORA UM', email_tutor: 'tutora.um@escola.pr.gov.br', nre_tutor: 'NRE Curitiba', nre_exe: 'NRE Curitiba', munic_exe: 'Pinhais' },
  { cgm: '4000111', nome_cursista: 'CARLA TESTE', email: 'carla.teste@escola.pr.gov.br', turmas: 'T-POR-02', componente: 'Língua Portuguesa', turno: 'Tarde', ano_formativo: '1º ANO', chamamento: '1º Chamamento', nome_formador: 'FORMADOR DOIS', email_formador: 'formador.dois@escola.pr.gov.br', tutor_responsavel: 'TUTORA DOIS', email_tutor: 'tutora.dois@escola.pr.gov.br', nre_tutor: 'NRE Londrina', nre_exe: 'NRE Londrina' }
];
const run = `teste-${Date.now()}`;
let r = await call('sync_cursistas_bulk', { cursistas, run_id: run, final: true }, { sync: SYNC });
ok(r.status === 200 && r.body.sincronizados === 4, `cursistas sincronizados = ${r.body.sincronizados}`);
r = await call('sync_cursistas_bulk', { cursistas, run_id: run + 'b', final: true }, { sync: SYNC });
ok(r.status === 200, 'reexecução idempotente (upsert, sem duplicar)');
r = await call('sync_tutores_bulk', { tutores: [{ tutor_responsavel: 'TUTORA UM', email_educ: 'tutora.um@escola.pr.gov.br', email_adm: 'tutora.um.adm@escola.pr.gov.br', telefone: '41999990000', nre_tutor: 'NRE Curitiba', email_nre: 'nre.cwb@escola.pr.gov.br' }] }, { sync: SYNC });
ok(r.status === 200, 'tutores sincronizados');
r = await call('sync_concluintes_bulk', { concluintes: [{ cgm: '3000789', nome_cursista: 'BRUNO TESTE', email: 'bruno.teste@escola.pr.gov.br', componente: 'Matemática', turmas: 'T-MAT-01', data_conclusao: '15/10/2026' }] }, { sync: SYNC });
ok(r.status === 200 && r.body.sincronizados === 1, 'concluinte aplicado');
r = await call('sync_exonerados_bulk', { exonerados: [{ cgm: '5000222', nome_cursista: 'DIOGO TESTE', email: 'diogo.teste@escola.pr.gov.br', portaria: '123/2026', data_exoneracao: '01/09/2026', status: 'Exonerado', nre: 'NRE Maringá' }] }, { sync: SYNC });
ok(r.status === 200 && r.body.sincronizados === 1, 'exonerado fora da base ativa criado (usuário + vínculo + matrícula)');
r = await call('sync_nao_concluintes_bulk', { nao_concluintes: [{ nome_cursista: 'SEM CGM', email: 'semcgm.teste@escola.pr.gov.br', motivo: 'x' }] }, { sync: SYNC });
ok(r.status === 200 && r.body.sincronizados === 0 && Object.keys(r.body.rejeitados || {}).length > 0, 'não concluinte sem CGM é rejeitado e reportado (não vira lixo)');
r = await call('sync_movimentacoes_bulk', { movimentacoes: [{ timestamp: '10/10/2026 10:00:00', email: 'carla.teste@escola.pr.gov.br', nome_cursista: 'CARLA TESTE', turma_anterior: 'T-POR-02', turma_nova: 'T-MAT-01', tipo_acao: 'Troca de Turma', motivo: 'horário' }] }, { sync: SYNC });
ok(r.status === 200, 'movimentação sincronizada');
await call('sync_movimentacoes_bulk', { movimentacoes: [{ timestamp: '10/10/2026 10:00:00', email: 'carla.teste@escola.pr.gov.br', nome_cursista: 'CARLA TESTE', turma_anterior: 'T-POR-02', turma_nova: 'T-MAT-01', tipo_acao: 'Troca de Turma', motivo: 'horário' }] }, { sync: SYNC });
r = await call('sync_observacoes_bulk', { observacoes: [{ carimbo: '01/10/2026 09:00:00', email_cursista: 'ana.teste@escola.pr.gov.br', nome_cursista: 'ANA TESTE', email_formador: 'formador.um@escola.pr.gov.br', nome_formador: 'FORMADOR UM', componente: 'Matemática', tema: 'Frações', data_observacao: '02/10/2026' }] }, { sync: SYNC });
ok(r.status === 200 && r.body.sincronizados === 1, 'observação sincronizada');

console.log('\n# 3. Banco: sem CGM em texto aberto, vínculos corretos');
const [vinc] = await db.query('SELECT COUNT(*) n FROM vinculo');
ok(vinc[0].n === 4 + 1, `5 vínculos (Ana com 2 + Bruno + Carla + Diogo) -> ${vinc[0].n}`);
const [ana] = await db.query("SELECT COUNT(*) n FROM vinculo v JOIN usuario u ON u.id=v.usuario_id WHERE u.email_inst='ana.teste@escola.pr.gov.br'");
ok(ana[0].n === 2, 'Ana tem 2 vínculos (duas linhas funcionais)');
const [anaUser] = await db.query("SELECT cgm_hash, cgm_ultimos3 FROM usuario WHERE email_inst='ana.teste@escola.pr.gov.br'");
ok(anaUser.length === 1 && anaUser[0].cgm_ultimos3 === '123', 'Ana tem 1 único CGM na tabela usuario');
const [vazou] = await db.query("SELECT COUNT(*) n FROM usuario WHERE HEX(cgm_cifrado) LIKE '%313030303132330%' OR cgm_hash IN ('1000123','2000456')");
ok(vazou[0].n === 0, 'CGM não aparece em texto aberto no banco');
const [dupMov] = await db.query("SELECT COUNT(*) n FROM movimentacao");
ok(dupMov[0].n === 1, 'movimentação reenviada não duplica (id determinístico)');
const [tur] = await db.query('SELECT COUNT(*) n FROM turma');
ok(tur[0].n === 2, 'turmas deduplicadas (2)');

console.log('\n# 4. Leitura por função (escopo + mascaramento)');
const sup = (await call('bundle', {}, { token: dev(A) })).body;
ok(sup.funcao === 'superadmin' && sup.baseCursistas.length === 4, 'superadmin vê todas as 4 matrículas');
ok(sup.baseCursistas.some(c => c.cgm === '1000123'), 'superadmin recebe CGM decifrado');
const adm = (await call('bundle', {}, { token: dev(ADM) })).body;
ok(adm.baseCursistas.length === 4 && adm.baseCursistas.every(c => String(c.cgm).startsWith('•••••')), 'admin vê tudo, CGM mascarado');
ok(adm.exonerados.length === 1, 'admin vê exonerados');
const tut = (await call('bundle', {}, { token: dev('tutora.um@escola.pr.gov.br') })).body;
ok(tut.funcao === 'tutor' && tut.baseCursistas.length === 2 && tut.baseCursistas.every(c => c.email_tutor === 'tutora.um@escola.pr.gov.br'), 'tutor vê só as turmas dele (2 cursistas)');
ok(tut.exonerados.length === 0, 'tutor não vê exonerados');
const frm = (await call('bundle', {}, { token: dev('formador.dois@escola.pr.gov.br') })).body;
ok(frm.funcao === 'formador' && frm.baseCursistas.length === 2, 'formador vê só a turma dele');
const ana1 = (await call('bundle', {}, { token: dev('ana.teste@escola.pr.gov.br') })).body;
ok(ana1.funcao === 'cursista' && ana1.baseCursistas.length === 2, 'cursista com 2 vínculos vê as 2 matrículas dela');
ok(!ana1.baseCursistas.some(c => c.email === 'bruno.teste@escola.pr.gov.br'), 'cursista não vê colegas');
ok(ana1.baseCursistas.every(c => String(c.cgm).startsWith('•••••')), 'cursista vê CGM mascarado');
ok(ana1.observacoes.length === 1, 'cursista vê a própria observação');
const bruno = (await call('bundle', {}, { token: dev('bruno.teste@escola.pr.gov.br') })).body;
ok(bruno.observacoes.length === 0 && bruno.concluintes.length === 1, 'Bruno: sem observações alheias; aparece como concluinte');

console.log('\n# 5. Escrita e permissões');
r = await call('usuario_upsert', { email: 'novo.admin@escola.pr.gov.br', funcao: 'admin' }, { token: dev(ADM) });
ok(r.status === 403, 'admin NÃO cria outro admin');
r = await call('usuario_upsert', { email: 'novo.tecnico@escola.pr.gov.br', funcao: 'tecnico' }, { token: dev(ADM) });
ok(r.status === 200, 'admin cria técnico');
r = await call('usuario_upsert', { email: 'novo.admin@escola.pr.gov.br', funcao: 'admin' }, { token: dev(A) });
ok(r.status === 200, 'superadmin cria admin');
r = await call('usuario_upsert', { email: A, funcao: 'admin' }, { token: dev(A) });
ok(r.status === 409, 'não rebaixa o último superadmin');
const [anyVinc] = await db.query("SELECT id FROM vinculo LIMIT 1");
const vId = anyVinc[0].id;
r = await call('cgm_revelar', { vinculo_id: vId }, { token: dev(ADM) });
ok(r.status === 403, 'admin NÃO revela CGM');
r = await call('cgm_revelar', { vinculo_id: vId }, { token: dev(A) });
ok(r.status === 200 && /^\d+$/.test(r.body.cgm), 'superadmin revela CGM (auditado)');
r = await call('insert_movimentacao', { data: { email: 'bruno.teste@escola.pr.gov.br', tipo_acao: 'Troca de Turma', turma_anterior: 'T-MAT-01', turma_nova: 'T-POR-02', motivo: 'teste' } }, { token: dev('ana.teste@escola.pr.gov.br') });
ok(r.status === 200, 'cursista cria solicitação');
const [mv] = await db.query("SELECT u.email_inst FROM movimentacao m JOIN usuario u ON u.id=m.usuario_id WHERE m.motivo='teste'");
ok(mv[0] && mv[0].email_inst === 'ana.teste@escola.pr.gov.br', 'identidade do cursista vem do token (não do payload)');
r = await call('update_movimentacao', { id: r.body.id, status: 'Deferido', nota_resolucao: 'ok' }, { token: dev('ana.teste@escola.pr.gov.br') });
ok(r.status === 403, 'cursista NÃO aprova movimentação');
r = await call('update_movimentacao', { id: r.body.id || 1, status: 'Deferido', nota_resolucao: 'ok' }, { token: dev(ADM) });
ok(r.status === 200, 'admin resolve movimentação');
r = await call('insert_diario', { data: { conteudo: 'registro teste', titulo: 'T', email_autor: 'forjado@escola.pr.gov.br' } }, { token: dev('ana.teste@escola.pr.gov.br') });
ok(r.status === 200, 'cursista registra diário');
const [di] = await db.query("SELECT u.email_inst FROM diario_registro d JOIN usuario u ON u.id=d.autor_id WHERE d.titulo='T'");
ok(di[0].email_inst === 'ana.teste@escola.pr.gov.br', 'autor do diário vem do token (anti-falsificação)');
const [au] = await db.query("SELECT COUNT(*) n FROM auditoria WHERE acao='cgm_revelar'");
ok(au[0].n >= 1, 'revelação de CGM registrada na auditoria');

await db.end();
console.log(falhas ? `\n${falhas} verificação(ões) falharam.` : '\nTodas as verificações passaram.');
process.exit(falhas ? 1 : 0);
