# Tutorial de Implementação - Dashboard Real-time (Google Sheets + Firebase + Vercel)

Este guia prático ensina a configurar as contas gratuitas do **Firebase (Database + Authentication)** e do **Google Sheets (Apps Script)** para conectar sua planilha original ao **Dashboard hospedado na Vercel**, garantindo login institucional do Google e controle de acesso personalizado por perfil (RBAC).

---

## 📌 Visão Geral do Fluxo

1. **Autenticação (Google Sign-In)**: O usuário faz login usando sua conta do Google (ex: institucional `@escola.pr.gov.br`).
2. **Controle de Acesso (RBAC)**: O sistema identifica a função do usuário baseado no e-mail logado:
   * **Admin / Técnico**: Visualiza a base de dados completa. Admins podem editar e deletar cursistas (com log automático).
   * **Tutor**: Visualiza apenas os formadores, turmas e cursistas que ele acompanha. Acessa a linha do tempo de movimentações (entradas/saídas) da sua tutoria.
   * **Formador**: Visualiza apenas os seus próprios cursistas e turmas.
3. **Planilha como Fonte de Verdade**: Edições feitas na planilha do Google atualizam o Firebase em milissegundos. Edições feitas no Painel Admin do Dashboard são salvas de volta na planilha por meio da API do Apps Script.

---

## 🛠️ Passo 1: Configurar o Firebase (Database + Authentication)

### 1.1 Criar o Projeto
1. Acesse o [Firebase Console](https://console.firebase.google.com/) com sua conta Google.
2. Clique em **Adicionar projeto** e crie um projeto (ex: `estagio-probatorio-dashboard`).

### 1.2 Ativar o Realtime Database
1. No menu lateral esquerdo, clique em **Build** (Construir) -> **Realtime Database**.
2. Clique em **Criar banco de dados**, selecione a localização e avance.
3. Selecione **Iniciar em modo de teste** (permite leitura/escrita aberta por 30 dias para testes iniciais) e ative.
4. **Copie a URL do seu Banco de Dados** que aparece no topo da tela (`https://nome-do-projeto-default-rtdb.firebaseio.com/`).

### 1.3 Ativar o Login com o Google (Autenticação)
1. No menu lateral esquerdo, clique em **Build** -> **Authentication**.
2. Clique em **Get Started** (Começar).
3. Na aba **Sign-in method** (Método de login), clique em **Adicionar novo provedor** e escolha **Google**.
4. Ative (chave "Enable"), dê um nome público ao projeto, selecione o e-mail de suporte do projeto e clique em **Salvar**.
5. No topo da página de Authentication, clique em **Web setup** ou acesse a engrenagem ao lado de "Project Overview" -> **Configurações do Projeto** para obter os códigos do seu aplicativo:
   * Role a página até "Seus aplicativos" e crie um aplicativo do tipo **Web (</>)**.
   * Salve as chaves geradas (`apiKey`, `authDomain`, `appId`, etc.). Elas serão usadas nas variáveis de ambiente.

---

## 📝 Passo 2: Configurar o Google Apps Script na Planilha

1. Abra a sua planilha original no Google Drive.
2. Clique em **Extensões** -> **Apps Script**.
3. Apague todo o conteúdo e cole o código contido em:
   * 🔗 [google-apps-script/code.js](file:///c:/Users/pseudocelomado/Documents/SEED/NOVO_DASHBOARD/google-apps-script/code.js)
4. No início do código do script, substitua a string `SUA_FIREBASE_DATABASE_URL_AQUI` pela **URL do banco de dados** que você copiou no Passo 1 (mantenha a barra `/` no final).
5. Salve o script.
6. Execute a carga de dados inicial: selecione a função `syncAllData` na barra superior e clique em **Executar**. Conceda as permissões de segurança solicitadas na conta Google.

### ⚡ Criar o Gatilho para Edições Automáticas
1. No menu esquerdo do Apps Script, clique no ícone de **Relógio** (Gatilhos).
2. Clique em **+ Adicionar gatilho** (canto inferior direito).
3. Configure:
   * *Função*: `onEdit`
   * *Implantação*: `Head`
   * *Fonte do evento*: `Da planilha`
   * *Tipo de evento*: `Ao editar`
4. Salve.

### 🌐 Criar a API para Edição do Admin (Dashboard -> Planilha)
1. No Apps Script, clique no canto superior direito em **Implantar** -> **Nova implantação**.
2. Selecione o tipo **App da Web** (ícone de engrenagem).
3. Configure:
   * *Descrição*: `API do Dashboard`
   * *Executar como*: `Eu (seu e-mail)`
   * *Quem tem acesso*: `Qualquer pessoa`
4. Clique em **Implantar** e **copie a URL do App da Web** gerada (ela começa com `https://script.google.com/macros/s/...`).

---

## ⚙️ Passo 3: Configurar as Variáveis de Ambiente e Permissões Estáticas

### 3.1 Cadastrar e-mails de Admins e Técnicos
Abra o arquivo local [src/config_roles.js](file:///c:/Users/pseudocelomado/Documents/SEED/NOVO_DASHBOARD/src/config_roles.js) e adicione os e-mails institucionais do Google das pessoas que atuarão como Administradores e Técnicos nas constantes `DEFAULT_ADMINS` e `DEFAULT_TECNICOS`.

### 3.2 Criar o arquivo `.env` local
Crie um arquivo `.env` na raiz da pasta `NOVO_DASHBOARD` e adicione as seguintes credenciais:

```env
# URL do App da Web gerada no Apps Script (Passo 2)
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/SUA_URL_AQUI/exec

# Credenciais da Web App do Firebase (Passo 1.3)
VITE_FIREBASE_API_KEY=sua_api_key_aqui
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://seu-projeto-default-rtdb.firebaseio.com/
VITE_FIREBASE_PROJECT_ID=seu-projeto-id
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
VITE_FIREBASE_APP_ID=seu_app_id
```

---

## 💻 Passo 4: Executar e Testar Localmente (Bypass de Desenvolvimento)

Para rodar localmente e validar se o controle de perfis (RBAC) e as movimentações estão funcionando corretamente:

1. Se necessário, instale o Node.js rodando no terminal do PowerShell como administrador:
   ```powershell
   winget install OpenJS.NodeJS.LTS
   ```
2. Instale as dependências e inicie o projeto:
   ```bash
   npm install
   npm run dev
   ```
3. O navegador abrirá em `http://localhost:3000`. 
4. **Bypass / Simulador de Login:**
   * Se o arquivo `.env` estiver vazio ou desconfigurado, a tela de Login exibirá automaticamente um **Simulador de Acesso**.
   * Você pode selecionar no menu suspenso ou digitar qualquer e-mail presente na base de dados para fingir ser um Admin, Técnico, Tutor ou Formador.
   * Teste logar como um **Tutor** (ex: `dulce.carpes@escola.pr.gov.br`) e confirme se o dashboard filtra automaticamente para exibir apenas as turmas desse tutor.
   * Teste logar como um **Formador** (ex: `osmar.bugalski@escola.pr.gov.br`) e confirme se as informações são restritas apenas aos alunos dele, e se a aba "Movimentações" desaparece do menu.

---

## 🚀 Passo 5: Publicar no GitHub e Vercel (Gratuito)

1. Faça o commit e envie seu projeto para um repositório no seu GitHub.
2. Conecte sua conta da Vercel ao GitHub.
3. Importe o projeto e, na seção **Environment Variables** (Variáveis de Ambiente), adicione todas as variáveis que você configurou no arquivo `.env` (ex: `VITE_FIREBASE_API_KEY`, etc.).
4. Clique em **Deploy**.
5. Pronto! A Vercel gerará o link público seguro para compartilhar com a equipe.

---

## 🛠️ Passo Extra: Extrair IDs e Links de Turmas do Google Classroom

Para facilitar o mapeamento entre a sua planilha original e as salas correspondentes no Google Classroom, você pode usar um script automatizado que extrai as informações diretamente da tela inicial do Classroom.

### Como usar o Extrator:
1. Abra e copie todo o código do script utilitário contido em:
   * 🔗 [google-apps-script/extrator_classroom.js](file:///c:/Users/pseudocelomado/Documents/SEED/NOVO_DASHBOARD/google-apps-script/extrator_classroom.js)
2. Acesse a página inicial do seu [Google Classroom](https://classroom.google.com) (onde os blocos/cards de cada turma são listados).
3. Abra as ferramentas de desenvolvedor pressionando `F12` ou clicando com o botão direito na página e escolhendo **Inspecionar**.
4. Acesse a aba **Console**.
5. Clique em uma área vazia da página do Classroom para garantir o foco da janela e cole o código no console, pressionando `Enter`.
6. O script gerará:
   * Uma **tabela interativa** no console contendo as colunas `Turma`, `Professor`, `ID` (código da turma) e `Link`.
   * Um **JSON formatado** logo abaixo, facilitando a cópia dos dados extraídos para outros fins.
