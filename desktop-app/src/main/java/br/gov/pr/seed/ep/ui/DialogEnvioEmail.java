package br.gov.pr.seed.ep.ui;

import br.gov.pr.seed.ep.model.DadosNotificacaoEmail;
import br.gov.pr.seed.ep.service.GoogleSheetsService;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;
import java.awt.datatransfer.StringSelection;

public class DialogEnvioEmail extends JDialog {

    private final DadosNotificacaoEmail dados;
    private final GoogleSheetsService sheetsService;

    private JTextField txtPara;
    private JTextField txtCcFormadorAntigo;
    private JTextField txtCcFormadorNovo;
    private JTextField txtCcTutorAntigo;
    private JTextField txtCcTutorNovo;
    private JTextField txtAssunto;
    private JTextArea txtCorpoEmail;

    public DialogEnvioEmail(Frame owner, DadosNotificacaoEmail dados, GoogleSheetsService sheetsService) {
        super(owner, "✉️ Notificação por E-mail · Movimentação de Cursista", true);
        this.dados = dados;
        this.sheetsService = sheetsService;

        setSize(850, 720);
        setLocationRelativeTo(owner);
        initComponents();
    }

    private void initComponents() {
        JPanel main = new JPanel(new BorderLayout(10, 10));
        main.setBorder(new EmptyBorder(14, 14, 14, 14));
        main.setBackground(new Color(248, 250, 252));

        // 1. Cabeçalho
        JPanel pnlHeader = new JPanel(new BorderLayout());
        pnlHeader.setBackground(new Color(0, 29, 61));
        pnlHeader.setBorder(new EmptyBorder(12, 16, 12, 16));

        String statusLabel = "Deferido".equalsIgnoreCase(dados.getStatusDecisao()) ? "DEFERIDA" : "INDEFERIDA";
        JLabel lblTitulo = new JLabel("SEED-PR · Envio de E-mail Informativo da Movimentação (" + statusLabel + ")");
        lblTitulo.setFont(new Font("Segoe UI", Font.BOLD, 15));
        lblTitulo.setForeground(Color.WHITE);

        JLabel lblSub = new JLabel("Os dados foram pré-preenchidos a partir da base oficial da SEED-PR. Você pode editar o texto antes de enviar.");
        lblSub.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        lblSub.setForeground(new Color(191, 219, 254));

        pnlHeader.add(lblTitulo, BorderLayout.NORTH);
        pnlHeader.add(lblSub, BorderLayout.SOUTH);
        main.add(pnlHeader, BorderLayout.NORTH);

        // 2. Destinatários e Assunto
        JPanel pnlCampos = new JPanel(new GridLayout(6, 2, 8, 6));
        pnlCampos.setBackground(Color.WHITE);
        pnlCampos.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(new Color(226, 232, 240)),
                new EmptyBorder(10, 12, 10, 12)
        ));

        // Para Cursista
        pnlCampos.add(new JLabel("Para (Cursista):"));
        String emailCur = (dados.getCursistaEmail() != null && !dados.getCursistaEmail().isEmpty()) ? dados.getCursistaEmail() : "";
        txtPara = new JTextField(dados.getCursistaNome() != null ? dados.getCursistaNome() + " <" + emailCur + ">" : emailCur);
        pnlCampos.add(txtPara);

        // Formador Antigo
        pnlCampos.add(new JLabel("Cc (Formador Antigo):"));
        String fAntigoNome = dados.getFormadorAntigoNome() != null ? dados.getFormadorAntigoNome() : "Formador Antigo";
        String fAntigoEmail = dados.getFormadorAntigoEmail() != null ? dados.getFormadorAntigoEmail() : "";
        txtCcFormadorAntigo = new JTextField(fAntigoEmail.isEmpty() ? "" : fAntigoNome + " <" + fAntigoEmail + ">");
        pnlCampos.add(txtCcFormadorAntigo);

        // Formador Novo
        pnlCampos.add(new JLabel("Cc (Formador Novo):"));
        String fNovoNome = dados.getFormadorNovoNome() != null ? dados.getFormadorNovoNome() : "Formador Novo";
        String fNovoEmail = dados.getFormadorNovoEmail() != null ? dados.getFormadorNovoEmail() : "";
        txtCcFormadorNovo = new JTextField(fNovoEmail.isEmpty() ? "" : fNovoNome + " <" + fNovoEmail + ">");
        pnlCampos.add(txtCcFormadorNovo);

        // Tutor Antigo
        pnlCampos.add(new JLabel("Cc (Tutor Antigo):"));
        String tAntigoNome = dados.getTutorAntigoNome() != null ? dados.getTutorAntigoNome() : "Tutor Antigo";
        String tAntigoEmail = dados.getTutorAntigoEmail() != null ? dados.getTutorAntigoEmail() : "";
        txtCcTutorAntigo = new JTextField(tAntigoEmail.isEmpty() ? "" : tAntigoNome + " <" + tAntigoEmail + ">");
        pnlCampos.add(txtCcTutorAntigo);

        // Tutor Novo
        pnlCampos.add(new JLabel("Cc (Tutor Novo):"));
        String tNovoNome = dados.getTutorNovoNome() != null ? dados.getTutorNovoNome() : "Tutor Novo";
        String tNovoEmail = dados.getTutorNovoEmail() != null ? dados.getTutorNovoEmail() : "";
        txtCcTutorNovo = new JTextField(tNovoEmail.isEmpty() ? "" : tNovoNome + " <" + tNovoEmail + ">");
        pnlCampos.add(txtCcTutorNovo);

        // Assunto
        pnlCampos.add(new JLabel("Assunto:"));
        txtAssunto = new JTextField("[SEED-PR / Estágio Probatório] Movimentação de Turma " + statusLabel + " - " + (dados.getCursistaNome() != null ? dados.getCursistaNome() : ""));
        pnlCampos.add(txtAssunto);

        // 3. Área de Texto do E-mail (Pré-Preenchida)
        JPanel pnlCorpo = new JPanel(new BorderLayout(4, 4));
        pnlCorpo.setOpaque(false);
        pnlCorpo.add(new JLabel("Mensagem Formatada (Editável):"), BorderLayout.NORTH);

        txtCorpoEmail = new JTextArea();
        txtCorpoEmail.setFont(new Font("Consolas", Font.PLAIN, 12));
        txtCorpoEmail.setLineWrap(true);
        txtCorpoEmail.setWrapStyleWord(true);
        txtCorpoEmail.setText(gerarTextoPreFormatado());

        JScrollPane scroll = new JScrollPane(txtCorpoEmail);
        scroll.setPreferredSize(new Dimension(800, 260));
        pnlCorpo.add(scroll, BorderLayout.CENTER);

        // Painel Central com Campos + Mensagem
        JPanel pnlCenter = new JPanel(new BorderLayout(8, 8));
        pnlCenter.setOpaque(false);
        pnlCenter.add(pnlCampos, BorderLayout.NORTH);
        pnlCenter.add(pnlCorpo, BorderLayout.CENTER);
        main.add(pnlCenter, BorderLayout.CENTER);

        // 4. Rodapé com Botões
        JPanel pnlBotoes = new JPanel(new FlowLayout(FlowLayout.RIGHT, 10, 6));
        pnlBotoes.setOpaque(false);

        JButton btnCopiar = new JButton("📋 Copiar Mensagem");
        btnCopiar.addActionListener(e -> {
            Toolkit.getDefaultToolkit().getSystemClipboard().setContents(new StringSelection(txtCorpoEmail.getText()), null);
            JOptionPane.showMessageDialog(this, "Texto copiado para a área de transferência!", "Copiado", JOptionPane.INFORMATION_MESSAGE);
        });
        pnlBotoes.add(btnCopiar);

        JButton btnAbrirEmail = new JButton("✉️ Abrir no Cliente de E-mail (Gmail / Outlook)");
        btnAbrirEmail.setBackground(new Color(2, 132, 199));
        btnAbrirEmail.setForeground(Color.WHITE);
        btnAbrirEmail.setFont(new Font("Segoe UI", Font.BOLD, 12));
        btnAbrirEmail.addActionListener(e -> {
            boolean ok = sheetsService.dispararEmailOficial(dados, txtAssunto.getText(), txtCorpoEmail.getText());
            if (ok) {
                JOptionPane.showMessageDialog(this, "Janela de e-mail aberta com todos os campos preenchidos!", "E-mail Aberto", JOptionPane.INFORMATION_MESSAGE);
            } else {
                JOptionPane.showMessageDialog(this, "Não foi possível abrir o cliente de e-mail automaticamente. Você pode copiar o texto.", "Aviso", JOptionPane.WARNING_MESSAGE);
            }
        });
        pnlBotoes.add(btnAbrirEmail);

        JButton btnFechar = new JButton("Concluir e Fechar");
        btnFechar.setFont(new Font("Segoe UI", Font.BOLD, 12));
        btnFechar.setBackground(new Color(0, 152, 74));
        btnFechar.setForeground(Color.WHITE);
        btnFechar.addActionListener(e -> dispose());
        pnlBotoes.add(btnFechar);

        main.add(pnlBotoes, BorderLayout.SOUTH);
        setContentPane(main);
    }

    private String gerarTextoPreFormatado() {
        boolean isDeferido = "Deferido".equalsIgnoreCase(dados.getStatusDecisao());

        StringBuilder sb = new StringBuilder();
        sb.append("Prezados(as),\n\n");

        if (isDeferido) {
            sb.append("Informamos que a solicitação de movimentação do servidor cursista abaixo foi DEFERIDA e registrada oficialmente no Sistema do Estágio Probatório da SEED-PR.\n\n");
        } else {
            sb.append("Informamos que a solicitação de movimentação do servidor cursista abaixo foi INDEFERIDA pela Coordenação do Estágio Probatório da SEED-PR.\n\n");
        }

        sb.append("========================================================================\n");
        sb.append("DADOS DO CURSISTA:\n");
        sb.append("========================================================================\n");
        sb.append("• Nome Completo: ").append(dados.getCursistaNome() != null ? dados.getCursistaNome() : "Não informado").append("\n");
        sb.append("• CGM: ").append(dados.getCgm() != null ? dados.getCgm() : "Não informado");
        sb.append(" | Linha Funcional: ").append(dados.getLinhaFuncional() != null ? dados.getLinhaFuncional() : "1").append("\n");
        sb.append("• E-mail Institucional: ").append(dados.getCursistaEmail() != null ? dados.getCursistaEmail() : "Não informado").append("\n\n");

        sb.append("========================================================================\n");
        sb.append("DADOS DA MOVIMENTAÇÃO:\n");
        sb.append("========================================================================\n");
        sb.append("• Tipo de Ação: ").append(dados.getTipoAcao() != null ? dados.getTipoAcao() : "Troca de Turma").append("\n");
        sb.append("• Situação da Solicitação: ").append(isDeferido ? "DEFERIDO" : "INDEFERIDO").append("\n");
        sb.append("• Data de Registro: ").append(dados.getDataEfetivacao() != null ? dados.getDataEfetivacao() : "").append("\n\n");

        sb.append("• TURMA ANTERIOR: ").append(dados.getTurmaAntiga() != null ? dados.getTurmaAntiga() : "Não informada").append("\n");
        if (dados.getFormadorAntigoNome() != null && !dados.getFormadorAntigoNome().isEmpty()) {
            sb.append("  - Formador Anterior: ").append(dados.getFormadorAntigoNome())
              .append(" (").append(dados.getFormadorAntigoEmail() != null ? dados.getFormadorAntigoEmail() : "").append(")\n");
        }
        if (dados.getTutorAntigoNome() != null && !dados.getTutorAntigoNome().isEmpty()) {
            sb.append("  - Tutor Anterior: ").append(dados.getTutorAntigoNome())
              .append(" (").append(dados.getTutorAntigoEmail() != null ? dados.getTutorAntigoEmail() : "").append(")\n");
        }

        sb.append("\n• TURMA NOVA: ").append(dados.getTurmaNova() != null ? dados.getTurmaNova() : "Não informada");
        if (dados.getCodSereNova() != null && !dados.getCodSereNova().isEmpty()) {
            sb.append(" (Cód. SERE: ").append(dados.getCodSereNova()).append(")");
        }
        sb.append("\n");

        if (dados.getFormadorNovoNome() != null && !dados.getFormadorNovoNome().isEmpty()) {
            sb.append("  - Formador Novo: ").append(dados.getFormadorNovoNome())
              .append(" (").append(dados.getFormadorNovoEmail() != null ? dados.getFormadorNovoEmail() : "").append(")\n");
        }
        if (dados.getTutorNovoNome() != null && !dados.getTutorNovoNome().isEmpty()) {
            sb.append("  - Tutor Novo: ").append(dados.getTutorNovoNome())
              .append(" (").append(dados.getTutorNovoEmail() != null ? dados.getTutorNovoEmail() : "").append(")\n");
        }

        if (dados.getNotaResolucao() != null && !dados.getNotaResolucao().isEmpty()) {
            sb.append("\n• Justificativa / Parecer da Coordenação:\n");
            sb.append("  ").append(dados.getNotaResolucao()).append("\n");
        }

        sb.append("\n========================================================================\n");
        sb.append("ORIENTAÇÕES IMPORTANTES:\n");
        sb.append("========================================================================\n");
        if (isDeferido) {
            sb.append("1. O cursista já se encontra registrado na nova turma no sistema e no Google Classroom.\n");
            sb.append("2. O Formador Novo e o Tutor Novo passam a ser responsáveis pelo acompanhamento pedagógico do servidor a partir desta data.\n");
            sb.append("3. Os registros anteriores de observações pedagógicas permanecem preservados no dossiê histórico do cursista.\n");
        } else {
            sb.append("1. A turma oficial do cursista permanece inalterada.\n");
            sb.append("2. Em caso de dúvidas sobre o motivo do indeferimento, favor responder a este e-mail ou contatar a Coordenação.\n");
        }

        sb.append("\nAtenciosamente,\n\n");
        sb.append("Coordenação do Estágio Probatório\n");
        sb.append("Secretaria de Estado da Educação do Paraná - SEED/PR\n");

        return sb.toString();
    }
}
