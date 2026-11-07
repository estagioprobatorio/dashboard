# Documentação Oficial do Banco de Dados - Schema v2
**Plataforma de Gestão do Estágio Probatório Docente**  
*Secretaria de Estado da Educação do Paraná (SEED/PR)*

---

## 1. Visão Geral da Arquitetura

O sistema opera com arquitetura híbrida de alto desempenho, integrando **Google Spreadsheets (Planilha Mestra da SEED/PR)**, **Google Apps Script**, **Vercel Serverless Gateway (`/api/v2`)** e banco relacional **TiDB Cloud (Serverless MySQL)** ou **MariaDB Local**:

```mermaid
flowchart TD
    subgraph Origem ["1. Origem dos Dados (Google Workspace)"]
        GS["Planilhas Google Spreadsheets\n(DADOS, CONCLUINTES, TUTORES, EXONERADOS,\nMOVIMENTAÇÕES, OBSERVAÇÕES)"]
        GAS["Google Apps Script\n(sync_todas_planilhas_tidb.js)"]
        GS -->|Gatilho Automático 07:00 / Manual| GAS
    end

    subgraph Gateway ["2. Gateway & Camada de Proteção (Vercel API v2)"]
        EP["/api/v2 Gateway\n(HMAC-SHA256, AES-256-GCM, RBAC)"]
        TOKEN["Validador X-Sync-Token / Bearer Firebase"]
        GAS -->|HTTPS POST com X-Sync-Token| EP
        EP --> TOKEN
    end

    subgraph Banco ["3. Banco de Dados Relacional (TiDB Cloud / Local)"]
        DB[("TiDB Serverless Cloud (MySQL 8)\nou MariaDB Local (porta 3307)")]
        TOKEN -->|Carga Idempotente (Upsert / Sem Truncate)| DB
    end

    subgraph Clientes ["4. Clientes & Usuários"]
        FE["Dashboard Web React (Vite / Vercel)"]
        FE -->|Bearer Firebase Token (@escola.pr.gov.br)| EP
        EP -->|Visão com Escopo por Função & CGM Mascarado| FE
    end
```

---

## 2. Princípios de Segurança e Diretrizes do Schema v2

1. **E-mail Institucional (`@escola.pr.gov.br`) como Chave Única de Identidade:**
   - O login é validado no servidor via ID Token oficial do Firebase Auth.
   - O e-mail do token determina o usuário. Não há concessão automática de privilégios de administrador apenas pelo domínio `@escola`.
2. **Uma Função Exclusiva por Conta:**
   - Cada usuário possui exatamente uma função: `superadmin`, `admin`, `tecnico`, `tutor`, `formador` ou `cursista`.
   - As funções são armazenadas no banco (`usuario.funcao`) e nunca podem ser alteradas ou forjadas pelo cliente.
3. **Proteção de Dado Sensível (CGM do Cursista) e Unicidade por Pessoa Física:**
   - **Apenas cursistas possuem CGM**; administradores, técnicos, tutores e formadores não possuem CGM.
   - O CGM pertence à pessoa física do cursista e é **estritamente único por usuário**.
   - O CGM **nunca fica em texto aberto no banco de dados**:
     - `cgm_hash`: Hash HMAC-SHA256 gerado com `CGM_PEPPER` secreto para buscas, deduplicação e integridade relacional.
     - `cgm_cifrado`: Valor original cifrado com **AES-256-GCM** utilizando `DATA_KEY` exclusiva para recuperação legal e revelação restrita ao Superadmin.
     - `cgm_ultimos3`: Últimos 3 dígitos para exibição mascarada (`•••••123`) em interfaces gerais.
   - O CGM fica armazenado exclusivamente no registro do cursista na tabela `usuario`.
   - Toda operação de decifração de CGM gera auditoria imutável na tabela `auditoria`.
4. **Cursistas com 2 Vínculos (Linhas Funcionais):**
   - O modelo reflete a realidade funcional da SEED/PR: **sempre existe apenas 1 CGM para a mesma pessoa física**; o que muda entre os dois padrões em estágio probatório é a **Linha Funcional** (LF 1 e LF 2).
   - A tabela `vinculo` gerencia as duas linhas funcionais (`linha_funcional = 1` e `linha_funcional = 2`), com restrição única `UNIQUE KEY (usuario_id, linha_funcional)`.
   - Cada vínculo possui sua respectiva matrícula (`matricula`), turma, componente curricular, NRE e município de exercício, eliminando qualquer risco de perda de dados ou falsas duplicidades.
5. **Cargas de Planilhas Seguras e Sem Perda de Dados:**
   - Cargas utilizam lógica de `UPSERT` (`INSERT ... ON DUPLICATE KEY UPDATE`).
   - Tabelas não são truncadas abruptamente, eliminando o risco de base zerada se uma planilha falhar no meio do processo.

---

## 3. Dicionário de Dados do Schema v2

### 3.1 Tabela `nre`
Catálogo unificado dos Núcleos Regionais de Educação do Paraná (32 NREs oficiais normalizados).
| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT | Identificador numérico do NRE |
| `nome` | VARCHAR(80) | NOT NULL, UNIQUE | Nome em caixa alta sem acentuação (ex: 'AREA METROPOLITANA NORTE') |
| `email` | VARCHAR(255) | NULL | E-mail de contato institucional do NRE |

---

### 3.2 Tabela `usuario`
Entidade central de pessoas e contas de acesso à plataforma.
| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | Identificador numérico do usuário |
| `email_inst` | VARCHAR(255) | UNIQUE, NULL | E-mail institucional `@escola.pr.gov.br` (minúsculo) |
| `email_alt` | VARCHAR(255) | NULL | E-mail alternativo/administrativo |
| `nome` | VARCHAR(255) | NOT NULL | Nome completo |
| `funcao` | ENUM | NOT NULL | `superadmin`, `admin`, `tecnico`, `tutor`, `formador`, `cursista` |
| `firebase_uid` | VARCHAR(128) | UNIQUE, NULL | UID do Firebase Authentication |
| `nre_id` | INT | FK -> nre(id) | NRE de lotação/responsabilidade |
| `telefone` | VARCHAR(40) | NULL | Telefone institucional/contato |
| `cgm_hash` | CHAR(64) | UNIQUE, NULL | Hash HMAC-SHA256 do CGM com pepper (apenas cursistas) |
| `cgm_cifrado` | VARBINARY(255) | NULL | CGM cifrado com AES-256-GCM (apenas cursistas) |
| `cgm_ultimos3` | CHAR(3) | NULL | Últimos 3 dígitos para exibição mascarada (`•••••123`) |
| `cpf_hash` | CHAR(64) | NULL | Hash HMAC-SHA256 do CPF |
| `cpf_cifrado` | VARBINARY(255) | NULL | CPF cifrado com AES-256-GCM |
| `rg_cifrado` | VARBINARY(255) | NULL | RG cifrado com AES-256-GCM |
| `ativo` | BOOLEAN | DEFAULT TRUE | Status da conta (TRUE = ativa) |
| `criado_em` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Data de cadastro |
| `ultimo_acesso`| DATETIME | NULL | Timestamp do último acesso bem-sucedido |

---

### 3.3 Tabela `vinculo`
Linhas funcionais (padrões de 20h) exclusivas de cursistas (1 ou 2 vínculos por cursista). Todo cursista possui um único CGM associado ao seu cadastro em `usuario`, mas pode ter até dois vínculos ativos.
| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | Identificador do vínculo |
| `usuario_id` | BIGINT | FK -> usuario(id) | Referência ao usuário cursista |
| `linha_funcional` | TINYINT | NOT NULL, DEFAULT 1 | Linha funcional (`1` ou `2`) |
| `ordem` | TINYINT | NOT NULL, DEFAULT 1 | Alias de compatibilidade (`1` ou `2`) |
| `cargo` | VARCHAR(100) | NULL | Cargo funcional (ex: 'Professor Docente') |
| `nre_id` | INT | FK -> nre(id) | NRE de exercício da função |
| `municipio` | VARCHAR(120) | NULL | Município de exercício |
| `ativo` | BOOLEAN | DEFAULT TRUE | Situação do vínculo funcional |

*Restrição de Unicidade:* `UNIQUE KEY (usuario_id, linha_funcional)` — garante até 2 vínculos para a mesma pessoa sem colisão de CGM.

---

### 3.4 Tabela `ciclo`
Ciclos formativos e chamamentos de convocação.
| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT | ID do ciclo |
| `ano_formativo` | VARCHAR(20) | NOT NULL | Ano letivo/formativo (ex: '1º ANO', '2º ANO') |
| `chamamento` | VARCHAR(60) | NOT NULL, DEFAULT '' | Identificação do chamamento (ex: '1º Chamamento') |

*Restrição de Unicidade:* `UNIQUE KEY (ano_formativo, chamamento)`.

---

### 3.5 Tabela `componente`
Componentes curriculares e disciplinas formativas.
| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | INT | PK, AUTO_INCREMENT | ID do componente |
| `nome` | VARCHAR(150) | UNIQUE, NOT NULL | Nome da disciplina (ex: 'Matemática', 'Pedagogo') |

---

### 3.6 Tabela `turma`
Turmas formadas para a formação pedagógica.
| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | ID único da turma |
| `codigo` | VARCHAR(120) | UNIQUE, NOT NULL | Código/nome da turma (ex: 'T-MAT-01') |
| `ciclo_id` | INT | FK -> ciclo(id) | Ciclo formativo associado |
| `componente_id`| INT | FK -> componente(id) | Componente curricular |
| `formador_id` | BIGINT | FK -> usuario(id) | Usuário com função `formador` responsável |
| `tutor_id` | BIGINT | FK -> usuario(id) | Usuário com função `tutor` responsável |
| `modalidade` | VARCHAR(80) | NULL | Presencial, EaD, Híbrido |
| `turno` | VARCHAR(40) | NULL | Manhã, Tarde, Noite |
| `dia_semana` | VARCHAR(40) | NULL | Dia das aulas síncronas |
| `hora_ini` | VARCHAR(10) | NULL | Horário de início (HH:MM) |
| `hora_fim` | VARCHAR(10) | NULL | Horário de término (HH:MM) |
| `id_classroom` | VARCHAR(80) | NULL | Identificador do Google Classroom |
| `link` | VARCHAR(500) | NULL | Link direto para o Google Meet/Classroom |

---

### 3.7 Tabela `matricula`
Enturmação e status de cada linha funcional do cursista.
| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | ID da matrícula |
| `cod_cursista` | VARCHAR(160) | UNIQUE, NULL | Identificador único de exportação (`V{id}T{id}`) |
| `vinculo_id` | BIGINT | FK -> vinculo(id) | Linha funcional do cursista |
| `turma_id` | BIGINT | FK -> turma(id) | Turma atribuída (pode ser NULL se remanejado) |
| `ciclo_id` | INT | FK -> ciclo(id) | Ciclo formativo |
| `status` | ENUM | NOT NULL | `ATIVA`, `CONCLUIDA`, `NAO_CONCLUIDA`, `EXONERADA`, `TRANSFERIDA` |
| `data_status` | DATE | NULL | Data da alteração de status |
| `na_base_ativa` | BOOLEAN | DEFAULT FALSE | Presente na aba DADOS da última sincronização |
| `sync_run` | VARCHAR(40) | NULL | Identificador de lote de sincronização |
| `obs_cursista` | TEXT | NULL | Observações do cursista |

---

### 3.8 Tabela `matricula_status_hist`
Histórico detalhado de encerramento da matrícula (concluintes, não concluintes, exonerados).
| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | ID do evento |
| `matricula_id` | BIGINT | FK -> matricula(id) | Matrícula afetada |
| `status` | ENUM | NOT NULL | Status atribuído |
| `data_evento` | DATE | NULL | Data de publicação ou efetivação |
| `portaria` | VARCHAR(100) | NULL | Número da portaria no Diário Oficial (quando exonerado) |
| `motivo` | TEXT | NULL | Motivo informado |
| `detalhes` | JSON | NULL | Metadados completos da planilha de origem em JSON |

---

### 3.9 Tabela `observacao_pratica`
Registros das observações da prática pedagógica do docente.
| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | ID interno da observação |
| `id_origem` | VARCHAR(120) | UNIQUE, NULL | Código de rastreamento da planilha ou app |
| `usuario_id` | BIGINT | FK -> usuario(id) | Cursista observado |
| `matricula_id` | BIGINT | FK -> matricula(id) | Matrícula relacionada |
| `formador_id` | BIGINT | FK -> usuario(id) | Formador/Tutor que realizou a observação |
| `tema` | VARCHAR(255) | NULL | Tema pedagógico trabalhado |
| `is_realizada` | BOOLEAN | NULL | Indicador de conclusão da observação |
| `data_pratica` | DATE | NULL | Data da aplicação em sala de aula |
| `data_observacao` | DATE | NULL | Data da sessão de observação |
| `data_feedback` | DATE | NULL | Data da devolutiva pedagógica |
| `nivel_planejamento` | VARCHAR(60) | NULL | Conceito do planejamento |
| `nivel_pratica` | VARCHAR(60) | NULL | Conceito da prática |
| `quem_observou` | VARCHAR(50) | NULL | 'Formador' ou 'Tutor/Técnico' |

---

### 3.10 Tabela `observacao_tutor`
Acompanhamento dos formadores realizado pelos tutores (com rubricas em JSON).
| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | ID da observação |
| `id_origem` | VARCHAR(100) | UNIQUE, NULL | Identificador único de origem |
| `tutor_id` | BIGINT | FK -> usuario(id) | Usuário com função `tutor` |
| `formador_id` | BIGINT | FK -> usuario(id) | Usuário com função `formador` acompanhado |
| `avg_score` | DECIMAL(3,2) | NULL | Pontuação média nas rubricas |
| `rubricas` | JSON | NULL | Lista estruturada das rubricas preenchidas |
| `destaques` | TEXT | NULL | Pontos fortes observados |
| `desenvolver` | TEXT | NULL | Pontos a desenvolver |

---

### 3.11 Tabela `movimentacao`
Chamados de troca de turma, mudança de modalidade e remanejamento.
| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | ID interno |
| `ext_id` | VARCHAR(120) | UNIQUE, NULL | Identificador externo (`MOV_...`) |
| `usuario_id` | BIGINT | FK -> usuario(id) | Cursista solicitante |
| `turma_anterior` | VARCHAR(160) | NULL | Turma de origem |
| `turma_nova` | VARCHAR(160) | NULL | Turma de destino solicitada |
| `tipo_acao` | VARCHAR(80) | NULL | Troca de Turma, Troca de Modalidade, etc. |
| `status` | VARCHAR(40) | DEFAULT 'Pendente' | Pendente, Deferido, Indeferido |
| `nota_resolucao`| TEXT | NULL | Parecer da equipe gestora |
| `solicitado_por`| BIGINT | FK -> usuario(id) | Usuário autenticado que solicitou |
| `resolvido_por` | BIGINT | FK -> usuario(id) | Admin/Técnico que deferiu/indeferiu |
| `resolvido_em` | DATETIME | NULL | Timestamp da decisão |

---

### 3.12 Tabela `diario_registro`
Registros pedagógicos do Diário Formativo.
| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | ID do registro |
| `autor_id` | BIGINT | FK -> usuario(id) | Usuário autor da postagem |
| `cursista_id` | BIGINT | FK -> usuario(id) | Cursista objeto do registro |
| `titulo` | VARCHAR(255) | NOT NULL | Título da reflexão formativa |
| `conteudo` | TEXT | NOT NULL | Corpo do texto pedagógico |
| `visibilidade` | ENUM | NOT NULL | `privado`, `equipe`, `publico` |

---

### 3.13 Tabela `intencao_matricula`
Manifestação de interesse para as turmas do ano seguinte (2027).
| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | ID da intenção |
| `usuario_id` | BIGINT | FK -> usuario(id) | Cursista manifestante |
| `vinculo_id` | BIGINT | FK -> vinculo(id) | Linha funcional vinculada |
| `componente` | VARCHAR(150) | NULL | Disciplina de preferência |
| `opcao_turno` | VARCHAR(60) | NULL | Turno preferido |
| `opcao_modalidade` | VARCHAR(80) | NULL | Modalidade desejada |

---

### 3.14 Tabela `auditoria`
Trilha de auditoria imutável para conformidade LGPD e segurança de dados.
| Coluna | Tipo | Restrições | Descrição |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | ID do log |
| `usuario_id` | BIGINT | NULL | Usuário que executou a ação |
| `acao` | VARCHAR(80) | NOT NULL | Nome da ação (ex: `cgm_revelar`, `usuario_upsert`) |
| `entidade` | VARCHAR(60) | NULL | Nome da tabela/objeto afetado |
| `entidade_id` | VARCHAR(60) | NULL | ID do objeto afetado |
| `detalhes` | JSON | NULL | Metadados contextuais em JSON |
| `em` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Timestamp oficial do registro |

---

## 4. Mapeamento das Planilhas Google para o Banco

O ecossistema é alimentado por Google Spreadsheets através de Google Apps Script (`google-apps-script/sync_todas_planilhas_tidb.js` e `google-apps-script/sync_observacoes_todas_planilhas.js`) disparando requisições HTTPS para `/api/v2`:

### 4.1 Planilha Mestra Central (`1sRkA88VrtczqXxQ6PlmgygeCVhPoElRNS8RC1QuQzx0`)
| Aba da Planilha Mestra | Ação na API v2 | Mapeamento no Banco de Dados |
|---|---|---|
| **DADOS / CURSISTAS** | `sync_cursistas_bulk` | Cria/atualiza `usuario` (CGM único protegido), `vinculo` (linhas funcionais 1 e 2), `turma`, `componente`, `nre` e vincula em `matricula` com `status = 'ATIVA'` e `na_base_ativa = 1`. |
| **CONCLUINTES-1CH** | `sync_concluintes_bulk` | Identifica vínculo pelo CGM/E-mail, atualiza `matricula.status = 'CONCLUIDA'` e registra metadados em `matricula_status_hist`. |
| **TUTORES** | `sync_tutores_bulk` | Cadastra tutores em `usuario` com `funcao = 'tutor'`, e-mail educacional, telefone e vinculação ao respectivo `nre`. |
| **EXONERADOS** | `sync_exonerados_bulk` | Se o servidor já existir, atualiza sua matrícula para `EXONERADA`; caso não exista na base ativa, cria o registro histórico correspondente com detalhes da portaria em `matricula_status_hist`. |
| **CURSISTAS NAO CONCLUINTES** | `sync_nao_concluintes_bulk` | Atualiza a matrícula para `NAO_CONCLUIDA` com os motivos registrados em `matricula_status_hist`. |
| **Troca de Turma / Modalidade / AF** | `sync_movimentacoes_bulk` | Cria registros na tabela `movimentacao`. Se a coluna de aprovação contiver "Deferido", o status é gravado diretamente. |

### 4.2 As 4 Planilhas de Observações Pedagógicas dos Formadores
As observações de prática dos formadores para cursistas residem em 4 planilhas de Google Forms consolidadas (+19.900 registros):
1. **Formador-1ANO_1SEM:** ID `1KmbMvNOTpj4OaDOdKw5mPVI3iqbo8RbQBqBktM84ToE` (GID: `1030562032`)
2. **Formador-2e3ANO-2SEM:** ID `1uv5QWeqtN5iMkH8nVQUvsYKClv9NaGDHgsdT_D-RPiw` (GID: `2068065207`)
3. **Formador-1ANO_2SEM:** ID `1dL_Q-_15Idx3SNAZOqmKzrnVqA8tHFBzILA5PZ7p798` (GID: `425616417`)
4. **Formador-2e3ANO-1SEM:** ID `1zSnlh7aW8df800lP90rCLVxiHNWAa1f9IGjz2OoDfvU` (GID: `848666482`)
- **Ação na API:** `sync_observacoes_bulk` -> Tabela `observacao_pratica`
- **Gatilho Instantâneo (`onFormSubmit`):** configurado em `google-apps-script/sync_observacoes_todas_planilhas.js` para enviar novas respostas em tempo real para a API v2.

### 4.3 Planilha de Observações de Tutoria (Tutor Insights)
As observações dos tutores acompanhando formadores (+2.000 registros):
- **Planilha:** ID `1V54Gl-KVGaHjLBH07hQZxq6GU88kfn0Xurh5P2LuSz8` ("Respostas ao formulário 1")
- **Ação na API:** `sync_observacoes_tutor_bulk` -> Tabela `observacao_tutor`
- **Importação Local Rápida:** execute `npm run db:import-observacoes` para carregar a base consolidada localmente em segundos.

---

## 5. Como Testar e Operar em Localhost

O ambiente foi configurado para rodar e ser testado 100% em localhost sem depender de infraestrutura externa:

### 5.1 Iniciar o Banco MariaDB Local
Abra um terminal (ou dê duplo clique) em:
```bat
scripts\start-local-db.bat
```
*O MariaDB subirá na porta local `3307` usando os dados preservados em `%USERPROFILE%\mariadb-local\data\ep_local`.*

### 5.2 Iniciar a API Local (`/api/v2`)
Em outro terminal:
```bash
cmd.exe /c "npm run dev:api"
```
*O servidor de API subirá em `http://127.0.0.1:3001/api/v2` lendo as chaves de `.env.local`.*

### 5.3 Executar a Bateria de Testes Automatizados da API v2
Para validar todas as 25 regras de segurança, RBAC, hash de CGM, deduplicação e escopos:
```bash
cmd.exe /c "npm run test:v2"
```

### 5.4 Iniciar o Dashboard Web React (Vite)
Em outro terminal:
```bash
cmd.exe /c "npm run dev"
```
*O Vite abrirá em `http://localhost:3000` com proxy transparente direcionando chamadas `/api/v2` para a porta 3001.*
