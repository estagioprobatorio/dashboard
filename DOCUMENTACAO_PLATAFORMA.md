# 📘 Documentação da Plataforma - Gestão de Turmas e Observação Pedagógica
### Secretaria de Estado da Educação do Paraná (SEED/PR)
**Programa de Acompanhamento do Estágio Probatório Docente**

---

## 📑 Sumário

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura Técnica do Sistema](#2-arquitetura-técnica-do-sistema)
3. [Perfis de Usuário e Controle de Acesso (RBAC)](#3-perfis-de-usuário-e-controle-de-acesso-rbac)
4. [Módulos e Funcionalidades da Plataforma](#4-módulos-e-funcionalidades-da-plataforma)
5. [Nova Ferramenta "Observar" (Observação da Prática Pedagógica)](#5-nova-ferramenta-observar-observação-da-prática-pedagógica)
   * 5.1 [Dossiê Pedagógico do Cursista (`DossieCursistaModal`)](#51-dossiê-pedagógico-do-cursista-dossiecursistamodal)
   * 5.2 [Gráfico de Evolução Profissional em Tempo Real](#52-gráfico-de-evolução-profissional-em-tempo-real)
   * 5.3 [Formulário de Inserção de Observação (`FormularioInserirObservacao`)](#53-formulário-de-inserção-de-observação-formularioinserirobservacao)
   * 5.4 [Dual-Sync & Resiliência de Dados (Supabase + Google Sheets + Local)](#54-dual-sync--resiliência-de-dados-supabase--google-sheets--local)
6. [Dicionário de Dados (`observacoes_pratica`)](#6-dicionário-de-dados-observacoes_pratica)
7. [Integração com Google Sheets (Google Apps Script)](#7-integração-com-google-sheets-google-apps-script)
8. [Guia de Execução Local e Manutenção](#8-guia-de-execução-local-e-manutenção)
9. [Deploy e Variáveis de Ambiente](#9-deploy-e-variáveis-de-ambiente)

---

## 1. Visão Geral

A **Plataforma de Gestão de Turmas do Estágio Probatório** é uma aplicação web interativa desenvolvida para a SEED/PR com o objetivo de centralizar, monitorar e potencializar o acompanhamento pedagógico de professores em estágio probatório em todo o Estado do Paraná.

A plataforma conecta:
* **Técnicos da SEED/PR & Administradores Centrais**: Gestão global de enturmação, relatórios estatísticos e auditoria.
* **Tutores Pedagógicos**: Acompanhamento dos formadores, turmas do NRE e mediação pedagógica.
* **Formadores**: Gestão das turmas formativas, diálogo formativo e realização das observações da prática.
* **Professores Cursistas**: Acompanhamento da sua trajetória formativa e devoluções pedagógicas.

---

## 2. Arquitetura Técnica do Sistema

```
                      ┌──────────────────────────────────────────────┐
                      │             NAVEGADOR DO USUÁRIO             │
                      │       React 18 SPA (Interface Gráfica)      │
                      └──────────────────────┬───────────────────────┘
                                             │
                       ┌─────────────────────┼──────────────────────┐
                       │                     │                      │
                       ▼                     ▼                      ▼
               ┌───────────────┐     ┌───────────────┐      ┌───────────────┐
               │  LocalStorage │     │   Supabase    │      │  Google Apps  │
               │ Cache Local   │     │  PostgreSQL   │      │    Script     │
               │ (Resiliência) │     │ (Nuvem / SQL) │      │ (Web App API) │
               └───────────────┘     └───────────────┘      └───────┬───────┘
                                                                    │
                                                                    ▼
                                                            ┌───────────────┐
                                                            │ Google Sheets │
                                                            │  (Planilhas   │
                                                            │   Oficiais)   │
                                                            └───────────────┘
```

* **Frontend**: React 18, JSX, CSS3 moderno com variáveis semânticas do Estado do Paraná (Azul institucional `#001d3d`, Azul real `#0072bc`, Verde `#00984a`, Ouro `#f59e0b`).
* **Compilação**: Vite 5 / Script especializado `build_dist.py` (usando `esbuild` stand-alone embutido para ambientes corporativos com restrição de npm).
* **Banco de Dados Relacional**: Supabase (PostgreSQL), tabela centralizada `observacoes_pratica`.
* **Planilhas Governamentais**: Google Sheets (4 planilhas semestrais do Estágio Probatório) integradas via Google Apps Script (funções `doPost` e sincronizadores em lote).
* **Servidor Local**: Python HTTP Server com redirecionamento SPA (`servidor_local.py`).

---

## 3. Perfis de Usuário e Controle de Acesso (RBAC)

O sistema conta com controle de acesso dinâmico por perfil baseado no e-mail autenticado:

| Perfil | Identificação | Permissões na Plataforma |
| :--- | :--- | :--- |
| **Admin** | Lista de e-mails em `config_roles.js` | Acesso irrestrito a todas as abas, inclusive o **Painel Administrativo**, com permissão de edição/exclusão de registros cadastrais e logs de auditoria. |
| **Técnico** | Lista de e-mails técnicos em `config_roles.js` | Acesso a todas as visões analíticas estaduais, observações e gestão operacional. |
| **Tutor** | Mapeado pelo e-mail na base de tutores | Visualização global de turmas, cursistas, formadores e **todas as observações da prática pedagógica**. Não tem acesso ao Painel Admin. |
| **Formador** | Mapeado pelo e-mail do formador | Visualização filtrada de suas turmas e cursistas, acesso ao Dossiê Pedagógico e inserção de observações. |
| **Cursista** | Mapeado pelo e-mail do professor cursista | Acesso ao **Ambiente do Cursista**, com dados funcionais, histórico próprio de observações e solicitações. |

---

## 4. Módulos e Funcionalidades da Plataforma

### 4.1 Panorama Geral (`Panorama.jsx`)
* Visão macro da formação continuada no Paraná.
* Indicadores globais: Total de Cursistas, Formadores, Tutores, Turmas ativas e taxas percentuais de observação da prática.
* Gráficos por Núcleo Regional de Educação (NRE) e por componente curricular.

### 4.2 Gestão de Turmas (`ListaTurmas.jsx`)
* Filtros em cascata: **Tutor ➔ Formador ➔ Busca textual por Turma / Componente**.
* Cartões informativos de turmas com turno, horários, dia da semana e links para o **Google Classroom**.
* Abertura do modal de cursistas da turma com ensalamento completo, CGM, e-mail institucional e botão direto para o **Dossiê / Obs**.

### 4.3 Observação da Prática Pedagógica (`ObservacaoPratica.jsx` & `ObservacoesOverview.jsx`)
* Tabela analítica completa com todas as observações registradas no estado.
* Filtros por Semestre, Tutor, NRE, Componente Curricular, Ano Formativo e Status (Realizada / Não Realizada).
* Acesso direto a gravações de aula, gravações de feedback e planos de aula (PDP).
* Exportação consolidada de relatórios em formato CSV.
* Botão de inserção global de nova observação.

### 4.4 Diretório de Contatos (`ContatoFormadores.jsx` e `ContatoCursistas.jsx`)
* Consulta rápida de e-mails, CGMs, municípios e ensalamento de professores e formadores.
* Exportação para planilhas e relatórios para comunicação direta.

### 4.5 Dados da Tutoria (`DadosTutoria.jsx`)
* Acompanhamento dos tutores estaduais, volume de cursistas atendidos por NRE e análise de SLA.

### 4.6 Ambiente do Cursista (`AmbienteCursista.jsx`)
* Visão exclusiva para o cursista: histórico de observações realizadas, feedbacks recebidos e abertura de chamados/remanejamento.

### 4.7 Painel Administrativo (`AdminPanel.jsx`)
* Módulo exclusivo para Administradores.
* Permite remanejar cursistas de turma, editar dados cadastrais e registrar justificativas com auditoria permanente.

---

## 5. Nova Ferramenta "Observar" (Observação da Prática Pedagógica)

A **Ferramenta Observar** foi criada para permitir que **Formadores, Tutores e Técnicos** analisem a trajetória pedagógica de cada cursista e lancem novas observações diretamente na plataforma, alimentando simultaneamente o banco de dados e as planilhas oficiais.

```
┌────────────────────────────────────────────────────────────────────────┐
│                      FLUXO DA FERRAMENTA OBSERVAR                      │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Formador/Tutor abre a aba "Turmas" e escolhe sua turma.             │
│ 2. Clica sobre o Cursista ou no botão "📊 Dossiê".                     │
│ 3. Abre o Dossiê Pedagógico do Cursista:                               │
│    - KPIs de Nível Atual (Prática e Planejamento).                     │
│    - Gráfico de Evolução Profissional Cronológico (1º ao mais recente).│
│    - Linha do Tempo com histórico de devolutivas anteriores.           │
│ 4. Clica em "➕ Inserir Nova Observação".                              │
│ 5. Formulário abre pré-preenchido com dados do Cursista e da Turma.    │
│ 6. Ao salvar, ocorre o DUAL-SYNC:                                      │
│    - Persistência instantânea no LocalStorage (feedback imediato).    │
│    - Gravação assíncrona na tabela `observacoes_pratica` do Supabase.  │
│    - Envio via POST para o Google Apps Script (append no Google Sheets)│
│ 7. O Dossiê, o Gráfico e os KPIs atualizam na mesma hora na tela!      │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 5.1 Dossiê Pedagógico do Cursista (`DossieCursistaModal.jsx`)

Ao selecionar qualquer cursista na listagem de turmas ou observações, o **Dossiê Pedagógico** é aberto exibindo:

1. **Cabeçalho de Identificação:**
   * Nome completo, e-mail institucional, CGM e município.
   * Turma, componente curricular, formador e tutor responsável.
2. **Cards de KPIs Pedagógicos:**
   * **Total de Observações Realizadas**: Contagem de observações concluídas.
   * **Nível da Prática Pedagógica**: Nível atingido na observação mais recente.
   * **Nível do Planejamento (PDP)**: Nível de elaboração e coerência do planejamento.
   * **Análise de Trajetória**: Indicador automatizado comparando a última observação com a penúltima (*Evolução Positiva $+1$, Manteve Nível Supera, Estável, ou Regressão*).
3. **Botão de Ação Primária:**
   * Botão destacado **`➕ Inserir Nova Observação`** no cabeçalho do dossiê.

---

### 5.2 Gráfico de Evolução Profissional em Tempo Real

O Dossiê conta com um gráfico responsivo em SVG nativo comparativo entre:
* 🟢 **Prática Pedagógica Docente** (linha verde esmeralda);
* 🔵 **Planejamento da Aula / PDP** (linha azul institucional).

#### Escala Pedagógica de Pontuação (1 a 4):
* **Nível 4 (SUPERA)**: Prática exemplar que ultrapassa os objetivos previstos com autonomia.
* **Nível 3 (ATINGE INTEGRALMENTE)**: Atende com segurança e autonomia todos os critérios formativos.
* **Nível 2 (ATINGE PARCIALMENTE)**: Atende em parte, necessita de intervenção mediada e devolutiva focada.
* **Nível 1 (NÃO ATINGE)**: Não demonstrou os critérios pedagógicos esperados.

#### Ordenação Cronológica Estrita:
O gráfico plota rigorosamente da **observação mais antiga (esquerda)** para a **mais recente (direita)**:
* `Obs #1` (Etapa inicial) ➔ `Obs #2` ➔ `Obs #3`...
* O sistema utiliza a função utilitária `parseDateToTimestamp` para interpretar com precisão tanto datas no formato brasileiro (`DD/MM/YYYY`) quanto formatos ISO (`YYYY-MM-DD`), garantindo a ordem cronológica perfeita da evolução.

---

### 5.3 Formulário de Inserção de Observação (`FormularioInserirObservacao.jsx`)

Desenvolvido para replicar fielmente todos os campos do formulário oficial do Google Forms da SEED/PR:

1. **Status da Observação:**
   * Botão seletor: *Observação Realizada com Sucesso* ou *Não Realizada / Justificada*.
   * Caso seja *Não Realizada*, habilita campo obrigatório para justificativa pedagógica.
2. **Dados do Ciclo Formativo:**
   * Ano Formativo (1º ANO, 2º ANO ou 3º ANO).
   * Semestre de Aplicação (1º Semestre ou 2º Semestre).
   * Formato da Devolutiva (Diálogo formativo online via Meet, Devolutiva gravada ou Encontro presencial).
   * Datas (Data da prática observada, data da observação e data da devolutiva/feedback).
3. **Avaliação dos Níveis Pedagógicos:**
   * Nível de Planejamento (Supera, Atinge Integralmente, Atinge Parcialmente, Não Atinge).
   * Nível da Prática Pedagógica.
4. **Links e Evidências:**
   * Link da gravação da prática pedagógica (vídeo da aula).
   * Link do documento de planejamento pedagógico (PDP).
   * Link da gravação do diálogo formativo (feedback).
5. **Registros Qualitativos Pedagógicos:**
   * **Evidências do Planejamento**: Descrição dos pontos fortes e lacunas no plano de aula.
   * **Evidências da Prática**: Comportamentos e metodologias observadas durante a aula.
   * **Questionamentos Propositivos**: Perguntas orientadoras feitas ao professor durante o feedback.
   * **Proposições e Sugestões**: Orientações pedagógicas para o aperfeiçoamento da prática.
   * **Combinados de Ação**: Prazos e metas acordados para as próximas etapas.

---

### 5.4 Dual-Sync & Resiliência de Dados (Supabase + Google Sheets + Local)

Para garantir que o formulário funcione em qualquer circunstância (mesmo com instabilidade de rede ou falhas de CORS), foi implementada uma arquitetura em 3 camadas no serviço [`observacoesSyncService.js`](file:///c:/Users/pseudocelomado/Documents/DESENVOLVIMENTO/ESTAGIO/dashboard-tawny-delta-96.vercel.app/dashboard-main/src/utils/observacoesSyncService.js):

1. **Camada 1 - Persistência Local Imediata (`localStorage`):**
   * A observação é salva instantaneamente na chave `ep_observacoes_locais_novas`.
   * O estado do React no `App.jsx` é atualizado no mesmo milissegundo, fazendo o Dossiê, o Gráfico de Evolução e a listagem recalcularem na hora na tela.
2. **Camada 2 - Banco de Dados em Nuvem (Supabase):**
   * O payload é inserido diretamente na tabela `observacoes_pratica` via `@supabase/supabase-js`.
3. **Camada 3 - Planilha Oficial do Google (Google Apps Script):**
   * O endpoint `VITE_APPS_SCRIPT_URL` recebe uma requisição POST com `{ action: 'inserir_observacao_pratica', dados: ... }`.
   * O Apps Script adiciona a linha diretamente na planilha correta do Google Drive correspondente ao semestre e ano formativo do cursista via `appendRow()`.

---

## 6. Dicionário de Dados (`observacoes_pratica`)

Estrutura da tabela PostgreSQL no Supabase:

| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `TEXT / BIGINT` | Identificador único da observação. |
| `id_origem` | `TEXT` (UNIQUE) | ID único de rastreabilidade (ex: `DASH_1ANO_2SEM_1728492000000`). |
| `carimbo` | `TEXT` | Data e hora do envio (formato `DD/MM/YYYY HH:mm:ss`). |
| `email_cursista` | `TEXT` | E-mail institucional do professor cursista (`@escola.pr.gov.br`). |
| `nome_cursista` | `TEXT` | Nome completo do cursista. |
| `email_formador` | `TEXT` | E-mail institucional do formador responsável. |
| `nome_formador` | `TEXT` | Nome completo do formador. |
| `ano_formativo` | `TEXT` | Ano de formação (`1º ANO`, `2º ANO`, `3º ANO`). |
| `semestre` | `TEXT` | Semestre formativo (`1º Semestre`, `2º Semestre`). |
| `modalidade` | `TEXT` | Modalidade docente (`Docentes`, `Equipe Gestora`, etc.). |
| `componente` | `TEXT` | Componente curricular / disciplina. |
| `tema` | `TEXT` | Temática pedagógica trabalhada na formação. |
| `observacao_realizada`| `TEXT` | Texto de confirmação (`Sim, a observação foi realizada.` / `Não realizada`). |
| `is_realizada` | `BOOLEAN` | Indicador booleano (`true` para realizada, `false` para pendente/justificada). |
| `data_pratica` | `DATE / TEXT` | Data da aula observada. |
| `data_observacao` | `DATE / TEXT` | Data de registro da observação. |
| `data_feedback` | `DATE / TEXT` | Data em que ocorreu o diálogo formativo / devolutiva. |
| `modalidade_feedback`| `TEXT` | Formato do feedback (`Diálogo formativo`, `Devolutiva gravada`, etc.). |
| `link_gravacao_pratica`| `TEXT` | Link do vídeo da aula gravada (Google Drive / YouTube). |
| `link_planejamento` | `TEXT` | Link do documento de plano de aula (Google Docs / Drive). |
| `link_gravacao_feedback`| `TEXT`| Link do vídeo da devolutiva pedagógica. |
| `nivel_planejamento` | `TEXT` | `SUPERA`, `ATINGE INTEGRALMENTE`, `ATINGE PARCIALMENTE`, `NÃO ATINGE`. |
| `nivel_pratica` | `TEXT` | `SUPERA`, `ATINGE INTEGRALMENTE`, `ATINGE PARCIALMENTE`, `NÃO ATINGE`. |
| `evidencias_planejamento`| `TEXT` | Registro qualitativo das evidências observadas no plano. |
| `evidencias_pratica` | `TEXT` | Registro qualitativo das evidências da prática docente. |
| `questionamentos_propositivos`| `TEXT`| Perguntas reflexivas apresentadas pelo formador. |
| `proposicoes_sugestoes`| `TEXT` | Sugestões de encaminhamentos pedagógicos. |
| `combinados` | `TEXT` | Ações acordadas entre formador e cursista. |
| `justificativa_nao_realizada`| `TEXT`| Motivo detalhado caso a observação não tenha ocorrido. |

---

## 7. Integração com Google Sheets (Google Apps Script)

O script unificado está localizado em:
[`google-apps-script/sync_observacoes_todas_planilhas.js`](file:///c:/Users/pseudocelomado/Documents/DESENVOLVIMENTO/ESTAGIO/dashboard-tawny-delta-96.vercel.app/dashboard-main/google-apps-script/sync_observacoes_todas_planilhas.js)

### Planilhas Conectadas:
1. `Formador-1ANO_1SEM` (Carga histórica fechada)
2. `Formador-2e3ANO-2SEM` (Planilha ativa 2026)
3. `Formador-1ANO_2SEM` (Planilha ativa 2026)
4. `Formador-2e3ANO-1SEM` (Carga histórica fechada)

### Como Configurar o Web App no Google Drive:
1. Abra o projeto no [Google Apps Script](https://script.google.com/).
2. Cole o código atualizado do arquivo `sync_observacoes_todas_planilhas.js`.
3. Clique em **Implantar (Deploy)** ➔ **Nova implantação (New deployment)**.
4. Selecione o tipo **Aplicativo da Web (Web app)**:
   * *Executar como*: **Eu** (sua conta Google).
   * *Quem tem acesso*: **Qualquer pessoa (Anyone)**.
5. Copie a URL gerada e configure como `VITE_APPS_SCRIPT_URL` no arquivo `.env`.

---

## 8. Guia de Execução Local e Manutenção

Para rodar ou compilar o sistema localmente em máquinas corporativas da SEED (mesmo sem permissões administrativas para instalar pacotes globais npm):

### 8.1 Iniciar o Dashboard Localmente
Basta executar com dois cliques o arquivo na raiz do projeto:
* **[`iniciar_dashboard.cmd`](file:///c:/Users/pseudocelomado/Documents/DESENVOLVIMENTO/ESTAGIO/dashboard-tawny-delta-96.vercel.app/dashboard-main/iniciar_dashboard.cmd)**

Ou via terminal:
```bash
python servidor_local.py
```
O servidor SPA inicializará em **`http://localhost:5173`** e abrirá o navegador padrão automaticamente.

### 8.2 Compilar o Código do React para a Pasta `dist/`
Sempre que fizer alterações no código-fonte em `src/`, execute o compilador otimizado:
```bash
python build_dist.py
```
O script utiliza o binário embutido do `esbuild` para reempacotar toda a aplicação em aproximadamente **3 a 4 segundos**, gerando o bundle pronto para distribuição e produção.

### 8.3 Branches do Git
* Branch principal de produção: `main`
* Branch da nova ferramenta de observação: `nova-ferramenta-observar`

Para alternar entre branches no terminal:
```bash
git checkout nova-ferramenta-observar
git pull origin nova-ferramenta-observar
```

---

## 9. Deploy e Variáveis de Ambiente

Ao publicar a plataforma na Vercel ou em servidor de produção, configure as seguintes variáveis no painel de Environment Variables:

```env
# Conexão com o Supabase (PostgreSQL)
VITE_SUPABASE_URL=https://sua-instancia.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_public_key

# URL do Web App do Google Apps Script (Sincronização com Google Sheets)
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/SEU_ID_DO_SCRIPT/exec

# Firebase Realtime Database (Módulo legado/híbrido)
VITE_FIREBASE_API_KEY=sua_api_key
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://seu-projeto-default-rtdb.firebaseio.com/
VITE_FIREBASE_PROJECT_ID=seu-projeto-id
```

---

*Documentação mantida pela Equipe de Desenvolvimento e Acompanhamento do Estágio Probatório - SEED/PR.*
