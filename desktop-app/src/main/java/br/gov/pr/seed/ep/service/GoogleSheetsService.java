package br.gov.pr.seed.ep.service;

import br.gov.pr.seed.ep.model.DadosNotificacaoEmail;
import br.gov.pr.seed.ep.model.Solicitacao;
import br.gov.pr.seed.ep.model.TurmaResumo;

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
    private List<TurmaResumo> cacheTurmas = null;

    /**
     * Busca solicitações pendentes (>= 03/11/2026) do banco TiDB Cloud com todos os dados enriquecidos da aba DADOS.
     */
    public List<Solicitacao> carregarSolicitacoesPendentes() {
        List<Solicitacao> lista = new ArrayList<>();

        try (Connection conn = dbService.getConnection()) {
            String sql = "SELECT mv.ext_id, mv.registrado_em, mv.tipo_acao, mv.turma_anterior, mv.turma_nova, " +
                    "mv.motivo, mv.justificativa, mv.status, mv.tutor_responsavel, mv.email_tutor_resp, " +
                    "mv.ano_formacao, mv.chamamento AS mv_chamamento, mv.modalidade_detalhes, mv.comprovante, " +
                    "COALESCE(u.nome, mv.solicitado_por_nome) AS nome_cursista, " +
                    "COALESCE(u.email_inst, '') AS email_cursista, " +
                    "COALESCE(u.telefone, '') AS telefone_cursista, " +
                    "COALESCE(u.cgm_ultimos3, '') AS cgm_ultimos3, " +
                    "COALESCE(v.linha_funcional, 1) AS linha_funcional, " +
                    "COALESCE(v.municipio, '') AS municipio, " +
                    "COALESCE(v.cargo, '') AS modalidade_vinculo, " +
                    "COALESCE(n.nome, 'SEED-PR') AS nre, " +
                    "COALESCE(t.codigo, tAlt.codigo, mv.turma_anterior) AS turma_atual_cod, " +
                    "COALESCE(t.dia_semana, tAlt.dia_semana, '') AS dia_semana, " +
                    "COALESCE(t.hora_ini, tAlt.hora_ini, '') AS hora_ini, " +
                    "COALESCE(t.hora_fim, tAlt.hora_fim, '') AS hora_fim, " +
                    "COALESCE(t.turno, tAlt.turno, '') AS turno, " +
                    "COALESCE(comp.nome, '') AS componente, " +
                    "COALESCE(cic.ano_formativo, mv.ano_formacao, '') AS ano_formativo, " +
                    "COALESCE(cic.chamamento, mv.chamamento, '') AS chamamento, " +
                    "COALESCE(uf.nome, '') AS formador_nome, " +
                    "COALESCE(uf.email_inst, '') AS formador_email, " +
                    "COALESCE(uf.telefone, '') AS formador_tel, " +
                    "COALESCE(ut.nome, mv.tutor_responsavel, '') AS tutor_nome, " +
                    "COALESCE(ut.email_inst, mv.email_tutor_resp, '') AS tutor_email, " +
                    "COALESCE(ut.telefone, '') AS tutor_tel " +
                    "FROM movimentacao mv " +
                    "LEFT JOIN usuario u ON u.id = mv.usuario_id " +
                    "LEFT JOIN matricula m ON m.id = mv.matricula_id " +
                    "LEFT JOIN vinculo v ON v.id = m.vinculo_id " +
                    "LEFT JOIN nre n ON n.id = COALESCE(v.nre_id, mv.nre_id, u.nre_id) " +
                    "LEFT JOIN turma t ON t.id = m.turma_id " +
                    "LEFT JOIN turma tAlt ON tAlt.codigo = mv.turma_anterior " +
                    "LEFT JOIN componente comp ON comp.id = COALESCE(t.componente_id, tAlt.componente_id) " +
                    "LEFT JOIN ciclo cic ON cic.id = COALESCE(m.ciclo_id, t.ciclo_id, tAlt.ciclo_id) " +
                    "LEFT JOIN usuario uf ON uf.id = COALESCE(t.formador_id, tAlt.formador_id) " +
                    "LEFT JOIN usuario ut ON ut.id = COALESCE(t.tutor_id, tAlt.tutor_id) " +
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

                    String cgm = rs.getString("cgm_ultimos3");
                    if ((cgm == null || cgm.length() < 7) && extId != null) {
                        java.util.regex.Matcher m = java.util.regex.Pattern.compile("_(\\d{7,10})_").matcher(extId);
                        if (m.find()) {
                            cgm = m.group(1);
                        }
                    }
                    s.setCgm(cgm != null ? cgm : "");
                    s.setLinhaFuncional(String.valueOf(rs.getInt("linha_funcional")));
                    s.setEmailCursista(rs.getString("email_cursista"));
                    s.setTelefoneCursista(rs.getString("telefone_cursista"));
                    s.setNre(rs.getString("nre"));
                    s.setMunicipio(rs.getString("municipio"));
                    s.setModalidade(rs.getString("modalidade_vinculo"));
                    s.setComponente(rs.getString("componente"));
                    s.setAnoFormativo(rs.getString("ano_formativo"));
                    s.setChamamento(rs.getString("chamamento"));

                    s.setTurmaAntiga(rs.getString("turma_atual_cod"));
                    s.setDiaTurmaAntiga(rs.getString("dia_semana"));
                    String hIni = rs.getString("hora_ini");
                    String hFim = rs.getString("hora_fim");
                    s.setHorarioTurmaAntiga((hIni != null && !hIni.isEmpty()) ? (hIni + (hFim != null && !hFim.isEmpty() ? " às " + hFim : "")) : "");
                    s.setTurnoTurmaAntiga(rs.getString("turno"));

                    s.setFormadorAntigoNome(rs.getString("formador_nome"));
                    s.setFormadorAntigoEmail(rs.getString("formador_email"));
                    s.setFormadorAntigoTelefone(rs.getString("formador_tel"));
                    s.setTutorAntigoNome(rs.getString("tutor_nome"));
                    s.setTutorAntigoEmail(rs.getString("tutor_email"));
                    s.setTutorAntigoTelefone(rs.getString("tutor_tel"));

                    s.setTurmaNova(rs.getString("turma_nova"));
                    s.setTipoAcao(rs.getString("tipo_acao"));
                    s.setMotivo(rs.getString("motivo"));
                    s.setJustificativa(rs.getString("justificativa"));
                    s.setModalidadeDetalhes(rs.getString("modalidade_detalhes"));
                    s.setComprovante(rs.getString("comprovante"));
                    s.setStatus(rs.getString("status") != null ? rs.getString("status") : "Pendente");
                    s.setOrigem(rs.getString("tipo_acao") != null ? rs.getString("tipo_acao") : "Troca de Turma");
                    lista.add(s);
                }
            }
        } catch (Exception e) {
            System.err.println("[TiDB Solicitacoes Error]: " + e.getMessage());
        }

        return lista;
    }

    /**
     * Lista todas as turmas ativas do banco para seleção rápida na janela de análise.
     */
    public List<TurmaResumo> listarTurmasDisponiveis(boolean forceReload) {
        if (cacheTurmas != null && !forceReload && !cacheTurmas.isEmpty()) {
            return cacheTurmas;
        }
        List<TurmaResumo> lista = new ArrayList<>();
        try (Connection conn = dbService.getConnection()) {
            String sql = "SELECT t.codigo, COALESCE(comp.nome, '') AS componente, COALESCE(cic.ano_formativo, '') AS ano_formativo, " +
                    "COALESCE(t.modalidade, '') AS modalidade, COALESCE(t.turno, '') AS turno, COALESCE(t.dia_semana, '') AS dia_semana, " +
                    "COALESCE(t.hora_ini, '') AS hora_ini, COALESCE(t.hora_fim, '') AS hora_fim, " +
                    "COALESCE(uf.nome, '') AS formador_nome, COALESCE(uf.email_inst, '') AS formador_email, " +
                    "COALESCE(ut.nome, '') AS tutor_nome, COALESCE(ut.email_inst, '') AS tutor_email, " +
                    "(SELECT COUNT(*) FROM matricula m WHERE m.turma_id = t.id AND m.na_base_ativa = 1) AS total_mat " +
                    "FROM turma t " +
                    "LEFT JOIN componente comp ON comp.id = t.componente_id " +
                    "LEFT JOIN ciclo cic ON cic.id = t.ciclo_id " +
                    "LEFT JOIN usuario uf ON uf.id = t.formador_id " +
                    "LEFT JOIN usuario ut ON ut.id = t.tutor_id " +
                    "ORDER BY comp.nome ASC, t.codigo ASC";
            try (Statement st = conn.createStatement(); ResultSet rs = st.executeQuery(sql)) {
                while (rs.next()) {
                    TurmaResumo tr = new TurmaResumo();
                    tr.setCodigo(rs.getString("codigo"));
                    tr.setComponente(rs.getString("componente"));
                    tr.setAnoFormativo(rs.getString("ano_formativo"));
                    tr.setModalidade(rs.getString("modalidade"));
                    tr.setTurno(rs.getString("turno"));
                    tr.setDiaSemana(rs.getString("dia_semana"));
                    String hi = rs.getString("hora_ini");
                    String hf = rs.getString("hora_fim");
                    tr.setHorario((hi != null && !hi.isEmpty()) ? (hi + (hf != null && !hf.isEmpty() ? "-" + hf : "")) : "");
                    tr.setFormadorNome(rs.getString("formador_nome"));
                    tr.setFormadorEmail(rs.getString("formador_email"));
                    tr.setTutorNome(rs.getString("tutor_nome"));
                    tr.setTutorEmail(rs.getString("tutor_email"));
                    tr.setTotalMatriculados(rs.getInt("total_mat"));
                    lista.add(tr);
                }
            }
            cacheTurmas = lista;
        } catch (Exception e) {
            System.err.println("[TiDB Turmas Error]: " + e.getMessage());
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

        // Preenche dados já conhecidos da turma antiga
        emailData.setFormadorAntigoNome(sol.getFormadorAntigoNome());
        emailData.setFormadorAntigoEmail(sol.getFormadorAntigoEmail());
        emailData.setTutorAntigoNome(sol.getTutorAntigoNome());
        emailData.setTutorAntigoEmail(sol.getTutorAntigoEmail());

        // 1. Resolve os dados de Tutores e Formadores no TiDB Cloud
        resolverTutorEFormador(emailData);

        // 2. Atualiza a movimentação no TiDB Cloud (status = Deferido ou Indeferido)
        try (Connection conn = dbService.getConnection()) {
            String sql = "UPDATE movimentacao SET status = ?, nota_resolucao = ?, turma_nova = COALESCE(?, turma_nova), resolvido_em = NOW() WHERE ext_id = ?";
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
                    String ult3 = sol.getCgm() != null && sol.getCgm().length() >= 3 ? sol.getCgm().substring(sol.getCgm().length() - 3) : sol.getCgm();
                    psMat.setString(3, ult3);
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
                            if (rs.getString("tutor_nome") != null) emailData.setTutorAntigoNome(rs.getString("tutor_nome"));
                            if (rs.getString("tutor_email") != null) emailData.setTutorAntigoEmail(rs.getString("tutor_email"));
                            if (rs.getString("formador_nome") != null) emailData.setFormadorAntigoNome(rs.getString("formador_nome"));
                            if (rs.getString("formador_email") != null) emailData.setFormadorAntigoEmail(rs.getString("formador_email"));
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
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "");
    }
}
