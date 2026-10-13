# 🎓 Dashboard Estágio Probatório - SEED/PR

Plataforma unificada para gestão pedagógica, acompanhamento de turmas, tutores, formadores e professores cursistas do **Programa de Acompanhamento do Estágio Probatório Docente da Secretaria de Estado da Educação do Paraná (SEED/PR)**.

---

## 🚀 Novidade: Ferramenta "Observar" (Observação da Prática Pedagógica)

A plataforma conta com um módulo completo de **Observação da Prática Pedagógica**, permitindo que formadores, tutores e técnicos:
* Consultem o **Dossiê Pedagógico Individual** de cada cursista com KPIs consolidados;
* Visualizem o **Gráfico de Evolução Profissional em Tempo Real** (comparando Prática Docente vs. Planejamento PDP em escala de 1 a 4 ao longo do tempo);
* Acessem a **Linha do Tempo Cronológica** com todo o histórico de aulas observadas, feedbacks e evidências;
* **Insiram novas observações diretamente pela plataforma** por meio de um formulário interativo pré-preenchido que alimenta simultaneamente o banco de dados (**Supabase**) e a planilha oficial do Google Drive (**Google Sheets via Apps Script**), com resiliência local offline (**LocalStorage**).

---

## 📚 Documentação Completa

Para acessar o manual técnico completo e detalhado de toda a plataforma, arquitetura, dicionário de dados, controle de permissões (RBAC) e integrações:

👉 **[Consulte a DOCUMENTACAO_PLATAFORMA.md](./DOCUMENTACAO_PLATAFORMA.md)**

---

## ⚡ Como Rodar Localmente

### Opção 1: Inicialização Direta (Sem dependências adicionais)
Dê um duplo clique no arquivo executável na raiz do projeto:
* **`iniciar_dashboard.cmd`**

### Opção 2: Via Terminal (Python)
```bash
python servidor_local.py
```
Acesse no navegador: **`http://localhost:5173`**

### Como Compilar Alterações em `src/` (Ambientes com Restrição de npm)
```bash
python build_dist.py
```

---

## 🌿 Branches Principais

* **`main`**: Versão de produção em uso na Vercel.
* **`nova-ferramenta-observar`**: Branch contendo a nova Ferramenta Observar, Dossiê Pedagógico e dual-sync integrado.

---

*Secretaria de Estado da Educação do Paraná • SEED/PR*
