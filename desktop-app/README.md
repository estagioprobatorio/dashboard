# Sistema de Gestão de Movimentações (Java Swing)
## SEED-PR · Estágio Probatório

Aplicativo desktop oficial em **Java Swing** para registro, atendimento e gestão de movimentações e trocas de turmas de cursistas diretamente no **TiDB Cloud Serverless**.

---

### Principais Características
- **Independente de Planilhas:** Grava diretamente no banco de dados TiDB Cloud Serverless (`estagio_probatorio`).
- **Conexão Resiliente Dupla:**
  - Conexão nativa via **MySQL JDBC** na porta 4000 com criptografia TLS.
  - Fallback automático via **HTTPS REST API** na porta 443 com o token `l26zXdDT0Mm3h_KOF9hehDotnB6FYJyg` (garantindo funcionamento mesmo em redes estaduais com proxy/firewall restritivo).
- **Sincronismo em Tempo Real com o Dashboard Web:** Todas as movimentações cadastradas no Java Swing aparecem imediatamente na consulta do dashboard web da SEED-PR.
- **As Planilhas como Backup:** As planilhas do Google Sheets agora funcionam estritamente como repositório de backup através do menu `⚡ ESTÁGIO PROBATÓRIO`.

---

### Como Compilar e Executar

#### Opção 1: Via Maven
```bash
cd desktop-app
mvn clean package
java -jar target/ep-movimentacoes-swing-1.0.0.jar
```

#### Opção 2: Via IDE (IntelliJ IDEA, Eclipse, VS Code ou NetBeans)
1. Abra a pasta `desktop-app` como um projeto Maven.
2. Execute a classe principal: `br.gov.pr.seed.ep.Main`.

---

### Campos Registrados
- Nome do Cursista, CPF, CGM e E-mail Institucional (@escola.pr.gov.br)
- Turma Anterior e Turma Nova
- Tipo de Ação (Troca de Turma, Alteração de Modalidade, Vínculo na AF, etc.)
- Tutor Responsável e NRE de Exercício
- Motivo e Justificativa Administrativa
- Status (Deferido, Em Análise, Concluído)
