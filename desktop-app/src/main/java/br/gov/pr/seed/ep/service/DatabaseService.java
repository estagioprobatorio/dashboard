package br.gov.pr.seed.ep.service;

import br.gov.pr.seed.ep.model.Movimentacao;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Serviço de Conexão com TiDB Cloud Serverless.
 * Possui suporte duplo:
 * 1. Conexão direta de alto desempenho via JDBC (porta 4000 com TLS).
 * 2. Fallback automático via REST HTTPS (porta 443) caso a porta 4000 esteja bloqueada pelo firewall.
 */
public class DatabaseService {

    private static final String DB_HOST = "gateway01.sa-east-1.prod.aws.tidbcloud.com";
    private static final int DB_PORT = 4000;
    private static final String DB_NAME = "estagio_probatorio";
    private static final String DB_USER = "2qQCGoHbFUft6ad.root";
    private static final String DB_PASS = "rupB6CCFDb1GqRln";

    private static final String VERCEL_API_URL = "https://dashboard-tawny-delta-96.vercel.app/api/v2";
    private static final String SYNC_TOKEN = "l26zXdDT0Mm3h_KOF9hehDotnB6FYJyg";

    private String getJdbcUrl() {
        return "jdbc:mysql://" + DB_HOST + ":" + DB_PORT + "/" + DB_NAME +
                "?sslMode=REQUIRED&useUnicode=true&characterEncoding=utf8&serverTimezone=America/Sao_Paulo";
    }

    public Connection getConnection() throws SQLException {
        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
        } catch (ClassNotFoundException ignored) {}
        return DriverManager.getConnection(getJdbcUrl(), DB_USER, DB_PASS);
    }

    /**
     * Insere a movimentação no TiDB Cloud diretamente via JDBC ou fallback HTTPS.
     */
    public boolean gravarMovimentacao(Movimentacao m) {
        // Tentativa 1: Via JDBC direto
        try (Connection conn = getConnection()) {
            String sql = "INSERT INTO movimentacao (ext_id, registrado_em, tutor_responsavel, email_tutor_resp, " +
                    "turma_anterior, turma_nova, tipo_acao, motivo, justificativa, status, nota_resolucao, solicitado_por_nome) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                String extId = (m.getId() != null && !m.getId().isEmpty()) ? m.getId() : "MOV_SWING_" + System.currentTimeMillis();
                m.setId(extId);

                ps.setString(1, extId);
                ps.setString(2, m.getTimestamp());
                ps.setString(3, m.getTutor());
                ps.setString(4, m.getEmailTutor());
                ps.setString(5, m.getTurmaAnterior());
                ps.setString(6, m.getTurmaNova());
                ps.setString(7, m.getTipoAcao());
                ps.setString(8, m.getMotivo());
                ps.setString(9, m.getJustificativa());
                ps.setString(10, m.getStatus() != null ? m.getStatus() : "Deferido");
                ps.setString(11, m.getNotaResolucao() != null ? m.getNotaResolucao() : "Concluído via Sistema Desktop Swing");
                ps.setString(12, m.getSolicitadoPor() != null ? m.getSolicitadoPor() : "Operador SEED");

                ps.executeUpdate();
                return true;
            }
        } catch (Exception jdbcEx) {
            System.err.println("[JDBC Warning] Tentando fallback via API HTTPS: " + jdbcEx.getMessage());
        }

        // Tentativa 2: Fallback via API REST Vercel
        return gravarMovimentacaoViaApi(m);
    }

    private boolean gravarMovimentacaoViaApi(Movimentacao m) {
        try {
            URL url = URI.create(VERCEL_API_URL + "?action=sync_movimentacoes_bulk").toURL();
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
            conn.setRequestProperty("X-Sync-Token", SYNC_TOKEN);
            conn.setDoOutput(true);
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(15000);

            String extId = (m.getId() != null && !m.getId().isEmpty()) ? m.getId() : "MOV_SWING_" + System.currentTimeMillis();
            m.setId(extId);

            String jsonPayload = String.format("{\"action\":\"sync_movimentacoes_bulk\",\"movimentacoes\":[{" +
                            "\"id\":\"%s\",\"timestamp\":\"%s\",\"nome_cursista\":\"%s\",\"emailCursista\":\"%s\"," +
                            "\"cgm\":\"%s\",\"cpf\":\"%s\",\"nre\":\"%s\",\"tutor\":\"%s\",\"email_tutor_responsavel\":\"%s\"," +
                            "\"turma_anterior\":\"%s\",\"turma_nova\":\"%s\",\"tipo_acao\":\"%s\",\"motivo\":\"%s\"," +
                            "\"justificativa\":\"%s\",\"status\":\"%s\",\"nota_resolucao\":\"%s\",\"solicitadoPor\":\"%s\"" +
                            "}]}",
                    extId, m.getTimestamp(),
                    escapeJson(m.getNomeCursista()), escapeJson(m.getEmailCursista()),
                    escapeJson(m.getCgm()), escapeJson(m.getCpf()),
                    escapeJson(m.getNre()), escapeJson(m.getTutor()), escapeJson(m.getEmailTutor()),
                    escapeJson(m.getTurmaAnterior()), escapeJson(m.getTurmaNova()),
                    escapeJson(m.getTipoAcao()), escapeJson(m.getMotivo()),
                    escapeJson(m.getJustificativa()), escapeJson(m.getStatus()),
                    escapeJson(m.getNotaResolucao()), escapeJson(m.getSolicitadoPor())
            );

            try (OutputStream os = conn.getOutputStream()) {
                os.write(jsonPayload.getBytes(StandardCharsets.UTF_8));
            }

            int code = conn.getResponseCode();
            return code == 200;
        } catch (Exception e) {
            System.err.println("[API Error] Falha ao enviar via HTTPS: " + e.getMessage());
            return false;
        }
    }

    /**
     * Lista as movimentações do banco para exibição na JTable.
     */
    public List<Movimentacao> listarMovimentacoes() {
        List<Movimentacao> lista = new ArrayList<>();
        try (Connection conn = getConnection()) {
            String sql = "SELECT mv.ext_id, mv.registrado_em, mv.tipo_acao, mv.turma_anterior, mv.turma_nova, " +
                    "mv.motivo, mv.justificativa, mv.status, mv.tutor_responsavel, mv.email_tutor_resp, " +
                    "COALESCE(u.nome, mv.solicitado_por_nome) AS nome_cursista, " +
                    "COALESCE(u.email_inst, mv.email_tutor_resp) AS email_cursista, " +
                    "u.cgm_ultimos3 AS cgm " +
                    "FROM movimentacao mv LEFT JOIN usuario u ON u.id = mv.usuario_id " +
                    "ORDER BY mv.id DESC LIMIT 500";

            try (Statement st = conn.createStatement(); ResultSet rs = st.executeQuery(sql)) {
                while (rs.next()) {
                    Movimentacao m = new Movimentacao();
                    m.setId(rs.getString("ext_id"));
                    m.setTimestamp(rs.getString("registrado_em"));
                    m.setTipoAcao(rs.getString("tipo_acao"));
                    m.setTurmaAnterior(rs.getString("turma_anterior"));
                    m.setTurmaNova(rs.getString("turma_nova"));
                    m.setMotivo(rs.getString("motivo"));
                    m.setJustificativa(rs.getString("justificativa"));
                    m.setStatus(rs.getString("status"));
                    m.setTutor(rs.getString("tutor_responsavel"));
                    m.setEmailTutor(rs.getString("email_tutor_resp"));
                    m.setNomeCursista(rs.getString("nome_cursista"));
                    m.setEmailCursista(rs.getString("email_cursista"));
                    m.setCgm(rs.getString("cgm"));
                    lista.add(m);
                }
            }
        } catch (Exception e) {
            System.err.println("[JDBC Error] Erro ao listar: " + e.getMessage());
        }
        return lista;
    }

    private String escapeJson(String str) {
        if (str == null) return "";
        return str.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", " ").replace("\r", "");
    }
}
