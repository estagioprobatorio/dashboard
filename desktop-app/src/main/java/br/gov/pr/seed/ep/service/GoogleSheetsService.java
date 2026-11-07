package br.gov.pr.seed.ep.service;

import br.gov.pr.seed.ep.model.DadosNotificacaoEmail;
import br.gov.pr.seed.ep.model.Solicitacao;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public class GoogleSheetsService {

    private static final String VERCEL_API_URL = "https://dashboard-tawny-delta-96.vercel.app/api/v2";
    private static final String SYNC_TOKEN = "l26zXdDT0Mm3h_KOF9hehDotnB6FYJyg";

    private final DatabaseService dbService = new DatabaseService();

    /**
     * Busca solicitações pendentes do banco TiDB Cloud e planilhas.
     */
    public List<Solicitacao> carregarSolicitacoesPendentes() {
        List<Solicitacao> lista = new ArrayList<>();

        // 1. Busca da base do TiDB Cloud (Apenas solicitações a partir de 03/11/2026)
        try (Connection conn = dbService.getConnection()) {
            String sql = "SELECT mv.ext_id, mv.registrado_em, mv.tipo_acao, mv.turma_anterior, mv.turma_nova, " +
                    "mv.motivo, mv.justificativa, mv.status, mv.tutor_responsavel, mv.email_tutor_resp, " +
                    "COALESCE(u.nome, mv.solicitado_por_nome) AS nome_cursista, " +
                    "COALESCE(u.email_inst, '') AS email_cursista, " +
                    "COALESCE(u.cgm_ultimos3, '') AS cgm_ultimos3, " +
                    "COALESCE(v.linha_funcional, 1) AS linha_funcional, " +
                    "COALESCE(n.nome, 'SEED-PR') AS nre " +
                    "FROM movimentacao mv " +
                    "LEFT JOIN usuario u ON u.id = mv.usuario_id " +
                    "LEFT JOIN vinculo v ON v.usuario_id = u.id AND v.linha_funcional = 1 " +
                    "LEFT JOIN nre n ON n.id = mv.nre_id " +
                    "WHERE (mv.status = 'Pendente' OR mv.status = 'Em Análise' OR mv.status IS NULL) " +
                    "AND mv.registrado_em >= '2026-11-03' " +
                    "ORDER BY mv.registrado_em ASC";

            try (Statement st = conn.createStatement(); ResultSet rs = st.executeQuery(sql)) {
                while (rs.next()) {
                    Solicitacao s = new Solicitacao();
                    String extId = rs.getString("ext_id");
                    s.setId(extId);
                    s.setDataSolicitacao(rs.getString("registrado_em"));
                    s.setNomeCursista(rs.getString("nome_cursista"));
                    
                    // Extração inteligente de CGM do ext_id (ex: MOV_TT_7771006838_1143)
                    String cgm = rs.getString("cgm_ultimos3");
                    if ((cgm == null || cgm.isEmpty() || cgm.length() < 7) && extId != null) {
                        java.util.regex.Matcher m = java.util.regex.Pattern.compile("_(\\d{7,10})_").matcher(extId);
                        if (m.find()) {
                            cgm = m.group(1);
                        }
                    }
                    s.setCgm(cgm != null ? cgm : "");
                    s.setLinhaFuncional(String.valueOf(rs.getInt("linha_funcional")));
                    s.setEmailCursista(rs.getString("email_cursista"));
                    s.setTurmaAntiga(rs.getString("turma_anterior"));
                    s.setTurmaNova(rs.getString("turma_nova"));
                    s.setTipoAcao(rs.getString("tipo_acao"));
                    s.setMotivo(rs.getString("motivo"));
                    s.setJustificativa(rs.getString("justificativa"));
                    s.setStatus(rs.getString("status") != null ? rs.getString("status") : "Pendente");
                    s.setOrigem("Planilha Mestra (TiDB)");
                    lista.add(s);
                }
            }
        } catch (Exception e) {
            System.err.println("[TiDB Solicitacoes Error]: " + e.getMessage());
        }

        return lista;
    }

    /**
     * Efetiva a decisão da movimentação:
     * 1. Altera a turma do cursista na Coluna H (aba CURSISTAS/DADOS).
     * 2. Registra na aba "Histórico de Movimentações" (com CGM, LF, Turma Antiga, Turma Nova, Cód SERE, Status E-mail).
     * 3. Atualiza no TiDB Cloud.
     * 4. Retorna os dados pré-preenchidos para envio de e-mail aos envolvidos.
     */
    public DadosNotificacaoEmail processarMovimentacao(Solicitacao sol, String statusDecisao, String codSere, String notaResolucao) {
        DadosNotificacaoEmail emailData = new DadosNotificacaoEmail();
        emailData.setCursistaNome(sol.getNomeCursista());
        emailData.setCursistaEmail(sol.getEmailCursista());
        emailData.setCgm(sol.getCgm());
        emailData.setLinhaFuncional(sol.getLinhaFuncional() != null ? sol.getLinhaFuncional() : "1");
        emailData.setTurmaAntiga(sol.getTurmaAntiga());
        emailData.setTurmaNova(sol.getTurmaNova());
        emailData.setCodSereNova(codSere);
        emailData.setTipoAcao(sol.getTipoAcao());
        emailData.setStatusDecisao(statusDecisao);
        emailData.setNotaResolucao(notaResolucao);
        emailData.setDataEfetivacao(java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss")));

        // 1. Resolve os dados de Tutores e Formadores no TiDB Cloud
        resolverTutorEFormador(emailData);

        // 2. Atualiza a movimentação no TiDB Cloud (status = Deferido ou Indeferido)
        try (Connection conn = dbService.getConnection()) {
            String sql = "UPDATE movimentacao SET status = ?, nota_resolucao = ?, turma_nova = COALESCE(?, turma_nova) WHERE ext_id = ?";
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setString(1, statusDecisao);
                ps.setString(2, notaResolucao);
                ps.setString(3, sol.getTurmaNova());
                ps.setString(4, sol.getId());
                ps.executeUpdate();
            }

            // Se DEFERIDO, atualiza também a matrícula do cursista para a nova turma
            if ("Deferido".equalsIgnoreCase(statusDecisao) && sol.getTurmaNova() != null && !sol.getTurmaNova().isEmpty()) {
                String sqlMat = "UPDATE matricula m " +
                        "JOIN vinculo v ON v.id = m.vinculo_id " +
                        "JOIN usuario u ON u.id = v.usuario_id " +
                        "JOIN turma tNova ON tNova.codigo = ? " +
                        "SET m.turma_id = tNova.id " +
                        "WHERE (u.email_inst = ? OR u.cgm_ultimos3 = ?) AND m.na_base_ativa = 1";
                try (PreparedStatement psMat = conn.prepareStatement(sqlMat)) {
                    psMat.setString(1, sol.getTurmaNova());
                    psMat.setString(2, sol.getEmailCursista());
                    psMat.setString(3, sol.getCgm());
                    psMat.executeUpdate();
                }
            }
        } catch (Exception e) {
            System.err.println("[TiDB Update Movimentacao Error]: " + e.getMessage());
        }

        // 3. Notifica a API Vercel / Apps Script para gravação na Coluna H e na aba "Histórico de Movimentações"
        enviarSincronizacaoPlanilha(sol, statusDecisao, codSere, notaResolucao);

        return emailData;
    }

    private void resolverTutorEFormador(DadosNotificacaoEmail emailData) {
        try (Connection conn = dbService.getConnection()) {
            // Turma Anterior: Busca Tutor e Formador
            if (emailData.getTurmaAntiga() != null && !emailData.getTurmaAntiga().isEmpty()) {
                String sql = "SELECT t.codigo, tut.nome AS tutor_nome, tut.email_inst AS tutor_email, " +
                        "form.nome AS formador_nome, form.email_inst AS formador_email " +
                        "FROM turma t " +
                        "LEFT JOIN usuario tut ON tut.id = t.tutor_id " +
                        "LEFT JOIN usuario form ON form.id = t.formador_id " +
                        "WHERE t.codigo = ?";
                try (PreparedStatement ps = conn.prepareStatement(sql)) {
                    ps.setString(1, emailData.getTurmaAntiga());
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            emailData.setTutorAntigoNome(rs.getString("tutor_nome"));
                            emailData.setTutorAntigoEmail(rs.getString("tutor_email"));
                            emailData.setFormadorAntigoNome(rs.getString("formador_nome"));
                            emailData.setFormadorAntigoEmail(rs.getString("formador_email"));
                        }
                    }
                }
            }

            // Turma Nova: Busca Tutor e Formador
            if (emailData.getTurmaNova() != null && !emailData.getTurmaNova().isEmpty()) {
                String sql = "SELECT t.codigo, tut.nome AS tutor_nome, tut.email_inst AS tutor_email, " +
                        "form.nome AS formador_nome, form.email_inst AS formador_email " +
                        "FROM turma t " +
                        "LEFT JOIN usuario tut ON tut.id = t.tutor_id " +
                        "LEFT JOIN usuario form ON form.id = t.formador_id " +
                        "WHERE t.codigo = ?";
                try (PreparedStatement ps = conn.prepareStatement(sql)) {
                    ps.setString(1, emailData.getTurmaNova());
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            emailData.setTutorNovoNome(rs.getString("tutor_nome"));
                            emailData.setTutorNovoEmail(rs.getString("tutor_email"));
                            emailData.setFormadorNovoNome(rs.getString("formador_nome"));
                            emailData.setFormadorNovoEmail(rs.getString("formador_email"));
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("[Resolver Turmas Error]: " + e.getMessage());
        }
    }

    private void enviarSincronizacaoPlanilha(Solicitacao sol, String statusDecisao, String codSere, String nota) {
        try {
            URL url = URI.create(VERCEL_API_URL + "?action=sync_movimentacoes_bulk").toURL();
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
            conn.setRequestProperty("X-Sync-Token", SYNC_TOKEN);
            conn.setDoOutput(true);
            conn.setConnectTimeout(8000);

            String payload = String.format("{\"action\":\"sync_movimentacoes_bulk\",\"movimentacoes\":[{" +
                            "\"id\":\"%s\",\"cgm\":\"%s\",\"linha_funcional\":\"%s\",\"nome_cursista\":\"%s\"," +
                            "\"emailCursista\":\"%s\",\"cpf\":\"%s\",\"turma_anterior\":\"%s\",\"turma_nova\":\"%s\"," +
                            "\"tipo_acao\":\"%s\",\"motivo\":\"%s\",\"justificativa\":\"%s\",\"status\":\"%s\"," +
                            "\"nota_resolucao\":\"%s\",\"solicitadoPor\":\"Sistema Desktop Java Swing\"" +
                            "}]}",
                    sol.getId() != null ? sol.getId() : "MOV_SWING_" + System.currentTimeMillis(),
                    escapeJson(sol.getCgm()),
                    escapeJson(sol.getLinhaFuncional()),
                    escapeJson(sol.getNomeCursista()),
                    escapeJson(sol.getEmailCursista()),
                    escapeJson(sol.getCpf()),
                    escapeJson(sol.getTurmaAntiga()),
                    escapeJson(sol.getTurmaNova()),
                    escapeJson(sol.getTipoAcao()),
                    escapeJson(sol.getMotivo()),
                    escapeJson(nota),
                    escapeJson(statusDecisao),
                    escapeJson(nota)
            );

            try (OutputStream os = conn.getOutputStream()) {
                os.write(payload.getBytes(StandardCharsets.UTF_8));
            }
            conn.getResponseCode();
        } catch (Exception e) {
            System.err.println("[Planilha Sync Warning]: " + e.getMessage());
        }
    }

    /**
     * Dispara o envio oficial do e-mail aos envolvidos.
     */
    public boolean dispararEmailOficial(DadosNotificacaoEmail dados, String assunto, String corpo) {
        try {
            // Monta URI mailto segura para o cliente padrão do sistema
            StringBuilder mailto = new StringBuilder("mailto:");
            if (dados.getCursistaEmail() != null && !dados.getCursistaEmail().isEmpty()) {
                mailto.append(dados.getCursistaEmail());
            }

            List<String> ccs = new ArrayList<>();
            if (dados.getFormadorAntigoEmail() != null && dados.getFormadorAntigoEmail().contains("@")) ccs.add(dados.getFormadorAntigoEmail());
            if (dados.getFormadorNovoEmail() != null && dados.getFormadorNovoEmail().contains("@")) ccs.add(dados.getFormadorNovoEmail());
            if (dados.getTutorAntigoEmail() != null && dados.getTutorAntigoEmail().contains("@")) ccs.add(dados.getTutorAntigoEmail());
            if (dados.getTutorNovoEmail() != null && dados.getTutorNovoEmail().contains("@")) ccs.add(dados.getTutorNovoEmail());

            List<String> queryParams = new ArrayList<>();
            if (!ccs.isEmpty()) {
                queryParams.add("cc=" + String.join(",", ccs));
            }
            if (assunto != null && !assunto.isEmpty()) {
                queryParams.add("subject=" + java.net.URLEncoder.encode(assunto, StandardCharsets.UTF_8).replace("+", "%20"));
            }
            if (corpo != null && !corpo.isEmpty()) {
                queryParams.add("body=" + java.net.URLEncoder.encode(corpo, StandardCharsets.UTF_8).replace("+", "%20"));
            }

            if (!queryParams.isEmpty()) {
                mailto.append("?").append(String.join("&", queryParams));
            }

            if (java.awt.Desktop.isDesktopSupported() && java.awt.Desktop.getDesktop().isSupported(java.awt.Desktop.Action.MAIL)) {
                java.awt.Desktop.getDesktop().mail(new URI(mailto.toString()));
                return true;
            }
        } catch (Exception e) {
            System.err.println("[Mail Error]: " + e.getMessage());
        }
        return false;
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", " ").replace("\r", "");
    }
}
