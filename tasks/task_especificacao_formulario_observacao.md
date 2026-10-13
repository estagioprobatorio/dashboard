# [FE/BE] Renderização Dinâmica do Formulário de Observação por Ano Formativo (1º Ano vs. 2º/3º Anos)

## 📌 Contexto e Objetivo
A plataforma do Programa de Acompanhamento do Estágio Probatório Docente da SEED/PR já possui em funcionamento a abertura da ferramenta de observação pedagógica através do modal do cursista (`DossieCursistaModal.jsx`) com os dados cadastrais básicos pré-preenchidos.

Esta task visa implementar a renderização dinâmica e condicional dos campos pedagógicos no formulário de inserção (`FormularioInserirObservacao.jsx`), adaptando a coleta de evidências e rubricas de acordo com o **Ano Formativo** do professor cursista:
- **1º Ano Formativo:** Avaliação baseada no **Documento de Planejamento de Aula** e nas rubricas de Planejamento e Prática por temática.
- **2º e 3º Anos Formativos:** Avaliação baseada no **Plano de Desenvolvimento Profissional (PDP)**, estruturada por Proposta I e Proposta II com avaliação dos Critérios 1 e 2.

---

## 🎯 Requisitos Funcionais

### 1. Identificação do Ano Formativo do Cursista
- O formulário deve receber o objeto do cursista e identificar a propriedade `ano_formativo` (`"1º ANO"`, `"2º ANO"` ou `"3º ANO"`).
- O fluxo de tela deve chavear dinamicamente os blocos de perguntas e a documentação requerida conforme essa classificação.

---

### 2. Campos Específicos — 1º Ano Formativo (`ano_formativo === '1º ANO'`)
Quando o cursista for do 1º Ano, renderizar:
1. **Documento de Suporte Required:** Campo de input para URL: **Link do Documento de Planejamento**.
2. **Blocos de Rubricas por Temática (T4 a T7):**
   - **Avaliação do PLANEJAMENTO:** Seleção do nível de implementação (*Não Atinge*, *Atende Parcialmente*, *Atende Integralmente*, *Supera*).
   - **Evidências do Planejamento:** Campo de texto livre para registrar de 1 a 3 evidências observadas.
   - **Avaliação da PRÁTICA:** Seleção do nível de implementação da prática pedagógica em sala de aula.
   - **Evidências da Prática:** Campo de texto livre para registrar de 1 a 3 evidências observadas.

---

### 3. Campos Específicos — 2º e 3º Anos Formativos (`ano_formativo === '2º ANO' || '3º ANO'`)
Quando o cursista for do 2º ou 3º Ano, renderizar:
1. **Documento de Suporte Required:** Campo de input para URL: **Link do PDP (Plano de Desenvolvimento Profissional)**.
2. **Seleção de Proposta Pedagógica:**
   - Dropdown/Radio para indicar a proposta escolhida pelo cursista (*Proposta I* ou *Proposta II*).
3. **Blocos de Rubricas por Proposta e Critérios:**
   - **Para a Proposta I / Proposta II:**
     - **Critério 1 - Avaliação da PRÁTICA:** Seleção do nível de implementação.
     - **Critério 1 - Evidências:** Registro de 1 a 3 evidências.
     - **Critério 2 - Avaliação da PRÁTICA:** Seleção do nível de implementação.
     - **Critério 2 - Evidências:** Registro de 1 a 3 evidências.

---

### 4. Campos Comuns (Transversais a Todos os Anos)
Manter no formulário os seguintes campos gerais:
- **Identificação:** Nome do Formador/Tutor/Técnico, Nome do Cursista, E-mail Institucional (@escola.pr.gov.br), NRE e Componente Curricular.
- **Status da Prática:** Indicação se a observação foi realizada ou não (com campo de justificativa em caso negativo).
- **Datas e Agendamento:** Data da prática pedagógica, data da observação e data do feedback/devolutiva.
- **Links de Mídia:** Link da gravação da prática pedagógica e link da gravação do feedback/devolutiva.
- **Modalidade do Feedback:** Seleção entre Diálogo Formativo (síncrono) ou Devolutiva (gravada), com justificativa caso seja devolutiva.
- **Registros Qualitativos Pedagógicos:**
  - Questionamentos Propositivos do Formador.
  - Proposições e Sugestões Formativas.
  - Combinados e Encaminhamentos Pedagógicos.

---

## 🛠️ Mapeamento Técnico e Arquitetura

### 1. Frontend (`FormularioInserirObservacao.jsx`)
- Adicionar lógica condicional no JSX baseada na prop `cursista.ano_formativo`.
- Validar a obrigatoriedade do link correto (`link_planejamento` para 1º Ano x `link_pdp` para 2º e 3º Anos) no momento do submit.

### 2. Camada de Sincronização (`observacoesSyncService.js`)
- **Salvamento Local (`localStorage`):** Gravar o objeto formatado com os atributos específicos do ano para atualização imediata dos componentes de interface (`DossieCursistaModal.jsx` e `GraficoEvolucao.jsx`).
- **Persistência SQL (`Supabase PostgreSQL`):** Inserir ou atualizar na tabela `observacoes_pratica`, garantindo o preenchimento dos campos JSONB/colunas correspondentes às evidências e critérios.
- **Sincronização Google Sheets (`Google Apps Script`):**
  - Acionar a requisição POST via `sync_observacoes_todas_planilhas.js`.
  - Direcionar o `appendRow` para a planilha e aba correspondentes:
    - 1º Ano ➔ Planilha/Aba `Formador-1ANO_2SEM`
    - 2º e 3º Anos ➔ Planilha/Aba `Formador-2e3ANO-2SEM`

---

## ✅ Critérios de Aceite (Definition of Done)

1. [ ] **Chaveamento Dinâmico:** Ao selecionar um cursista do **1º Ano**, o formulário exibe o campo *Link do Documento de Planejamento* e os blocos de rubricas de Planejamento/Prática por temática.
2. [ ] **Chaveamento 2º/3º Ano:** Ao selecionar um cursista do **2º ou 3º Ano**, o formulário exibe o campo *Link do PDP* e a matriz de avaliação por Proposta I/II e Critérios 1/2.
3. [ ] **Validação de Formulário:** O envio é bloqueado se o link do documento do respetivo ano não estiver preenchido.
4. [ ] **Dual-Sync Integrado:** A inserção da observação é armazenada em cache local (`localStorage`), inserida na tabela `observacoes_pratica` do Supabase e sincronizada no Google Sheets na aba do ano correto (`Formador-1ANO_2SEM` ou `Formador-2e3ANO-2SEM`).
5. [ ] **Feedback Visual:** A interface exibe notificação de sucesso e atualiza o Dossiê do Cursista sem necessidade de recarregar a página.
