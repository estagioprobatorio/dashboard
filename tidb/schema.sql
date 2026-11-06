-- =========================================================================================
-- ESQUEMA COMPLETO PARA BANCO DE DADOS TiDB SERVERLESS (MySQL Compatible)
-- Plataforma de Gestão de Turmas e Observação Pedagógica - SEED/PR
-- =========================================================================================
-- Como usar:
-- 1. Acesse seu console no TiDB Cloud: https://tidbcloud.com/
-- 2. Selecione seu Cluster Serverless -> "SQL Editor"
-- 3. Cole todo o conteúdo deste arquivo e clique em "Run"
-- =========================================================================================

-- 1. TABELA: cursistas
CREATE TABLE IF NOT EXISTS cursistas (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  cod_cursista VARCHAR(150) UNIQUE,
  cgm VARCHAR(50),
  nome_cursista VARCHAR(255),
  email VARCHAR(255),
  cpf_cursista VARCHAR(50),
  rg VARCHAR(50),
  telefone_cursista VARCHAR(50),
  modalidade VARCHAR(100),
  componente VARCHAR(150),
  turmas VARCHAR(150),
  dia_da_semana VARCHAR(100),
  horario_inicial VARCHAR(50),
  horario_fim VARCHAR(50),
  turno VARCHAR(50),
  ano_formativo VARCHAR(50),
  nome_formador VARCHAR(255),
  cpf_formador VARCHAR(50),
  rg_formador VARCHAR(50),
  email_formador VARCHAR(255),
  telefone_formador VARCHAR(50),
  nre_formador VARCHAR(100),
  componente_formador VARCHAR(150),
  tutor_responsavel VARCHAR(255),
  email_tutor VARCHAR(255),
  telefone_tutor VARCHAR(50),
  nre_tutor VARCHAR(100),
  email_nre VARCHAR(255),
  link TEXT,
  id_classroom VARCHAR(100),
  periodo_ini VARCHAR(50),
  chamamento VARCHAR(100),
  nre_exe VARCHAR(100),
  munic_exe VARCHAR(150),
  componente_conc VARCHAR(150),
  observacoes_cursista TEXT,
  observacoes_formador TEXT,
  observacoes_tutor TEXT,
  observacoes_turma TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cursistas_email (email),
  INDEX idx_cursistas_cgm (cgm),
  INDEX idx_cursistas_turmas (turmas),
  INDEX idx_cursistas_nome (nome_cursista)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABELA: tutores
CREATE TABLE IF NOT EXISTS tutores (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tutor_responsavel VARCHAR(255),
  email_educ VARCHAR(255),
  email_adm VARCHAR(255),
  telefone VARCHAR(50),
  nre_tutor VARCHAR(100),
  email_nre VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tutores_email (email_educ)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABELA: observacoes_pratica
CREATE TABLE IF NOT EXISTS observacoes_pratica (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_origem VARCHAR(150) UNIQUE,
  carimbo VARCHAR(100),
  email_cursista VARCHAR(255) NOT NULL,
  nome_cursista TEXT,
  email_formador VARCHAR(255),
  nome_formador TEXT,
  ano_formativo VARCHAR(50),
  semestre VARCHAR(50),
  chamamento VARCHAR(100),
  modalidade VARCHAR(100),
  componente VARCHAR(150),
  tema TEXT,
  observacao_realizada TEXT,
  is_realizada TINYINT(1) DEFAULT 1,
  data_pratica VARCHAR(50),
  data_implementacao VARCHAR(50),
  data_observacao VARCHAR(50),
  data_feedback VARCHAR(50),
  data_agendamento VARCHAR(50),
  modalidade_feedback TEXT,
  motivo_devolutiva TEXT,
  link_gravacao_pratica TEXT,
  link_planejamento TEXT,
  link_pdp TEXT,
  proposta_pedagogica TEXT,
  link_gravacao_feedback TEXT,
  nivel_planejamento TEXT,
  nivel_pratica TEXT,
  evidencias_planejamento LONGTEXT,
  evidencias_pratica LONGTEXT,
  criterio1_nivel TEXT,
  criterio1_evidencias LONGTEXT,
  criterio2_nivel TEXT,
  criterio2_evidencias LONGTEXT,
  escala_boas_praticas TEXT,
  etapas_nao_realizadas TEXT,
  justificativa_etapas TEXT,
  questionamentos_propositivos LONGTEXT,
  proposicoes_sugestoes LONGTEXT,
  combinados LONGTEXT,
  justificativa_nao_realizada LONGTEXT,
  contexto_justificativa LONGTEXT,
  reflexoes_gerais LONGTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_obs_email_cursista (email_cursista),
  INDEX idx_obs_email_formador (email_formador),
  INDEX idx_obs_ano_formativo (ano_formativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABELA: cursistas_concluintes
CREATE TABLE IF NOT EXISTS cursistas_concluintes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  cod_cursista VARCHAR(150),
  cgm VARCHAR(50),
  nome_cursista VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  cpf VARCHAR(50),
  rg VARCHAR(50),
  chamamento VARCHAR(100) DEFAULT '1º Chamamento',
  ano_formativo VARCHAR(50),
  modalidade VARCHAR(100),
  componente VARCHAR(150),
  turmas VARCHAR(150),
  nre_exe VARCHAR(100),
  munic_exe VARCHAR(150),
  situacao VARCHAR(100) DEFAULT 'CONCLUÍDO',
  data_conclusao VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_concluintes_email (email),
  INDEX idx_concluintes_nome (nome_cursista),
  INDEX idx_concluintes_cgm (cgm)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TABELA: movimentacoes
CREATE TABLE IF NOT EXISTS movimentacoes (
  id VARCHAR(150) PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  cgm VARCHAR(50),
  nome_cursista VARCHAR(255),
  email VARCHAR(255),
  nre VARCHAR(100),
  tutor VARCHAR(255),
  tutor_responsavel VARCHAR(255),
  email_tutor_responsavel VARCHAR(255),
  turma_anterior VARCHAR(150),
  turma_nova VARCHAR(150),
  tipo_acao VARCHAR(100),
  motivo TEXT,
  situacao_relacionada TEXT,
  ano_formacao VARCHAR(50),
  chamamento VARCHAR(100),
  modalidade_detalhes VARCHAR(150),
  turma_detalhes VARCHAR(150),
  justificativa TEXT,
  descricao TEXT,
  comprovante TEXT,
  status VARCHAR(50) DEFAULT 'Pendente',
  nota_resolucao TEXT,
  solicitadoPor VARCHAR(100),
  INDEX idx_mov_cgm (cgm),
  INDEX idx_mov_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. TABELA: diario_formativo
CREATE TABLE IF NOT EXISTS diario_formativo (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  email_autor VARCHAR(255),
  nome_autor VARCHAR(255),
  papel_autor VARCHAR(50),
  turma VARCHAR(150),
  cgm_cursista VARCHAR(50),
  nome_cursista VARCHAR(255),
  titulo VARCHAR(255),
  conteudo LONGTEXT,
  categoria VARCHAR(100),
  visibilidade VARCHAR(50) DEFAULT 'publico',
  INDEX idx_diario_autor (email_autor),
  INDEX idx_diario_cursista (cgm_cursista)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. TABELA: intencao_matricula_2027
CREATE TABLE IF NOT EXISTS intencao_matricula_2027 (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  cgm VARCHAR(50),
  nome_cursista VARCHAR(255),
  email VARCHAR(255),
  componente VARCHAR(150),
  opcao_turno VARCHAR(50),
  opcao_modalidade VARCHAR(100),
  observacao TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_intencao_cgm (cgm)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. TABELA: exonerados
CREATE TABLE IF NOT EXISTS exonerados (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  cgm VARCHAR(50),
  cpf VARCHAR(50),
  rg VARCHAR(50),
  nome_cursista VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  motivo TEXT,
  portaria VARCHAR(100),
  data_exoneracao VARCHAR(50),
  nre VARCHAR(100),
  municipio VARCHAR(150),
  escola VARCHAR(255),
  componente VARCHAR(150),
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_exon_cpf (cpf),
  INDEX idx_exon_cgm (cgm)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
