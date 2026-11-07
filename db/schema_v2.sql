-- =============================================================================
-- Estágio Probatório SEED/PR - Schema v2 (TiDB Cloud / MySQL 8 / MariaDB 10.6+)
-- Dados carregados por planilhas Google -> Apps Script -> /api/v2 (ingest_*).
-- Regras: e-mail @escola = identidade; 1 função por conta; CGM só para cursista
-- e nunca em texto aberto (cgm_hash = HMAC-SHA256, cgm_cifrado = AES-256-GCM).
-- =============================================================================
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 0. Limpeza: exclui views e tabelas antigas/legadas para recriar o schema limpo
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS v_cursista_turma;

-- Tabelas do Schema v2 (caso já existam de execuções anteriores)
DROP TABLE IF EXISTS auditoria, intencao_matricula, diario_registro, movimentacao,
                     observacao_tutor, observacao_pratica, matricula_status_hist,
                     matricula, turma, componente, ciclo, vinculo, usuario, nre;

-- Tabelas legadas do Schema v1
DROP TABLE IF EXISTS cursistas, concluintes, tutores, exonerados,
                     cursistas_concluintes, cursistas_exonerados,
                     cursistas_nao_concluintes, intencoes_2027, diario_formativo;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- 1. Criação das novas tabelas do Schema v2
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nre (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  nome  VARCHAR(80) NOT NULL UNIQUE,          -- normalizado (caixa alta, sem acento)
  email VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS usuario (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  email_inst    VARCHAR(255) NULL UNIQUE,      -- @escola.pr.gov.br, minúsculas
  email_alt     VARCHAR(255) NULL,             -- ex.: e-mail administrativo do tutor
  nome          VARCHAR(255) NOT NULL,
  funcao        ENUM('superadmin','admin','tecnico','tutor','formador','cursista') NOT NULL,
  firebase_uid  VARCHAR(128) NULL UNIQUE,
  nre_id        INT NULL,
  telefone      VARCHAR(40) NULL,
  cgm_hash      CHAR(64) NULL UNIQUE,          -- HMAC-SHA256(CGM + PEPPER), apenas cursista (1 por pessoa física)
  cgm_cifrado   VARBINARY(255) NULL,           -- AES-256-GCM(CGM), apenas cursista
  cgm_ultimos3  CHAR(3) NULL,                  -- máscara para cursista (•••••123)
  cpf_hash      CHAR(64) NULL,
  cpf_cifrado   VARBINARY(255) NULL,
  rg_cifrado    VARBINARY(255) NULL,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  criado_por    BIGINT NULL,
  criado_em     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultimo_acesso DATETIME NULL,
  INDEX idx_usuario_funcao (funcao, ativo),
  INDEX idx_usuario_nre (nre_id),
  INDEX idx_usuario_nome (nome),
  INDEX idx_usuario_cgm (cgm_hash),
  CONSTRAINT fk_usuario_nre FOREIGN KEY (nre_id) REFERENCES nre(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Linhas funcionais do cursista (1 a 2). Cursista tem 1 único CGM e pode ter 2 linhas funcionais/padrões.
CREATE TABLE IF NOT EXISTS vinculo (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  usuario_id      BIGINT NOT NULL,
  linha_funcional TINYINT NOT NULL DEFAULT 1,    -- 1 ou 2 (Linha Funcional / padrão)
  ordem           TINYINT NOT NULL DEFAULT 1,    -- alias/compatibilidade (1 ou 2)
  cargo           VARCHAR(100) NULL,
  nre_id          INT NULL,                      -- NRE de exercício
  municipio       VARCHAR(120) NULL,
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uq_vinculo_lf (usuario_id, linha_funcional),
  INDEX idx_vinculo_ordem (usuario_id, ordem),
  CONSTRAINT fk_vinculo_usuario FOREIGN KEY (usuario_id) REFERENCES usuario(id),
  CONSTRAINT fk_vinculo_nre FOREIGN KEY (nre_id) REFERENCES nre(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ciclo (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  ano_formativo VARCHAR(20) NOT NULL,
  chamamento    VARCHAR(60) NOT NULL DEFAULT '',
  UNIQUE KEY uq_ciclo (ano_formativo, chamamento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS componente (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  nome  VARCHAR(150) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS turma (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  codigo        VARCHAR(120) NOT NULL UNIQUE,
  ciclo_id      INT NULL,
  componente_id INT NULL,
  formador_id   BIGINT NULL,
  tutor_id      BIGINT NULL,
  modalidade    VARCHAR(80) NULL,
  turno         VARCHAR(40) NULL,
  dia_semana    VARCHAR(40) NULL,
  hora_ini      VARCHAR(10) NULL,              -- texto da planilha (HH:MM)
  hora_fim      VARCHAR(10) NULL,
  id_classroom  VARCHAR(80) NULL,
  link          VARCHAR(500) NULL,
  periodo_ini   VARCHAR(40) NULL,
  INDEX idx_turma_tutor (tutor_id),
  INDEX idx_turma_formador (formador_id),
  CONSTRAINT fk_turma_ciclo FOREIGN KEY (ciclo_id) REFERENCES ciclo(id),
  CONSTRAINT fk_turma_comp FOREIGN KEY (componente_id) REFERENCES componente(id),
  CONSTRAINT fk_turma_formador FOREIGN KEY (formador_id) REFERENCES usuario(id),
  CONSTRAINT fk_turma_tutor FOREIGN KEY (tutor_id) REFERENCES usuario(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS matricula (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  cod_cursista     VARCHAR(160) NULL UNIQUE,
  vinculo_id       BIGINT NOT NULL,
  turma_id         BIGINT NULL,
  ciclo_id         INT NULL,
  status           ENUM('ATIVA','CONCLUIDA','NAO_CONCLUIDA','EXONERADA','TRANSFERIDA') NOT NULL DEFAULT 'ATIVA',
  data_status      DATE NULL,
  na_base_ativa    BOOLEAN NOT NULL DEFAULT FALSE,   -- presente na aba DADOS da última carga
  sync_run         VARCHAR(40) NULL,
  obs_cursista     TEXT NULL,
  atualizado_em    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_matricula_turma (vinculo_id, turma_id),
  INDEX idx_mat_turma_status (turma_id, status),
  INDEX idx_mat_ativa (na_base_ativa),
  CONSTRAINT fk_mat_vinculo FOREIGN KEY (vinculo_id) REFERENCES vinculo(id),
  CONSTRAINT fk_mat_turma FOREIGN KEY (turma_id) REFERENCES turma(id),
  CONSTRAINT fk_mat_ciclo FOREIGN KEY (ciclo_id) REFERENCES ciclo(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Histórico de situação: concluintes, não concluintes, exonerados (detalhes em JSON)
CREATE TABLE IF NOT EXISTS matricula_status_hist (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  matricula_id BIGINT NOT NULL,
  status       ENUM('ATIVA','CONCLUIDA','NAO_CONCLUIDA','EXONERADA','TRANSFERIDA') NOT NULL,
  data_evento  DATE NULL,
  portaria     VARCHAR(100) NULL,
  motivo       TEXT NULL,
  detalhes     JSON NULL,
  criado_em    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_hist (matricula_id, status),
  CONSTRAINT fk_hist_mat FOREIGN KEY (matricula_id) REFERENCES matricula(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS observacao_pratica (
  id                           BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_origem                    VARCHAR(120) NULL UNIQUE,
  usuario_id                   BIGINT NULL,           -- cursista observado (pode ser resolvido por email)
  matricula_id                 BIGINT NULL,
  formador_id                  BIGINT NULL,           -- usuário formador/tutor observador
  carimbo                      VARCHAR(40) NULL,
  ano_formativo                VARCHAR(20) NULL,
  semestre                     VARCHAR(20) NULL,
  chamamento                   VARCHAR(60) NULL,
  modalidade                   VARCHAR(80) NULL,
  componente                   VARCHAR(150) NULL,
  tema                         VARCHAR(255) NULL,
  email_cursista               VARCHAR(255) NULL,
  nome_cursista                VARCHAR(255) NULL,
  email_formador               VARCHAR(255) NULL,
  nome_formador                VARCHAR(255) NULL,
  tutor_responsavel            VARCHAR(255) NULL,
  turma                        VARCHAR(160) NULL,
  nre_exe                      VARCHAR(100) NULL,
  munic_exe                    VARCHAR(120) NULL,
  proposta                     VARCHAR(100) NULL,
  observacao_realizada         VARCHAR(40) NULL,
  is_realizada                 BOOLEAN NULL,
  data_pratica                 DATE NULL,
  data_implementacao           DATE NULL,
  data_observacao              DATE NULL,
  data_feedback                DATE NULL,
  data_agendamento             DATE NULL,
  modalidade_feedback          VARCHAR(80) NULL,
  motivo_devolutiva            TEXT NULL,
  link_gravacao_pratica        TEXT NULL,
  link_planejamento            TEXT NULL,
  link_pdp                     TEXT NULL,
  proposta_pedagogica          TEXT NULL,
  link_gravacao_feedback       TEXT NULL,
  nivel_planejamento           VARCHAR(60) NULL,
  nivel_pratica                VARCHAR(60) NULL,
  evidencias_planejamento      TEXT NULL,
  evidencias_pratica           TEXT NULL,
  criterio1_nivel              VARCHAR(60) NULL,
  criterio1_evidencias         TEXT NULL,
  criterio2_nivel              VARCHAR(60) NULL,
  criterio2_evidencias         TEXT NULL,
  escala_boas_praticas         TEXT NULL,
  etapas_nao_realizadas        TEXT NULL,
  justificativa_etapas         TEXT NULL,
  questionamentos_propositivos TEXT NULL,
  proposicoes_sugestoes        TEXT NULL,
  combinados                   TEXT NULL,
  justificativa_nao_realizada  TEXT NULL,
  contexto_justificativa       TEXT NULL,
  reflexoes_gerais             TEXT NULL,
  quem_observou                VARCHAR(50) NULL,
  tutor_tecnico_observador     TEXT NULL,
  criado_em                    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_obs_usuario (usuario_id, data_observacao),
  INDEX idx_obs_matricula (matricula_id),
  CONSTRAINT fk_obs_usuario FOREIGN KEY (usuario_id) REFERENCES usuario(id),
  CONSTRAINT fk_obs_mat FOREIGN KEY (matricula_id) REFERENCES matricula(id),
  CONSTRAINT fk_obs_formador FOREIGN KEY (formador_id) REFERENCES usuario(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS observacao_tutor (
  id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_origem           VARCHAR(100) NULL UNIQUE,
  tutor_id            BIGINT NULL,
  formador_id         BIGINT NULL,
  registrado_em       DATETIME NULL,
  acao_acompanhamento VARCHAR(255) NULL,
  acao_observada      VARCHAR(255) NULL,
  data_observacao     VARCHAR(50) NULL,
  link_acao_observada TEXT NULL,
  data_feedback       VARCHAR(50) NULL,
  link_feedback       TEXT NULL,
  links_complementares TEXT NULL,
  modalidade          VARCHAR(100) NULL,
  avg_score           DECIMAL(3,2) NULL,
  checklist_realizadas TEXT NULL,
  checklist_nao_realizadas TEXT NULL,
  outros_registros    TEXT NULL,
  destaques           TEXT NULL,
  desenvolver         TEXT NULL,
  encaminhamentos     TEXT NULL,
  nre_id              INT NULL,
  tema                VARCHAR(255) NULL,
  rubricas            JSON NULL,
  INDEX idx_obst_tutor (tutor_id),
  INDEX idx_obst_formador (formador_id),
  CONSTRAINT fk_obst_tutor FOREIGN KEY (tutor_id) REFERENCES usuario(id),
  CONSTRAINT fk_obst_formador FOREIGN KEY (formador_id) REFERENCES usuario(id),
  CONSTRAINT fk_obst_nre FOREIGN KEY (nre_id) REFERENCES nre(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS movimentacao (
  id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
  ext_id             VARCHAR(120) NULL UNIQUE,     -- id legado (MOV_...) / chave da planilha
  usuario_id         BIGINT NULL,                  -- cursista
  matricula_id       BIGINT NULL,
  registrado_em      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  nre_id             INT NULL,
  tutor_responsavel  VARCHAR(255) NULL,
  email_tutor_resp   VARCHAR(255) NULL,
  turma_anterior     VARCHAR(160) NULL,
  turma_nova         VARCHAR(160) NULL,
  tipo_acao          VARCHAR(80) NULL,
  motivo             TEXT NULL,
  situacao_relacionada VARCHAR(120) NULL,
  ano_formacao       VARCHAR(20) NULL,
  chamamento         VARCHAR(60) NULL,
  modalidade_detalhes TEXT NULL,
  turma_detalhes     TEXT NULL,
  justificativa      TEXT NULL,
  descricao          TEXT NULL,
  comprovante        TEXT NULL,
  status             VARCHAR(40) NOT NULL DEFAULT 'Pendente',
  nota_resolucao     TEXT NULL,
  solicitado_por     BIGINT NULL,
  solicitado_por_nome VARCHAR(160) NULL,           -- texto da planilha (ex.: Google Forms)
  resolvido_por      BIGINT NULL,
  resolvido_em       DATETIME NULL,
  INDEX idx_mov_usuario (usuario_id),
  INDEX idx_mov_status (status, registrado_em),
  CONSTRAINT fk_mov_usuario FOREIGN KEY (usuario_id) REFERENCES usuario(id),
  CONSTRAINT fk_mov_mat FOREIGN KEY (matricula_id) REFERENCES matricula(id),
  CONSTRAINT fk_mov_nre FOREIGN KEY (nre_id) REFERENCES nre(id),
  CONSTRAINT fk_mov_solic FOREIGN KEY (solicitado_por) REFERENCES usuario(id),
  CONSTRAINT fk_mov_resolv FOREIGN KEY (resolvido_por) REFERENCES usuario(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS diario_registro (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  autor_id      BIGINT NOT NULL,
  cursista_id   BIGINT NULL,
  turma         VARCHAR(160) NULL,
  titulo        VARCHAR(255) NOT NULL DEFAULT 'Registro Formativo',
  conteudo      TEXT NOT NULL,
  categoria     VARCHAR(80) NOT NULL DEFAULT 'Geral',
  visibilidade  ENUM('privado','equipe','publico') NOT NULL DEFAULT 'publico',
  data_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_diario_cursista (cursista_id, data_registro),
  CONSTRAINT fk_diario_autor FOREIGN KEY (autor_id) REFERENCES usuario(id),
  CONSTRAINT fk_diario_cursista FOREIGN KEY (cursista_id) REFERENCES usuario(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS intencao_matricula (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  usuario_id       BIGINT NOT NULL,
  vinculo_id       BIGINT NULL,
  ano              SMALLINT NOT NULL DEFAULT 2027,
  componente       VARCHAR(150) NULL,
  opcao_turno      VARCHAR(60) NULL,
  opcao_modalidade VARCHAR(80) NULL,
  observacao       TEXT NULL,
  criado_em        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_int_usuario (usuario_id, ano),
  CONSTRAINT fk_int_usuario FOREIGN KEY (usuario_id) REFERENCES usuario(id),
  CONSTRAINT fk_int_vinculo FOREIGN KEY (vinculo_id) REFERENCES vinculo(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS auditoria (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  usuario_id  BIGINT NULL,
  acao        VARCHAR(80) NOT NULL,
  entidade    VARCHAR(60) NULL,
  entidade_id VARCHAR(60) NULL,
  detalhes    JSON NULL,
  em          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_aud_em (em),
  INDEX idx_aud_usuario (usuario_id, em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Painel de turmas / cursistas ativos (sem CPF/RG; CGM só mascarado)
CREATE OR REPLACE VIEW v_cursista_turma AS
SELECT m.id AS matricula_id, m.cod_cursista, m.status, m.na_base_ativa,
       u.id AS usuario_id, u.nome AS nome_cursista, u.email_inst AS email, u.telefone AS telefone_cursista,
       u.cgm_ultimos3,
       v.id AS vinculo_id, v.linha_funcional, v.ordem, v.cargo, v.municipio AS munic_exe, nv.nome AS nre_exe,
       t.id AS turma_id, t.tutor_id, t.formador_id, t.codigo AS turma, c.nome AS componente, ci.ano_formativo, ci.chamamento,
       t.modalidade, t.turno, t.dia_semana, t.hora_ini, t.hora_fim, t.id_classroom, t.link,
       f.nome AS nome_formador, f.email_inst AS email_formador, f.telefone AS telefone_formador,
       tu.nome AS tutor_responsavel, tu.email_inst AS email_tutor, tu.telefone AS telefone_tutor,
       nt.nome AS nre_tutor
FROM matricula m
JOIN vinculo v ON v.id = m.vinculo_id
JOIN usuario u ON u.id = v.usuario_id
LEFT JOIN nre nv ON nv.id = v.nre_id
LEFT JOIN turma t ON t.id = m.turma_id
LEFT JOIN componente c ON c.id = t.componente_id
LEFT JOIN ciclo ci ON ci.id = COALESCE(m.ciclo_id, t.ciclo_id)
LEFT JOIN usuario f ON f.id = t.formador_id
LEFT JOIN usuario tu ON tu.id = t.tutor_id
LEFT JOIN nre nt ON nt.id = tu.nre_id;
