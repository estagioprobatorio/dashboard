package br.gov.pr.seed.ep.ui;

import br.gov.pr.seed.ep.model.DadosNotificacaoEmail;
import br.gov.pr.seed.ep.model.Movimentacao;
import br.gov.pr.seed.ep.model.Solicitacao;
import br.gov.pr.seed.ep.service.DatabaseService;
import br.gov.pr.seed.ep.service.GoogleSheetsService;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import javax.swing.border.TitledBorder;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Interface Gráfica Principal do Sistema Desktop Java Swing (SEED-PR).
 * Gestão Oficial de Movimentações de Turmas do Estágio Probatório.
 */
public class MovimentacoesFrame extends JFrame {

    private final DatabaseService dbService = new DatabaseService();
    private final GoogleSheetsService sheetsService = new GoogleSheetsService();

    // Abas
    private JTabbedPane tabbedPane;

    // Aba 1: Solicitações Pendentes
    private JTable tabelaPendentes;
    private DefaultTableModel modelPendentes;
    private final List<Solicitacao> listaPendentesAtual = new ArrayList<>();
    private Solicitacao solicitacaoSelecionada = null;

    // Painel de Detalhes da Solicitação Selecionada
    private JLabel lblSelCursista;
    private JLabel lblSelCgm;
    private JLabel lblSelTurmaAtual;
    private JLabel lblSelTurmaSolicitada;
    private JLabel lblSelMotivo;
    private JRadioButton rbDeferido;
    private JRadioButton rbIndeferido;
    private JTextField txtCodSereNova;
    private JTextArea txtParecer;
    private JButton btnProcessar;

    // Aba 2: Histórico de Movimentações
    private JTable tabelaHistorico;
    private DefaultTableModel modelHistorico;

    // Aba 3: Movimentação Direta Manual
    private JTextField txtNomeCursista;
    private JTextField txtCpf;
    private JTextField txtCgm;
    private JTextField txtEmailCursista;
    private JTextField txtTurmaAnterior;
    private JTextField txtTurmaNova;
    private JComboBox<String> cbTipoAcao;
    private JTextField txtTutor;
    private JTextField txtEmailTutor;
    private JTextField txtNre;
    private JTextField txtMotivo;
    private JTextArea txtJustificativa;
    private JComboBox<String> cbStatus;

    public MovimentacoesFrame() {
        super("SEED-PR · Gestão de Movimentações (Estágio Probatório)");
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setSize(1150, 780);
        setLocationRelativeTo(null);

        initComponents();
        carregarSolicitacoesPendentesAsync();
        carregarHistoricoAsync();
    }

    private void initComponents() {
        JPanel rootPanel = new JPanel(new BorderLayout(10, 10));
        rootPanel.setBorder(new EmptyBorder(10, 12, 12, 12));
        rootPanel.setBackground(new Color(248, 250, 252));

        // 1. Cabeçalho Oficial SEED-PR
        JPanel headerPanel = new JPanel(new BorderLayout());
        headerPanel.setBackground(new Color(0, 29, 61));
        headerPanel.setBorder(new EmptyBorder(14, 18, 14, 18));

        JLabel lblTitle = new JLabel("SEED-PR · ESTADO DO PARANÁ · ESTÁGIO PROBATÓRIO");
        lblTitle.setFont(new Font("Segoe UI", Font.BOLD, 16));
        lblTitle.setForeground(Color.WHITE);

        JLabel lblSub = new JLabel("Central Desktop de Movimentações · Atualização de Turmas (Coluna H), Histórico e Notificações por E-mail");
        lblSub.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        lblSub.setForeground(new Color(191, 219, 254));

        headerPanel.add(lblTitle, BorderLayout.NORTH);
        headerPanel.add(lblSub, BorderLayout.SOUTH);
        rootPanel.add(headerPanel, BorderLayout.NORTH);

        // 2. Abas do Sistema
        tabbedPane = new JTabbedPane();
        tabbedPane.setFont(new Font("Segoe UI", Font.BOLD, 12));

        tabbedPane.addTab("📥 Solicitações Pendentes (Troca de Turma / Modalidade / AF)", criarPainelSolicitacoesPendentes());
        tabbedPane.addTab("📜 Histórico de Movimentações (TiDB Cloud)", criarPainelHistorico());
        tabbedPane.addTab("✍️ Nova Movimentação Manual Direta", criarPainelMovimentacaoDireta());

        rootPanel.add(tabbedPane, BorderLayout.CENTER);
        setContentPane(rootPanel);
    }

    // =========================================================================
    // ABA 1: SOLICITAÇÕES PENDENTES
    // =========================================================================
    private JPanel criarPainelSolicitacoesPendentes() {
        JPanel panel = new JPanel(new BorderLayout(8, 8));
        panel.setBackground(Color.WHITE);
        panel.setBorder(new EmptyBorder(8, 8, 8, 8));

        // Topo: Ações e Filtros
        JPanel topBar = new JPanel(new FlowLayout(FlowLayout.LEFT, 10, 6));
        topBar.setOpaque(false);

        JButton btnRecarregar = new JButton("🔄 Recarregar Solicitações");
        btnRecarregar.setFont(new Font("Segoe UI", Font.BOLD, 12));
        btnRecarregar.addActionListener(e -> carregarSolicitacoesPendentesAsync());
        topBar.add(btnRecarregar);

        JLabel lblInfo = new JLabel("💡 Selecione uma solicitação na lista para analisar, deferir/indeferir e disparar os e-mails aos envolvidos.");
        lblInfo.setFont(new Font("Segoe UI", Font.ITALIC, 11));
        lblInfo.setForeground(new Color(100, 116, 139));
        topBar.add(lblInfo);

        panel.add(topBar, BorderLayout.NORTH);

        // Centro: Tabela de Solicitações
        String[] cols = {"Origem / Aba", "Data Solicitação", "Cursista", "CGM / CPF", "Turma Atual", "Turma Solicitada", "Tipo de Ação", "Motivo"};
        modelPendentes = new DefaultTableModel(cols, 0) {
            @Override
            public boolean isCellEditable(int row, int col) { return false; }
        };

        tabelaPendentes = new JTable(modelPendentes);
        tabelaPendentes.setRowHeight(26);
        tabelaPendentes.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        tabelaPendentes.getTableHeader().setFont(new Font("Segoe UI", Font.BOLD, 12));
        tabelaPendentes.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);

        tabelaPendentes.getSelectionModel().addListSelectionListener(e -> {
            if (!e.getValueIsAdjusting()) {
                int row = tabelaPendentes.getSelectedRow();
                if (row >= 0 && row < listaPendentesAtual.size()) {
                    selecionarSolicitacao(listaPendentesAtual.get(row));
                }
            }
        });

        JScrollPane scrollPendentes = new JScrollPane(tabelaPendentes);

        // Painel Lateral / Inferior: Detalhes e Decisão
        JPanel decisaoPanel = new JPanel(new BorderLayout(8, 8));
        decisaoPanel.setBorder(BorderFactory.createTitledBorder(
                BorderFactory.createLineBorder(new Color(203, 213, 225)),
                "Análise e Deferimento da Solicitação Selecionada",
                TitledBorder.LEFT, TitledBorder.TOP,
                new Font("Segoe UI", Font.BOLD, 13), new Color(15, 23, 42)
        ));
        decisaoPanel.setBackground(new Color(248, 250, 252));
        decisaoPanel.setPreferredSize(new Dimension(1000, 240));

        // Dados do Cursista Selecionado
        JPanel dadosCursistaPanel = new JPanel(new GridLayout(3, 2, 8, 4));
        dadosCursistaPanel.setOpaque(false);
        dadosCursistaPanel.setBorder(new EmptyBorder(6, 10, 6, 10));

        lblSelCursista = new JLabel("Cursista: (nenhum selecionado)");
        lblSelCursista.setFont(new Font("Segoe UI", Font.BOLD, 12));
        lblSelCgm = new JLabel("CGM: — | Linha Funcional: —");
        lblSelTurmaAtual = new JLabel("Turma Atual (Coluna H): —");
        lblSelTurmaSolicitada = new JLabel("Turma Solicitada: —");
        lblSelMotivo = new JLabel("Motivo: —");

        dadosCursistaPanel.add(lblSelCursista);
        dadosCursistaPanel.add(lblSelTurmaAtual);
        dadosCursistaPanel.add(lblSelCgm);
        dadosCursistaPanel.add(lblSelTurmaSolicitada);
        dadosCursistaPanel.add(lblSelMotivo);

        decisaoPanel.add(dadosCursistaPanel, BorderLayout.NORTH);

        // Formulário de Decisão e Cód SERE
        JPanel formDecisao = new JPanel(new FlowLayout(FlowLayout.LEFT, 15, 6));
        formDecisao.setOpaque(false);

        JLabel lblDecisao = new JLabel("Decisão:");
        lblDecisao.setFont(new Font("Segoe UI", Font.BOLD, 12));
        formDecisao.add(lblDecisao);

        rbDeferido = new JRadioButton("✓ Deferido (Atualizar Coluna H)", true);
        rbDeferido.setFont(new Font("Segoe UI", Font.BOLD, 12));
        rbDeferido.setForeground(new Color(22, 101, 52));
        rbDeferido.setOpaque(false);

        rbIndeferido = new JRadioButton("✕ Indeferido", false);
        rbIndeferido.setFont(new Font("Segoe UI", Font.BOLD, 12));
        rbIndeferido.setForeground(new Color(185, 28, 28));
        rbIndeferido.setOpaque(false);

        ButtonGroup bgDecisao = new ButtonGroup();
        bgDecisao.add(rbDeferido);
        bgDecisao.add(rbIndeferido);

        formDecisao.add(rbDeferido);
        formDecisao.add(rbIndeferido);

        formDecisao.add(new JLabel("Cód. SERE Turma Nova:"));
        txtCodSereNova = new JTextField(12);
        formDecisao.add(txtCodSereNova);

        decisaoPanel.add(formDecisao, BorderLayout.CENTER);

        // Parecer e Botão Processar
        JPanel footerDecisao = new JPanel(new BorderLayout(8, 4));
        footerDecisao.setOpaque(false);
        footerDecisao.setBorder(new EmptyBorder(0, 10, 8, 10));

        JPanel parecerPanel = new JPanel(new BorderLayout(4, 2));
        parecerPanel.setOpaque(false);
        parecerPanel.add(new JLabel("Parecer / Observação Administrativa:"), BorderLayout.NORTH);
        txtParecer = new JTextArea(2, 40);
        txtParecer.setLineWrap(true);
        parecerPanel.add(new JScrollPane(txtParecer), BorderLayout.CENTER);
        footerDecisao.add(parecerPanel, BorderLayout.CENTER);

        btnProcessar = new JButton("⚡ Processar Movimentação & Abrir E-mail");
        btnProcessar.setFont(new Font("Segoe UI", Font.BOLD, 13));
        btnProcessar.setBackground(new Color(0, 82, 163));
        btnProcessar.setForeground(Color.WHITE);
        btnProcessar.setFocusPainted(false);
        btnProcessar.setEnabled(false);
        btnProcessar.addActionListener(e -> executarProcessamentoSolicitacao());

        JPanel btnWrapper = new JPanel(new FlowLayout(FlowLayout.RIGHT));
        btnWrapper.setOpaque(false);
        btnWrapper.add(btnProcessar);
        footerDecisao.add(btnWrapper, BorderLayout.EAST);

        decisaoPanel.add(footerDecisao, BorderLayout.SOUTH);

        JSplitPane splitPendentes = new JSplitPane(JSplitPane.VERTICAL_SPLIT, scrollPendentes, decisaoPanel);
        splitPendentes.setResizeWeight(0.60);
        splitPendentes.setDividerSize(6);

        panel.add(splitPendentes, BorderLayout.CENTER);
        return panel;
    }

    private void selecionarSolicitacao(Solicitacao sol) {
        this.solicitacaoSelecionada = sol;
        lblSelCursista.setText("Cursista: " + (sol.getNomeCursista() != null ? sol.getNomeCursista() : sol.getEmailCursista()));
        lblSelCgm.setText("CGM: " + (sol.getCgm() != null ? sol.getCgm() : "—") + " | LF: " + (sol.getLinhaFuncional() != null ? sol.getLinhaFuncional() : "1"));
        lblSelTurmaAtual.setText("Turma Atual: " + (sol.getTurmaAntiga() != null ? sol.getTurmaAntiga() : "—"));
        lblSelTurmaSolicitada.setText("Turma Solicitada: " + (sol.getTurmaNova() != null ? sol.getTurmaNova() : "—"));
        lblSelMotivo.setText("Motivo: " + (sol.getMotivo() != null ? sol.getMotivo() : "—"));

        btnProcessar.setEnabled(true);
    }

    private void executarProcessamentoSolicitacao() {
        if (solicitacaoSelecionada == null) {
            JOptionPane.showMessageDialog(this, "Selecione uma solicitação primeiro.", "Aviso", JOptionPane.WARNING_MESSAGE);
            return;
        }

        String decisao = rbDeferido.isSelected() ? "Deferido" : "Indeferido";
        String codSere = txtCodSereNova.getText().trim();
        String parecer = txtParecer.getText().trim();

        int confirm = JOptionPane.showConfirmDialog(this,
                "Confirma o registro da movimentação como [" + decisao.toUpperCase() + "]?\n\n" +
                        "• Cursista: " + solicitacaoSelecionada.getNomeCursista() + "\n" +
                        "• Turma Destino: " + solicitacaoSelecionada.getTurmaNova() + "\n" +
                        (decisao.equals("Deferido") ? "• Ação: Atualizará a Coluna H e gravará no Histórico de Movimentações.\n" : "") +
                        "• Em seguida, a janela de envio de e-mails será aberta com os 5 destinatários pré-preenchidos.",
                "Confirmar Movimentação", JOptionPane.YES_NO_OPTION, JOptionPane.QUESTION_MESSAGE);

        if (confirm != JOptionPane.YES_OPTION) return;

        btnProcessar.setEnabled(false);
        setCursor(Cursor.getPredefinedCursor(Cursor.WAIT_CURSOR));

        new Thread(() -> {
            DadosNotificacaoEmail dadosEmail = sheetsService.processarMovimentacao(
                    solicitacaoSelecionada, decisao, codSere, parecer
            );

            SwingUtilities.invokeLater(() -> {
                setCursor(Cursor.getDefaultCursor());
                btnProcessar.setEnabled(true);

                // Abre a janela de e-mails
                DialogEnvioEmail dialogEmail = new DialogEnvioEmail(this, dadosEmail, sheetsService);
                dialogEmail.setVisible(true);

                // Recarrega as tabelas
                carregarSolicitacoesPendentesAsync();
                carregarHistoricoAsync();
            });
        }).start();
    }

    private void carregarSolicitacoesPendentesAsync() {
        new Thread(() -> {
            List<Solicitacao> lista = sheetsService.carregarSolicitacoesPendentes();
            SwingUtilities.invokeLater(() -> {
                listaPendentesAtual.clear();
                listaPendentesAtual.addAll(lista);
                modelPendentes.setRowCount(0);

                for (Solicitacao s : lista) {
                    modelPendentes.addRow(new Object[]{
                            s.getOrigem() != null ? s.getOrigem() : "Planilha",
                            s.getDataSolicitacao(),
                            s.getNomeCursista() != null ? s.getNomeCursista() : s.getEmailCursista(),
                            s.getCgm() != null ? s.getCgm() : s.getCpf(),
                            s.getTurmaAntiga(),
                            s.getTurmaNova(),
                            s.getTipoAcao(),
                            s.getMotivo()
                    });
                }

                if (lista.isEmpty()) {
                    lblSelCursista.setText("Cursista: (nenhuma solicitação pendente)");
                    btnProcessar.setEnabled(false);
                }
            });
        }).start();
    }

    // =========================================================================
    // ABA 2: HISTÓRICO DE MOVIMENTAÇÕES
    // =========================================================================
    private JPanel criarPainelHistorico() {
        JPanel panel = new JPanel(new BorderLayout(8, 8));
        panel.setBackground(Color.WHITE);
        panel.setBorder(new EmptyBorder(8, 8, 8, 8));

        JPanel topBar = new JPanel(new FlowLayout(FlowLayout.LEFT, 10, 6));
        topBar.setOpaque(false);

        JButton btnAtualizar = new JButton("🔄 Recarregar Histórico");
        btnAtualizar.addActionListener(e -> carregarHistoricoAsync());
        topBar.add(btnAtualizar);

        JLabel lblInfo = new JLabel("Histórico sincronizado com TiDB Cloud e aba 'Histórico de Movimentações' da Planilha Mestra.");
        lblInfo.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        lblInfo.setForeground(new Color(100, 116, 139));
        topBar.add(lblInfo);

        panel.add(topBar, BorderLayout.NORTH);

        String[] cols = {"ID", "Data/Hora", "Cursista", "CGM", "Turma Anterior", "Turma Nova", "Tutor", "Status", "Motivo"};
        modelHistorico = new DefaultTableModel(cols, 0) {
            @Override
            public boolean isCellEditable(int row, int col) { return false; }
        };

        tabelaHistorico = new JTable(modelHistorico);
        tabelaHistorico.setRowHeight(24);
        tabelaHistorico.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        tabelaHistorico.getTableHeader().setFont(new Font("Segoe UI", Font.BOLD, 12));

        panel.add(new JScrollPane(tabelaHistorico), BorderLayout.CENTER);
        return panel;
    }

    private void carregarHistoricoAsync() {
        new Thread(() -> {
            List<Movimentacao> lista = dbService.listarMovimentacoes();
            SwingUtilities.invokeLater(() -> {
                modelHistorico.setRowCount(0);
                for (Movimentacao m : lista) {
                    modelHistorico.addRow(new Object[]{
                            m.getId(),
                            m.getTimestamp(),
                            m.getNomeCursista() != null ? m.getNomeCursista() : m.getEmailCursista(),
                            m.getCgm(),
                            m.getTurmaAnterior(),
                            m.getTurmaNova(),
                            m.getTutor(),
                            m.getStatus(),
                            m.getMotivo()
                    });
                }
            });
        }).start();
    }

    // =========================================================================
    // ABA 3: MOVIMENTAÇÃO MANUAL DIRETA
    // =========================================================================
    private JPanel criarPainelMovimentacaoDireta() {
        JPanel formContainer = new JPanel(new BorderLayout(8, 8));
        formContainer.setBackground(Color.WHITE);
        formContainer.setBorder(new EmptyBorder(12, 12, 12, 12));

        JPanel fieldsPanel = new JPanel(new GridLayout(6, 4, 10, 8));
        fieldsPanel.setBorder(BorderFactory.createTitledBorder(
                BorderFactory.createLineBorder(new Color(203, 213, 225)),
                "Nova Movimentação Manual Direta",
                TitledBorder.LEFT, TitledBorder.TOP,
                new Font("Segoe UI", Font.BOLD, 13), new Color(15, 23, 42)
        ));
        fieldsPanel.setBackground(Color.WHITE);

        // Linha 1
        fieldsPanel.add(new JLabel("Nome Completo do Cursista:"));
        txtNomeCursista = new JTextField();
        fieldsPanel.add(txtNomeCursista);

        fieldsPanel.add(new JLabel("CPF (somente números):"));
        txtCpf = new JTextField();
        fieldsPanel.add(txtCpf);

        // Linha 2
        fieldsPanel.add(new JLabel("CGM:"));
        txtCgm = new JTextField();
        fieldsPanel.add(txtCgm);

        fieldsPanel.add(new JLabel("E-mail @escola.pr.gov.br:"));
        txtEmailCursista = new JTextField();
        fieldsPanel.add(txtEmailCursista);

        // Linha 3
        fieldsPanel.add(new JLabel("Turma Anterior:"));
        txtTurmaAnterior = new JTextField();
        fieldsPanel.add(txtTurmaAnterior);

        fieldsPanel.add(new JLabel("Turma Nova (Destino):"));
        txtTurmaNova = new JTextField();
        fieldsPanel.add(txtTurmaNova);

        // Linha 4
        fieldsPanel.add(new JLabel("Tipo de Ação:"));
        cbTipoAcao = new JComboBox<>(new String[]{
                "Troca de Turma", "Remanejamento", "Troca de Modalidade",
                "Ajuste de Vínculo", "Reintegração", "Outros"
        });
        fieldsPanel.add(cbTipoAcao);

        fieldsPanel.add(new JLabel("Status:"));
        cbStatus = new JComboBox<>(new String[]{"Deferido", "Pendente", "Indeferido"});
        fieldsPanel.add(cbStatus);

        // Linha 5
        fieldsPanel.add(new JLabel("Tutor Responsável:"));
        txtTutor = new JTextField();
        fieldsPanel.add(txtTutor);

        fieldsPanel.add(new JLabel("E-mail do Tutor:"));
        txtEmailTutor = new JTextField();
        fieldsPanel.add(txtEmailTutor);

        // Linha 6
        fieldsPanel.add(new JLabel("NRE:"));
        txtNre = new JTextField();
        fieldsPanel.add(txtNre);

        fieldsPanel.add(new JLabel("Motivo Resumido:"));
        txtMotivo = new JTextField();
        fieldsPanel.add(txtMotivo);

        formContainer.add(fieldsPanel, BorderLayout.NORTH);

        JPanel bottomPanel = new JPanel(new BorderLayout(8, 8));
        bottomPanel.setOpaque(false);

        JPanel justPanel = new JPanel(new BorderLayout(4, 4));
        justPanel.setOpaque(false);
        justPanel.add(new JLabel("Justificativa / Parecer:"), BorderLayout.NORTH);
        txtJustificativa = new JTextArea(3, 20);
        txtJustificativa.setLineWrap(true);
        justPanel.add(new JScrollPane(txtJustificativa), BorderLayout.CENTER);
        bottomPanel.add(justPanel, BorderLayout.CENTER);

        JPanel btnPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT, 10, 8));
        btnPanel.setOpaque(false);

        JButton btnLimpar = new JButton("Limpar");
        btnLimpar.addActionListener(e -> limparCampos());
        btnPanel.add(btnLimpar);

        JButton btnGravar = new JButton("✓ Gravar e Notificar");
        btnGravar.setFont(new Font("Segoe UI", Font.BOLD, 13));
        btnGravar.setBackground(new Color(0, 152, 74));
        btnGravar.setForeground(Color.WHITE);
        btnGravar.setFocusPainted(false);
        btnGravar.addActionListener(e -> executarGravacaoManual());
        btnPanel.add(btnGravar);

        bottomPanel.add(btnPanel, BorderLayout.SOUTH);
        formContainer.add(bottomPanel, BorderLayout.CENTER);

        return formContainer;
    }

    private void executarGravacaoManual() {
        String nome = txtNomeCursista.getText().trim();
        String turmaNova = txtTurmaNova.getText().trim();

        if (nome.isEmpty()) {
            JOptionPane.showMessageDialog(this, "Por favor, informe o nome do cursista.", "Campo Obrigatório", JOptionPane.WARNING_MESSAGE);
            txtNomeCursista.requestFocus();
            return;
        }

        Movimentacao m = new Movimentacao();
        m.setNomeCursista(nome);
        m.setCpf(txtCpf.getText().trim());
        m.setCgm(txtCgm.getText().trim());
        m.setEmailCursista(txtEmailCursista.getText().trim());
        m.setTurmaAnterior(txtTurmaAnterior.getText().trim());
        m.setTurmaNova(turmaNova);
        m.setTipoAcao((String) cbTipoAcao.getSelectedItem());
        m.setStatus((String) cbStatus.getSelectedItem());
        m.setTutor(txtTutor.getText().trim());
        m.setEmailTutor(txtEmailTutor.getText().trim());
        m.setNre(txtNre.getText().trim());
        m.setMotivo(txtMotivo.getText().trim());
        m.setJustificativa(txtJustificativa.getText().trim());

        new Thread(() -> {
            boolean ok = dbService.gravarMovimentacao(m);
            SwingUtilities.invokeLater(() -> {
                if (ok) {
                    JOptionPane.showMessageDialog(this,
                            "Movimentação do cursista registrada com sucesso no TiDB Cloud!\n" +
                                    "O dashboard web refletirá a alteração automaticamente.",
                            "Sucesso", JOptionPane.INFORMATION_MESSAGE);

                    // Prepara dados de notificação e abre a janela de e-mail
                    DadosNotificacaoEmail emailData = new DadosNotificacaoEmail();
                    emailData.setCursistaNome(m.getNomeCursista());
                    emailData.setCursistaEmail(m.getEmailCursista());
                    emailData.setCgm(m.getCgm());
                    emailData.setTurmaAntiga(m.getTurmaAnterior());
                    emailData.setTurmaNova(m.getTurmaNova());
                    emailData.setTipoAcao(m.getTipoAcao());
                    emailData.setStatusDecisao(m.getStatus());
                    emailData.setNotaResolucao(m.getJustificativa());

                    DialogEnvioEmail dialog = new DialogEnvioEmail(this, emailData, sheetsService);
                    dialog.setVisible(true);

                    limparCampos();
                    carregarHistoricoAsync();
                } else {
                    JOptionPane.showMessageDialog(this,
                            "Não foi possível gravar a movimentação. Verifique a conexão com o TiDB Cloud.",
                            "Erro na Gravação", JOptionPane.ERROR_MESSAGE);
                }
            });
        }).start();
    }

    private void limparCampos() {
        txtNomeCursista.setText("");
        txtCpf.setText("");
        txtCgm.setText("");
        txtEmailCursista.setText("");
        txtTurmaAnterior.setText("");
        txtTurmaNova.setText("");
        txtTutor.setText("");
        txtEmailTutor.setText("");
        txtNre.setText("");
        txtMotivo.setText("");
        txtJustificativa.setText("");
    }
}
