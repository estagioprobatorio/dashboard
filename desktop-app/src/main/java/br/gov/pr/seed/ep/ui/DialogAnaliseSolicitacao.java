package br.gov.pr.seed.ep.ui;

import br.gov.pr.seed.ep.model.DadosNotificacaoEmail;
import br.gov.pr.seed.ep.model.Solicitacao;
import br.gov.pr.seed.ep.model.TurmaResumo;
import br.gov.pr.seed.ep.service.GoogleSheetsService;

import javax.swing.*;
import javax.swing.border.CompoundBorder;
import javax.swing.border.EmptyBorder;
import javax.swing.border.LineBorder;
import javax.swing.event.DocumentEvent;
import javax.swing.event.DocumentListener;
import java.awt.*;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;

/**
 * Janela Modal Completa de Análise de Solicitação de Movimentação (Deferimento / Indeferimento).
 * Exibe todos os dados cadastrais do cursista (aba DADOS), equipe pedagógica atual,
 * justificativa integral, seletor de turma destino com preview de novo Formador/Tutor
 * e integração direta com o disparo de e-mails.
 */
public class DialogAnaliseSolicitacao extends JDialog {

    private final Frame parentFrame;
    private final Solicitacao solicitacao;
    private final GoogleSheetsService sheetsService;
    private final Runnable onProcessedCallback;

    private List<TurmaResumo> todasTurmas = new ArrayList<>();
    private JComboBox<TurmaResumo> cbTurmasDestino;
    private JTextField txtBuscaTurma;
    private JCheckBox chkFiltrarMesmoComponente;
    private JTextField txtTurmaManual;
    private JTextField txtCodSere;
    private JRadioButton rbDeferido;
    private JRadioButton rbIndeferido;
    private JTextArea txtParecer;
    private JLabel lblPreviewFormadorNovo;
    private JLabel lblPreviewTutorNovo;
    private JLabel lblPreviewHorarioNovo;
    private JButton btnConfirmar;

    public DialogAnaliseSolicitacao(Frame parent, Solicitacao sol, GoogleSheetsService service, Runnable onProcessedCallback) {
        super(parent, "Análise Detalhada da Solicitação · " + (sol.getNomeCursista() != null ? sol.getNomeCursista() : ""), true);
        this.parentFrame = parent;
        this.solicitacao = sol;
        this.sheetsService = service;
        this.onProcessedCallback = onProcessedCallback;

        setSize(980, 790);
        setLocationRelativeTo(parent);
        setDefaultCloseOperation(DISPOSE_ON_CLOSE);

        initComponents();
        carregarTurmasAsync();
    }

    private void initComponents() {
        JPanel root = new JPanel(new BorderLayout(0, 0));
        root.setBackground(new Color(241, 245, 249));

        // 1. BANNER TOPO INSTITUCIONAL (Estilo Dashboard SEED-PR)
        JPanel header = new JPanel(new BorderLayout(12, 4));
        header.setBackground(new Color(0, 29, 61));
        header.setBorder(new EmptyBorder(14, 20, 14, 20));

        String cgmLf = (v(solicitacao.getCgm()) + "_" + v(solicitacao.getLinhaFuncional(), "1"));
        JLabel lblTitulo = new JLabel("⚖️ ANÁLISE DE SOLICITAÇÃO DE MOVIMENTAÇÃO · " + v(solicitacao.getTipoAcao(), "Troca de Turma").toUpperCase());
        lblTitulo.setFont(new Font("Segoe UI", Font.BOLD, 15));
        lblTitulo.setForeground(Color.WHITE);

        JLabel lblSub = new JLabel(String.format("Protocolo: %s   |   Data do Pedido: %s   |   ID Funcional (CGM_LF): %s",
                v(solicitacao.getId()), v(solicitacao.getDataSolicitacao()), cgmLf));
        lblSub.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        lblSub.setForeground(new Color(186, 230, 253));

        header.add(lblTitulo, BorderLayout.NORTH);
        header.add(lblSub, BorderLayout.SOUTH);
        root.add(header, BorderLayout.NORTH);

        // 2. CORPO ROLÁVEL COM OS 4 BLOCOS DE ANÁLISE
        JPanel body = new JPanel();
        body.setLayout(new BoxLayout(body, BoxLayout.Y_AXIS));
        body.setBackground(new Color(241, 245, 249));
        body.setBorder(new EmptyBorder(14, 16, 14, 16));

        body.add(criarBlocoDadosCursista());
        body.add(Box.createVerticalStrut(12));
        body.add(criarBlocoTurmaAtual());
        body.add(Box.createVerticalStrut(12));
        body.add(criarBlocoDetalhesSolicitacao());
        body.add(Box.createVerticalStrut(12));
        body.add(criarBlocoDeliberacao());

        JScrollPane scrollBody = new JScrollPane(body);
        scrollBody.setBorder(null);
        scrollBody.getVerticalScrollBar().setUnitIncrement(16);
        root.add(scrollBody, BorderLayout.CENTER);

        // 3. RODAPÉ DE AÇÕES
        JPanel footer = new JPanel(new BorderLayout());
        footer.setBackground(Color.WHITE);
        footer.setBorder(new CompoundBorder(
                BorderFactory.createMatteBorder(1, 0, 0, 0, new Color(203, 213, 225)),
                new EmptyBorder(10, 18, 10, 18)
        ));

        JLabel lblInfoFooter = new JLabel("💡 Ao confirmar, o sistema atualizará o TiDB Cloud, a Planilha Mestra (Coluna H) e abrirá os e-mails pré-preenchidos.");
        lblInfoFooter.setFont(new Font("Segoe UI", Font.ITALIC, 11));
        lblInfoFooter.setForeground(new Color(100, 116, 139));
        footer.add(lblInfoFooter, BorderLayout.WEST);

        JPanel btnGroup = new JPanel(new FlowLayout(FlowLayout.RIGHT, 10, 0));
        btnGroup.setOpaque(false);

        JButton btnCancelar = new JButton("Fechar / Cancelar");
        btnCancelar.setFont(new Font("Segoe UI", Font.BOLD, 12));
        btnCancelar.addActionListener(e -> dispose());

        btnConfirmar = new JButton("⚡ Confirmar Decisão & Abrir Disparo de E-mails");
        btnConfirmar.setFont(new Font("Segoe UI", Font.BOLD, 13));
        btnConfirmar.setBackground(new Color(0, 114, 188));
        btnConfirmar.setForeground(Color.WHITE);
        btnConfirmar.setFocusPainted(false);
        btnConfirmar.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
        btnConfirmar.addActionListener(e -> confirmarProcessamento());

        btnGroup.add(btnCancelar);
        btnGroup.add(btnConfirmar);
        footer.add(btnGroup, BorderLayout.EAST);

        root.add(footer, BorderLayout.SOUTH);
        setContentPane(root);
    }

    private JPanel criarCardBase(String titulo, Color accentColor) {
        JPanel card = new JPanel(new BorderLayout(8, 8));
        card.setBackground(Color.WHITE);
        card.setBorder(new CompoundBorder(
                new LineBorder(new Color(203, 213, 225), 1, true),
                new CompoundBorder(
                        BorderFactory.createMatteBorder(0, 4, 0, 0, accentColor),
                        new EmptyBorder(12, 14, 12, 14)
                )
        ));

        JLabel lblHeader = new JLabel(titulo);
        lblHeader.setFont(new Font("Segoe UI", Font.BOLD, 13));
        lblHeader.setForeground(new Color(0, 29, 61));
        lblHeader.setBorder(new CompoundBorder(
                BorderFactory.createMatteBorder(0, 0, 1, 0, new Color(226, 232, 240)),
                new EmptyBorder(0, 0, 6, 0)
        ));
        card.add(lblHeader, BorderLayout.NORTH);
        return card;
    }

    private JPanel criarCampoInfo(String rotulo, String valor, boolean destaque) {
        JPanel p = new JPanel(new BorderLayout(2, 2));
        p.setOpaque(false);
        JLabel lRot = new JLabel(rotulo.toUpperCase());
        lRot.setFont(new Font("Segoe UI", Font.BOLD, 10));
        lRot.setForeground(new Color(100, 116, 139));

        JLabel lVal = new JLabel(valor != null && !valor.trim().isEmpty() ? valor : "—");
        lVal.setFont(new Font("Segoe UI", destaque ? Font.BOLD : Font.PLAIN, 12));
        lVal.setForeground(destaque ? new Color(0, 29, 61) : new Color(30, 41, 59));

        p.add(lRot, BorderLayout.NORTH);
        p.add(lVal, BorderLayout.CENTER);
        return p;
    }

    private JPanel criarBlocoDadosCursista() {
        JPanel card = criarCardBase("👤 1. Dados Cadastrais e Funcionais do Cursista (Aba DADOS / SIGEP)", new Color(0, 114, 188));

        JPanel grid = new JPanel(new GridLayout(3, 4, 14, 10));
        grid.setOpaque(false);

        String cgm = v(solicitacao.getCgm());
        String lf = v(solicitacao.getLinhaFuncional(), "1");

        grid.add(criarCampoInfo("Nome do Cursista", v(solicitacao.getNomeCursista()), true));
        grid.add(criarCampoInfo("CGM", cgm, true));
        grid.add(criarCampoInfo("Linha Funcional (LF)", "LF " + lf + "  (ID: " + cgm + "_" + lf + ")", true));
        grid.add(criarCampoInfo("E-mail Institucional", v(solicitacao.getEmailCursista()), false));

        grid.add(criarCampoInfo("Telefone / Contato", v(solicitacao.getTelefoneCursista()), false));
        grid.add(criarCampoInfo("NRE de Exercício", v(solicitacao.getNre()), true));
        grid.add(criarCampoInfo("Município", v(solicitacao.getMunicipio()), false));
        grid.add(criarCampoInfo("Modalidade", v(solicitacao.getModalidade(), "DOCENTES"), false));

        grid.add(criarCampoInfo("Componente Curricular", v(solicitacao.getComponente()), true));
        grid.add(criarCampoInfo("Ano Formativo", v(solicitacao.getAnoFormativo()), true));
        grid.add(criarCampoInfo("Chamamento", v(solicitacao.getChamamento()), false));
        grid.add(criarCampoInfo("Status da Solicitação", v(solicitacao.getStatus(), "Pendente"), true));

        card.add(grid, BorderLayout.CENTER);
        return card;
    }

    private JPanel criarBlocoTurmaAtual() {
        JPanel card = criarCardBase("🏫 2. Turma Atual (Origem — Coluna H) e Equipe Pedagógica Responsável", new Color(71, 85, 105));

        JPanel grid = new JPanel(new GridLayout(2, 3, 14, 10));
        grid.setOpaque(false);

        String diaHor = (v(solicitacao.getDiaTurmaAntiga(), "") + " " + v(solicitacao.getHorarioTurmaAntiga(), "")).trim();
        if (diaHor.isEmpty()) diaHor = v(solicitacao.getTurnoTurmaAntiga(), "Não informado");

        grid.add(criarCampoInfo("Código da Turma Atual (Coluna H)", v(solicitacao.getTurmaAntiga()), true));
        grid.add(criarCampoInfo("Dia e Horário da Turma Atual", diaHor, false));
        grid.add(criarCampoInfo("Turno Atual", v(solicitacao.getTurnoTurmaAntiga()), false));

        String formInfo = v(solicitacao.getFormadorAntigoNome()) +
                (!v(solicitacao.getFormadorAntigoEmail(), "").isEmpty() ? " (" + solicitacao.getFormadorAntigoEmail() + ")" : "");
        String tutInfo = v(solicitacao.getTutorAntigoNome()) +
                (!v(solicitacao.getTutorAntigoEmail(), "").isEmpty() ? " (" + solicitacao.getTutorAntigoEmail() + ")" : "");

        grid.add(criarCampoInfo("🎓 Formador(a) da Turma Atual", formInfo, true));
        grid.add(criarCampoInfo("👤 Tutor(a) Responsável Atual", tutInfo, true));
        grid.add(criarCampoInfo("Resumo Vínculo / Formador", v(solicitacao.getModalidadeDetalhes()), false));

        card.add(grid, BorderLayout.CENTER);
        return card;
    }

    private JPanel criarBlocoDetalhesSolicitacao() {
        JPanel card = criarCardBase("📋 3. Dados da Solicitação, Horário Pretendido e Justificativa do Cursista", new Color(217, 119, 6));

        JPanel content = new JPanel(new BorderLayout(8, 8));
        content.setOpaque(false);

        JPanel topRow = new JPanel(new GridLayout(1, 2, 14, 6));
        topRow.setOpaque(false);
        topRow.add(criarCampoInfo("Motivo Principal Alegado", v(solicitacao.getMotivo()), true));
        topRow.add(criarCampoInfo("Componente / Horário Pretendido", v(solicitacao.getJustificativa()), true));
        content.add(topRow, BorderLayout.NORTH);

        JTextArea areaJust = new JTextArea(3, 60);
        areaJust.setText("Motivo: " + v(solicitacao.getMotivo()) + "\n" +
                "Detalhes / Horário Solicitado: " + v(solicitacao.getJustificativa()) +
                (!v(solicitacao.getModalidadeDetalhes(), "").isEmpty() ? "\nContexto Funcional: " + solicitacao.getModalidadeDetalhes() : ""));
        areaJust.setEditable(false);
        areaJust.setLineWrap(true);
        areaJust.setWrapStyleWord(true);
        areaJust.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        areaJust.setBackground(new Color(254, 252, 232));
        areaJust.setBorder(new EmptyBorder(8, 10, 8, 10));

        JScrollPane spJust = new JScrollPane(areaJust);
        spJust.setBorder(new LineBorder(new Color(253, 224, 71), 1, true));
        content.add(spJust, BorderLayout.CENTER);

        if (solicitacao.getComprovante() != null && solicitacao.getComprovante().startsWith("http")) {
            JButton btnDoc = new JButton("📎 Abrir Documento / Comprovante Anexo no Navegador");
            btnDoc.setFont(new Font("Segoe UI", Font.BOLD, 11));
            btnDoc.addActionListener(e -> {
                try {
                    Desktop.getDesktop().browse(new URI(solicitacao.getComprovante()));
                } catch (Exception ex) {
                    JOptionPane.showMessageDialog(this, "Não foi possível abrir o link: " + ex.getMessage());
                }
            });
            JPanel pDoc = new JPanel(new FlowLayout(FlowLayout.LEFT, 0, 0));
            pDoc.setOpaque(false);
            pDoc.add(btnDoc);
            content.add(pDoc, BorderLayout.SOUTH);
        }

        card.add(content, BorderLayout.CENTER);
        return card;
    }

    private JPanel criarBlocoDeliberacao() {
        JPanel card = criarCardBase("⚖️ 4. Deliberação Administrativa (Deferimento / Indeferimento e Seleção de Nova Turma)", new Color(0, 152, 74));

        JPanel content = new JPanel(new BorderLayout(10, 10));
        content.setOpaque(false);

        // Linha 1: Radio Buttons de Decisão
        JPanel decisaoRow = new JPanel(new FlowLayout(FlowLayout.LEFT, 16, 4));
        decisaoRow.setBackground(new Color(248, 250, 252));
        decisaoRow.setBorder(new CompoundBorder(
                new LineBorder(new Color(226, 232, 240), 1, true),
                new EmptyBorder(6, 10, 6, 10)
        ));

        JLabel lblDec = new JLabel("Decisão Oficial:");
        lblDec.setFont(new Font("Segoe UI", Font.BOLD, 13));
        decisaoRow.add(lblDec);

        rbDeferido = new JRadioButton("✅ DEFERIDO — Autorizar Troca e Atualizar Turma na Coluna H", true);
        rbDeferido.setFont(new Font("Segoe UI", Font.BOLD, 13));
        rbDeferido.setForeground(new Color(21, 128, 61));
        rbDeferido.setOpaque(false);

        rbIndeferido = new JRadioButton("❌ INDEFERIDO — Manter na Turma Atual", false);
        rbIndeferido.setFont(new Font("Segoe UI", Font.BOLD, 13));
        rbIndeferido.setForeground(new Color(185, 28, 28));
        rbIndeferido.setOpaque(false);

        ButtonGroup bg = new ButtonGroup();
        bg.add(rbDeferido);
        bg.add(rbIndeferido);

        decisaoRow.add(rbDeferido);
        decisaoRow.add(rbIndeferido);
        content.add(decisaoRow, BorderLayout.NORTH);

        // Linha 2: Seleção da Turma Nova e Preview de Formador/Tutor Novo
        JPanel centerBox = new JPanel(new BorderLayout(8, 8));
        centerBox.setOpaque(false);

        JPanel turmaSelectBox = new JPanel(new GridLayout(3, 1, 6, 6));
        turmaSelectBox.setOpaque(false);

        // Filtro de busca de turmas
        JPanel filterRow = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 0));
        filterRow.setOpaque(false);
        filterRow.add(new JLabel("🔍 Filtrar Turma Destino:"));
        txtBuscaTurma = new JTextField(22);
        txtBuscaTurma.setToolTipText("Digite parte do nome da turma, formador ou turno (ex: MANHA, TARDE, NOITE)");
        filterRow.add(txtBuscaTurma);

        chkFiltrarMesmoComponente = new JCheckBox("Apenas mesmo Componente (" + v(solicitacao.getComponente(), "Todos") + ")", true);
        chkFiltrarMesmoComponente.setOpaque(false);
        chkFiltrarMesmoComponente.setFont(new Font("Segoe UI", Font.BOLD, 11));
        chkFiltrarMesmoComponente.addActionListener(e -> atualizarComboTurmas());
        filterRow.add(chkFiltrarMesmoComponente);

        txtBuscaTurma.getDocument().addDocumentListener(new DocumentListener() {
            public void insertUpdate(DocumentEvent e) { atualizarComboTurmas(); }
            public void removeUpdate(DocumentEvent e) { atualizarComboTurmas(); }
            public void changedUpdate(DocumentEvent e) { atualizarComboTurmas(); }
        });
        turmaSelectBox.add(filterRow);

        // ComboBox de Turmas do Banco
        JPanel comboRow = new JPanel(new BorderLayout(8, 0));
        comboRow.setOpaque(false);
        JLabel lblCombo = new JLabel("Turma Nova (Catálogo TiDB): ");
        lblCombo.setFont(new Font("Segoe UI", Font.BOLD, 12));
        comboRow.add(lblCombo, BorderLayout.WEST);

        cbTurmasDestino = new JComboBox<>();
        cbTurmasDestino.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        cbTurmasDestino.addActionListener(e -> {
            TurmaResumo sel = (TurmaResumo) cbTurmasDestino.getSelectedItem();
            if (sel != null) {
                txtTurmaManual.setText(sel.getCodigo());
                lblPreviewFormadorNovo.setText("🎓 Formador(a) Destino: " + v(sel.getFormadorNome()) + " (" + v(sel.getFormadorEmail()) + ")");
                lblPreviewTutorNovo.setText("👤 Tutor(a) Destino: " + v(sel.getTutorNome()) + " (" + v(sel.getTutorEmail()) + ")");
                lblPreviewHorarioNovo.setText("🕒 Horário/Turno: " + v(sel.getDiaSemana(), "") + " " + v(sel.getHorario(), "") + " (" + v(sel.getTurno()) + ") · " + sel.getTotalMatriculados() + " cursistas");
            }
        });
        comboRow.add(cbTurmasDestino, BorderLayout.CENTER);
        turmaSelectBox.add(comboRow);

        // Digitação / Confirmação do Código da Turma Nova e Cód SERE
        JPanel manualRow = new JPanel(new FlowLayout(FlowLayout.LEFT, 10, 0));
        manualRow.setOpaque(false);
        manualRow.add(new JLabel("Código Exato Turma Nova (Coluna H):"));
        txtTurmaManual = new JTextField(v(solicitacao.getTurmaNova(), ""), 28);
        txtTurmaManual.setFont(new Font("Segoe UI", Font.BOLD, 12));
        manualRow.add(txtTurmaManual);

        manualRow.add(new JLabel("Cód. SERE Turma Nova:"));
        txtCodSere = new JTextField(v(solicitacao.getCodSereNova(), ""), 12);
        txtCodSere.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        manualRow.add(txtCodSere);
        turmaSelectBox.add(manualRow);

        centerBox.add(turmaSelectBox, BorderLayout.NORTH);

        // Preview da Equipe Pedagógica da Nova Turma
        JPanel previewPanel = new JPanel(new GridLayout(1, 3, 10, 4));
        previewPanel.setBackground(new Color(240, 253, 244));
        previewPanel.setBorder(new CompoundBorder(
                new LineBorder(new Color(134, 239, 172), 1, true),
                new EmptyBorder(8, 10, 8, 10)
        ));
        lblPreviewFormadorNovo = new JLabel("🎓 Formador(a) Destino: (selecione a turma)");
        lblPreviewFormadorNovo.setFont(new Font("Segoe UI", Font.BOLD, 11));
        lblPreviewFormadorNovo.setForeground(new Color(22, 101, 52));

        lblPreviewTutorNovo = new JLabel("👤 Tutor(a) Destino: (selecione a turma)");
        lblPreviewTutorNovo.setFont(new Font("Segoe UI", Font.BOLD, 11));
        lblPreviewTutorNovo.setForeground(new Color(22, 101, 52));

        lblPreviewHorarioNovo = new JLabel("🕒 Horário/Turno: —");
        lblPreviewHorarioNovo.setFont(new Font("Segoe UI", Font.PLAIN, 11));
        lblPreviewHorarioNovo.setForeground(new Color(22, 101, 52));

        previewPanel.add(lblPreviewFormadorNovo);
        previewPanel.add(lblPreviewTutorNovo);
        previewPanel.add(lblPreviewHorarioNovo);
        centerBox.add(previewPanel, BorderLayout.CENTER);

        // Parecer Administrativo + Botões Rápidos
        JPanel parecerBox = new JPanel(new BorderLayout(4, 4));
        parecerBox.setOpaque(false);

        JPanel parecerTop = new JPanel(new BorderLayout());
        parecerTop.setOpaque(false);
        JLabel lblPar = new JLabel("Parecer / Observação Administrativa (será gravado no Histórico e no E-mail):");
        lblPar.setFont(new Font("Segoe UI", Font.BOLD, 12));
        parecerTop.add(lblPar, BorderLayout.WEST);

        JPanel quickBtns = new JPanel(new FlowLayout(FlowLayout.RIGHT, 6, 0));
        quickBtns.setOpaque(false);
        JButton btnTextoDef = new JButton("Texto Padrão Deferimento");
        btnTextoDef.setFont(new Font("Segoe UI", Font.PLAIN, 11));
        btnTextoDef.addActionListener(e -> {
            rbDeferido.setSelected(true);
            txtParecer.setText("Solicitação deferida após análise de compatibilidade de horário e disponibilidade de vaga na turma de destino.");
        });
        JButton btnTextoIndef = new JButton("Texto Padrão Indeferimento");
        btnTextoIndef.setFont(new Font("Segoe UI", Font.PLAIN, 11));
        btnTextoIndef.addActionListener(e -> {
            rbIndeferido.setSelected(true);
            txtParecer.setText("Solicitação indeferida por indisponibilidade de vaga no horário pretendido ou incompatibilidade com o componente curricular de ingresso.");
        });
        quickBtns.add(btnTextoDef);
        quickBtns.add(btnTextoIndef);
        parecerTop.add(quickBtns, BorderLayout.EAST);

        parecerBox.add(parecerTop, BorderLayout.NORTH);

        txtParecer = new JTextArea(2, 60);
        txtParecer.setLineWrap(true);
        txtParecer.setWrapStyleWord(true);
        txtParecer.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        txtParecer.setText("Solicitação deferida após análise de compatibilidade de horário e disponibilidade de vaga na turma de destino.");
        parecerBox.add(new JScrollPane(txtParecer), BorderLayout.CENTER);

        centerBox.add(parecerBox, BorderLayout.SOUTH);

        rbDeferido.addActionListener(e -> {
            cbTurmasDestino.setEnabled(true);
            txtTurmaManual.setEnabled(true);
            txtCodSere.setEnabled(true);
        });
        rbIndeferido.addActionListener(e -> {
            cbTurmasDestino.setEnabled(false);
            txtTurmaManual.setEnabled(false);
            txtCodSere.setEnabled(false);
        });

        content.add(centerBox, BorderLayout.CENTER);
        card.add(content, BorderLayout.CENTER);
        return card;
    }

    private void carregarTurmasAsync() {
        new Thread(() -> {
            todasTurmas = sheetsService.listarTurmasDisponiveis(false);
            SwingUtilities.invokeLater(this::atualizarComboTurmas);
        }).start();
    }

    private void atualizarComboTurmas() {
        if (cbTurmasDestino == null) return;
        String filtroTexto = txtBuscaTurma.getText() != null ? txtBuscaTurma.getText().trim().toUpperCase() : "";
        boolean mesmoComp = chkFiltrarMesmoComponente != null && chkFiltrarMesmoComponente.isSelected();
        String compCursista = v(solicitacao.getComponente(), "").trim().toUpperCase();

        cbTurmasDestino.removeAllItems();
        for (TurmaResumo tr : todasTurmas) {
            if (mesmoComp && !compCursista.isEmpty() && !compCursista.equals("—")) {
                String trComp = v(tr.getComponente(), "").toUpperCase();
                if (!trComp.equals(compCursista) && !trComp.contains(compCursista) && !compCursista.contains(trComp)) {
                    continue;
                }
            }
            if (!filtroTexto.isEmpty()) {
                String blob = (v(tr.getCodigo(), "") + " " + v(tr.getComponente(), "") + " " +
                        v(tr.getFormadorNome(), "") + " " + v(tr.getTurno(), "") + " " + v(tr.getHorario(), "")).toUpperCase();
                if (!blob.contains(filtroTexto)) continue;
            }
            cbTurmasDestino.addItem(tr);
        }
    }

    private void confirmarProcessamento() {
        String decisao = rbDeferido.isSelected() ? "Deferido" : "Indeferido";
        String turmaNova = txtTurmaManual.getText() != null ? txtTurmaManual.getText().trim() : "";
        String codSere = txtCodSere.getText() != null ? txtCodSere.getText().trim() : "";
        String parecer = txtParecer.getText() != null ? txtParecer.getText().trim() : "";

        if ("Deferido".equals(decisao) && turmaNova.isEmpty()) {
            JOptionPane.showMessageDialog(this,
                    "Para DEFERIR a movimentação, selecione ou informe o código da Turma Nova (Destino) que será gravada na Coluna H.",
                    "Turma Destino Obrigatória", JOptionPane.WARNING_MESSAGE);
            return;
        }

        solicitacao.setTurmaNova(turmaNova);
        solicitacao.setCodSereNova(codSere);
        solicitacao.setNotaResolucao(parecer);

        btnConfirmar.setEnabled(false);
        setCursor(Cursor.getPredefinedCursor(Cursor.WAIT_CURSOR));

        new Thread(() -> {
            DadosNotificacaoEmail dadosEmail = sheetsService.processarMovimentacao(
                    solicitacao, decisao, codSere, parecer
            );

            SwingUtilities.invokeLater(() -> {
                setCursor(Cursor.getDefaultCursor());
                btnConfirmar.setEnabled(true);
                dispose();

                if (onProcessedCallback != null) {
                    onProcessedCallback.run();
                }

                DialogEnvioEmail dialogEmail = new DialogEnvioEmail(parentFrame, dadosEmail, sheetsService);
                dialogEmail.setVisible(true);
            });
        }).start();
    }

    private String v(String s) {
        return v(s, "—");
    }

    private String v(String s, String padrao) {
        return (s != null && !s.trim().isEmpty()) ? s.trim() : padrao;
    }
}
