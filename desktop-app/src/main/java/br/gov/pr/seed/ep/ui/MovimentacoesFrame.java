package br.gov.pr.seed.ep.ui;

import br.gov.pr.seed.ep.model.DadosNotificacaoEmail;
import br.gov.pr.seed.ep.model.Movimentacao;
import br.gov.pr.seed.ep.model.Solicitacao;
import br.gov.pr.seed.ep.service.DatabaseService;
import br.gov.pr.seed.ep.service.GoogleSheetsService;

import javax.swing.*;
import javax.swing.border.CompoundBorder;
import javax.swing.border.EmptyBorder;
import javax.swing.border.LineBorder;
import javax.swing.event.DocumentEvent;
import javax.swing.event.DocumentListener;
import javax.swing.table.DefaultTableCellRenderer;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Interface Gráfica Principal do Sistema Desktop Java Swing (SEED-PR).
 * Aparência integrada ao Sistema Operacional e ao Design System Institucional SEED-PR.
 * Clique em qualquer solicitação abre a janela modal completa para Deferimento/Indeferimento.
 */
public class MovimentacoesFrame extends JFrame {

    private final DatabaseService dbService = new DatabaseService();
    private final GoogleSheetsService sheetsService = new GoogleSheetsService();

    private JTabbedPane tabbedPane;

    // KPIs no Topo
    private JLabel lblKpiPendentes;
    private JLabel lblKpiHistorico;
    private JLabel lblKpiStatusBanco;

    // Aba 1: Solicitações Pendentes
    private JTable tabelaPendentes;
    private DefaultTableModel modelPendentes;
    private JTextField txtFiltroPendentes;
    private final List<Solicitacao> listaPendentesCompleta = new ArrayList<>();
    private final List<Solicitacao> listaPendentesFiltrada = new ArrayList<>();

    // Aba 2: Histórico de Movimentações
    private JTable tabelaHistorico;
    private DefaultTableModel modelHistorico;
    private JTextField txtFiltroHistorico;
    private final List<Movimentacao> listaHistoricoCompleta = new ArrayList<>();

    // Aba 3: Movimentação Direta Manual
    private JTextField txtNomeCursista;
    private JTextField txtCpf;
    private JTextField txtCgm;
    private JTextField txtLfManual;
    private JTextField txtEmailCursista;
    private JTextField txtTurmaAnterior;
    private JTextField txtTurmaNova;
    private JTextField txtCodSereManual;
    private JComboBox<String> cbTipoAcao;
    private JTextField txtTutor;
    private JTextField txtEmailTutor;
    private JTextField txtNre;
    private JTextField txtMotivo;
    private JTextArea txtJustificativa;
    private JComboBox<String> cbStatus;

    public MovimentacoesFrame() {
        super("SEED-PR · Sistema Oficial de Gestão de Movimentações · Estágio Probatório");
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setSize(1240, 800);
        setMinimumSize(new Dimension(1020, 680));
        setLocationRelativeTo(null);

        initComponents();
        carregarSolicitacoesPendentesAsync();
        carregarHistoricoAsync();
    }

    private void initComponents() {
        JPanel rootPanel = new JPanel(new BorderLayout(0, 12));
        rootPanel.setBorder(new EmptyBorder(0, 0, 12, 0));
        rootPanel.setBackground(new Color(241, 245, 249));

        // 1. TOPO INSTITUCIONAL + CARDS KPI (Idêntico ao Console Web SEED-PR)
        JPanel northWrapper = new JPanel(new BorderLayout(0, 12));
        northWrapper.setOpaque(false);

        JPanel headerBanner = new JPanel(new BorderLayout());
        headerBanner.setBackground(new Color(0, 29, 61));
        headerBanner.setBorder(new EmptyBorder(16, 22, 16, 22));

        JPanel titlesBox = new JPanel(new GridLayout(2, 1, 0, 2));
        titlesBox.setOpaque(false);

        JLabel lblTitle = new JLabel("GOVERNO DO ESTADO DO PARANÁ · SEED-PR · ESTÁGIO PROBATÓRIO");
        lblTitle.setFont(new Font("Segoe UI", Font.BOLD, 16));
        lblTitle.setForeground(Color.WHITE);

        JLabel lblSub = new JLabel("Console Desktop Exclusivo para Atendimento de Chamados, Movimentações de Turma (Coluna H) e Disparo Oficial de E-mails");
        lblSub.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        lblSub.setForeground(new Color(186, 230, 253));

        titlesBox.add(lblTitle);
        titlesBox.add(lblSub);
        headerBanner.add(titlesBox, BorderLayout.WEST);

        JButton btnSyncTop = new JButton("🔄 Atualizar Dados do TiDB Cloud");
        btnSyncTop.setFont(new Font("Segoe UI", Font.BOLD, 12));
        btnSyncTop.setBackground(new Color(0, 114, 188));
        btnSyncTop.setForeground(Color.WHITE);
        btnSyncTop.setFocusPainted(false);
        btnSyncTop.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
        btnSyncTop.addActionListener(e -> {
            carregarSolicitacoesPendentesAsync();
            carregarHistoricoAsync();
        });
        JPanel syncBtnWrap = new JPanel(new GridBagLayout());
        syncBtnWrap.setOpaque(false);
        syncBtnWrap.add(btnSyncTop);
        headerBanner.add(syncBtnWrap, BorderLayout.EAST);

        northWrapper.add(headerBanner, BorderLayout.NORTH);

        // Barra de KPIs
        JPanel kpiRow = new JPanel(new GridLayout(1, 3, 14, 0));
        kpiRow.setOpaque(false);
        kpiRow.setBorder(new EmptyBorder(0, 16, 0, 16));

        lblKpiPendentes = new JLabel("...");
        lblKpiHistorico = new JLabel("...");
        lblKpiStatusBanco = new JLabel("Conectando...");

        kpiRow.add(criarCardKpi("⏳ FILA DE ATENDIMENTO (A PARTIR DE 03/11)", lblKpiPendentes, "Clique na linha para abrir a janela de análise", new Color(217, 119, 6)));
        kpiRow.add(criarCardKpi("✅ MOVIMENTAÇÕES REALIZADAS NO BANCO", lblKpiHistorico, "Sincronizadas com TiDB Cloud e Dashboard Web", new Color(0, 152, 74)));
        kpiRow.add(criarCardKpi("☁️ STATUS DO CLUSTER TIDB CLOUD", lblKpiStatusBanco, "Conexão SSL segura · Base DADOS integrada", new Color(0, 114, 188)));

        northWrapper.add(kpiRow, BorderLayout.CENTER);
        rootPanel.add(northWrapper, BorderLayout.NORTH);

        // 2. ABAS PRINCIPAIS DO SISTEMA
        JPanel centerContainer = new JPanel(new BorderLayout());
        centerContainer.setOpaque(false);
        centerContainer.setBorder(new EmptyBorder(0, 16, 0, 16));

        tabbedPane = new JTabbedPane();
        tabbedPane.setFont(new Font("Segoe UI", Font.BOLD, 12));

        tabbedPane.addTab("📥 Fila de Solicitações Pendentes (A partir de 03/11)", criarPainelSolicitacoesPendentes());
        tabbedPane.addTab("📜 Histórico Consolidado de Movimentações", criarPainelHistorico());
        tabbedPane.addTab("✍️ Nova Movimentação Manual Direta", criarPainelMovimentacaoDireta());

        centerContainer.add(tabbedPane, BorderLayout.CENTER);
        rootPanel.add(centerContainer, BorderLayout.CENTER);

        setContentPane(rootPanel);
    }

    private JPanel criarCardKpi(String titulo, JLabel lblValor, String subtitulo, Color corBorda) {
        JPanel card = new JPanel(new BorderLayout(4, 4));
        card.setBackground(Color.WHITE);
        card.setBorder(new CompoundBorder(
                new LineBorder(new Color(203, 213, 225), 1, true),
                new CompoundBorder(
                        BorderFactory.createMatteBorder(0, 5, 0, 0, corBorda),
                        new EmptyBorder(10, 14, 10, 14)
                )
        ));

        JLabel lTit = new JLabel(titulo);
        lTit.setFont(new Font("Segoe UI", Font.BOLD, 10));
        lTit.setForeground(new Color(100, 116, 139));

        lblValor.setFont(new Font("Segoe UI", Font.BOLD, 20));
        lblValor.setForeground(new Color(0, 29, 61));

        JLabel lSub = new JLabel(subtitulo);
        lSub.setFont(new Font("Segoe UI", Font.PLAIN, 11));
        lSub.setForeground(new Color(100, 116, 139));

        card.add(lTit, BorderLayout.NORTH);
        card.add(lblValor, BorderLayout.CENTER);
        card.add(lSub, BorderLayout.SOUTH);
        return card;
    }

    // =========================================================================
    // ABA 1: SOLICITAÇÕES PENDENTES (CLIQUE ABRE JANELA COMPLETA DE ANÁLISE)
    // =========================================================================
    private JPanel criarPainelSolicitacoesPendentes() {
        JPanel panel = new JPanel(new BorderLayout(0, 10));
        panel.setBackground(Color.WHITE);
        panel.setBorder(new EmptyBorder(12, 14, 12, 14));

        // Barra Superior de Busca e Ação
        JPanel topBar = new JPanel(new BorderLayout(12, 0));
        topBar.setOpaque(false);

        JPanel leftSearch = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 0));
        leftSearch.setOpaque(false);
        JLabel lblSearch = new JLabel("🔍 Buscar Cursista / CGM / Componente:");
        lblSearch.setFont(new Font("Segoe UI", Font.BOLD, 12));
        leftSearch.add(lblSearch);

        txtFiltroPendentes = new JTextField(26);
        txtFiltroPendentes.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        txtFiltroPendentes.getDocument().addDocumentListener(new DocumentListener() {
            public void insertUpdate(DocumentEvent e) { filtrarTabelaPendentes(); }
            public void removeUpdate(DocumentEvent e) { filtrarTabelaPendentes(); }
            public void changedUpdate(DocumentEvent e) { filtrarTabelaPendentes(); }
        });
        leftSearch.add(txtFiltroPendentes);

        JLabel lblHint = new JLabel("💡 Clique em qualquer solicitação abaixo para abrir a janela com os dados completos de análise (Deferir / Indeferir).");
        lblHint.setFont(new Font("Segoe UI", Font.BOLD, 11));
        lblHint.setForeground(new Color(0, 114, 188));
        leftSearch.add(lblHint);

        topBar.add(leftSearch, BorderLayout.WEST);

        JButton btnAnalisar = new JButton("⚖️ Abrir Análise Completa da Solicitação Selecionada");
        btnAnalisar.setFont(new Font("Segoe UI", Font.BOLD, 12));
        btnAnalisar.setBackground(new Color(0, 29, 61));
        btnAnalisar.setForeground(Color.WHITE);
        btnAnalisar.setFocusPainted(false);
        btnAnalisar.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
        btnAnalisar.addActionListener(e -> abrirJanelaAnaliseSelecionada());
        topBar.add(btnAnalisar, BorderLayout.EAST);

        panel.add(topBar, BorderLayout.NORTH);

        // Tabela de Solicitações Pendentes
        String[] cols = {
                "Data Solicitação",
                "Nome do Cursista",
                "ID (CGM_LF)",
                "Componente / Ano",
                "NRE",
                "Turma Atual (Coluna H)",
                "Formador(a) Atual",
                "Motivo / Horário Pretendido",
                "Ação"
        };
        modelPendentes = new DefaultTableModel(cols, 0) {
            @Override
            public boolean isCellEditable(int row, int col) { return false; }
        };

        tabelaPendentes = new JTable(modelPendentes);
        estilizarTabela(tabelaPendentes);
        tabelaPendentes.getColumnModel().getColumn(0).setPreferredWidth(125);
        tabelaPendentes.getColumnModel().getColumn(1).setPreferredWidth(200);
        tabelaPendentes.getColumnModel().getColumn(2).setPreferredWidth(105);
        tabelaPendentes.getColumnModel().getColumn(3).setPreferredWidth(135);
        tabelaPendentes.getColumnModel().getColumn(4).setPreferredWidth(105);
        tabelaPendentes.getColumnModel().getColumn(5).setPreferredWidth(210);
        tabelaPendentes.getColumnModel().getColumn(6).setPreferredWidth(170);
        tabelaPendentes.getColumnModel().getColumn(7).setPreferredWidth(240);
        tabelaPendentes.getColumnModel().getColumn(8).setPreferredWidth(120);

        // Clique na linha abre a janela modal completa de análise!
        tabelaPendentes.addMouseListener(new MouseAdapter() {
            @Override
            public void mouseClicked(MouseEvent e) {
                int row = tabelaPendentes.rowAtPoint(e.getPoint());
                if (row >= 0 && (e.getClickCount() == 1 || e.getClickCount() == 2)) {
                    tabelaPendentes.setRowSelectionInterval(row, row);
                    abrirJanelaAnaliseSelecionada();
                }
            }
        });

        JScrollPane scrollPendentes = new JScrollPane(tabelaPendentes);
        scrollPendentes.setBorder(new LineBorder(new Color(226, 232, 240), 1, true));
        panel.add(scrollPendentes, BorderLayout.CENTER);

        return panel;
    }

    private void abrirJanelaAnaliseSelecionada() {
        int row = tabelaPendentes.getSelectedRow();
        if (row < 0 || row >= listaPendentesFiltrada.size()) {
            JOptionPane.showMessageDialog(this, "Clique sobre uma solicitação na tabela para abrir os detalhes de análise.", "Selecione uma Solicitação", JOptionPane.INFORMATION_MESSAGE);
            return;
        }
        Solicitacao sol = listaPendentesFiltrada.get(row);
        DialogAnaliseSolicitacao dialog = new DialogAnaliseSolicitacao(this, sol, sheetsService, () -> {
            carregarSolicitacoesPendentesAsync();
            carregarHistoricoAsync();
        });
        dialog.setVisible(true);
    }

    private void carregarSolicitacoesPendentesAsync() {
        lblKpiStatusBanco.setText("Sincronizando...");
        new Thread(() -> {
            List<Solicitacao> lista = sheetsService.carregarSolicitacoesPendentes();
            SwingUtilities.invokeLater(() -> {
                listaPendentesCompleta.clear();
                listaPendentesCompleta.addAll(lista);
                lblKpiPendentes.setText(lista.size() + " pendentes");
                lblKpiStatusBanco.setText("Online · TiDB Cloud SSL");
                filtrarTabelaPendentes();
            });
        }).start();
    }

    private void filtrarTabelaPendentes() {
        String q = txtFiltroPendentes != null && txtFiltroPendentes.getText() != null
                ? txtFiltroPendentes.getText().trim().toLowerCase() : "";

        listaPendentesFiltrada.clear();
        modelPendentes.setRowCount(0);

        for (Solicitacao s : listaPendentesCompleta) {
            String cgmLf = (v(s.getCgm()) + "_" + v(s.getLinhaFuncional(), "1"));
            String compAno = (v(s.getComponente()) + " · " + v(s.getAnoFormativo())).trim();
            if (!q.isEmpty()) {
                String blob = (v(s.getNomeCursista()) + " " + cgmLf + " " + compAno + " " +
                        v(s.getTurmaAntiga()) + " " + v(s.getMotivo()) + " " + v(s.getNre())).toLowerCase();
                if (!blob.contains(q)) continue;
            }
            listaPendentesFiltrada.add(s);
            modelPendentes.addRow(new Object[]{
                    v(s.getDataSolicitacao()),
                    v(s.getNomeCursista()),
                    cgmLf,
                    compAno,
                    v(s.getNre()),
                    v(s.getTurmaAntiga()),
                    v(s.getFormadorAntigoNome()),
                    v(s.getMotivo()) + " (" + v(s.getJustificativa()) + ")",
                    "🔍 Analisar / Deferir"
            });
        }
    }

    // =========================================================================
    // ABA 2: HISTÓRICO DE MOVIMENTAÇÕES (TIDB CLOUD)
    // =========================================================================
    private JPanel criarPainelHistorico() {
        JPanel panel = new JPanel(new BorderLayout(0, 10));
        panel.setBackground(Color.WHITE);
        panel.setBorder(new EmptyBorder(12, 14, 12, 14));

        JPanel topBar = new JPanel(new FlowLayout(FlowLayout.LEFT, 10, 0));
        topBar.setOpaque(false);

        JLabel lblBusca = new JLabel("🔍 Filtrar Histórico (Nome, CGM, Turma ou Status):");
        lblBusca.setFont(new Font("Segoe UI", Font.BOLD, 12));
        topBar.add(lblBusca);

        txtFiltroHistorico = new JTextField(28);
        txtFiltroHistorico.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        txtFiltroHistorico.getDocument().addDocumentListener(new DocumentListener() {
            public void insertUpdate(DocumentEvent e) { filtrarTabelaHistorico(); }
            public void removeUpdate(DocumentEvent e) { filtrarTabelaHistorico(); }
            public void changedUpdate(DocumentEvent e) { filtrarTabelaHistorico(); }
        });
        topBar.add(txtFiltroHistorico);

        JButton btnAtualizar = new JButton("🔄 Recarregar Histórico");
        btnAtualizar.setFont(new Font("Segoe UI", Font.BOLD, 12));
        btnAtualizar.addActionListener(e -> carregarHistoricoAsync());
        topBar.add(btnAtualizar);

        panel.add(topBar, BorderLayout.NORTH);

        String[] cols = {"ID", "Data/Hora", "Cursista", "CGM", "Tipo de Ação", "Turma Anterior", "Turma Nova", "Status", "Tutor Responsável"};
        modelHistorico = new DefaultTableModel(cols, 0) {
            @Override
            public boolean isCellEditable(int row, int col) { return false; }
        };

        tabelaHistorico = new JTable(modelHistorico);
        estilizarTabela(tabelaHistorico);

        JScrollPane scrollHist = new JScrollPane(tabelaHistorico);
        scrollHist.setBorder(new LineBorder(new Color(226, 232, 240), 1, true));
        panel.add(scrollHist, BorderLayout.CENTER);

        return panel;
    }

    private void carregarHistoricoAsync() {
        new Thread(() -> {
            List<Movimentacao> lista = dbService.listarMovimentacoes();
            SwingUtilities.invokeLater(() -> {
                listaHistoricoCompleta.clear();
                listaHistoricoCompleta.addAll(lista);
                lblKpiHistorico.setText(lista.size() + " registros");
                filtrarTabelaHistorico();
            });
        }).start();
    }

    private void filtrarTabelaHistorico() {
        String q = txtFiltroHistorico != null && txtFiltroHistorico.getText() != null
                ? txtFiltroHistorico.getText().trim().toLowerCase() : "";

        modelHistorico.setRowCount(0);
        for (Movimentacao m : listaHistoricoCompleta) {
            if (!q.isEmpty()) {
                String blob = (v(m.getNomeCursista()) + " " + v(m.getCgm()) + " " +
                        v(m.getTurmaAnterior()) + " " + v(m.getTurmaNova()) + " " + v(m.getStatus())).toLowerCase();
                if (!blob.contains(q)) continue;
            }
            modelHistorico.addRow(new Object[]{
                    m.getId(),
                    m.getTimestamp(),
                    m.getNomeCursista(),
                    m.getCgm(),
                    m.getTipoAcao(),
                    m.getTurmaAnterior(),
                    m.getTurmaNova(),
                    m.getStatus(),
                    m.getTutor()
            });
        }
    }

    // =========================================================================
    // ABA 3: MOVIMENTAÇÃO DIRETA MANUAL
    // =========================================================================
    private JPanel criarPainelMovimentacaoDireta() {
        JPanel panel = new JPanel(new BorderLayout(10, 10));
        panel.setBackground(Color.WHITE);
        panel.setBorder(new EmptyBorder(16, 20, 16, 20));

        JPanel formGrid = new JPanel(new GridLayout(6, 2, 16, 12));
        formGrid.setOpaque(false);

        txtNomeCursista = new JTextField();
        txtCpf = new JTextField();
        txtCgm = new JTextField();
        txtLfManual = new JTextField("1");
        txtEmailCursista = new JTextField();
        txtTurmaAnterior = new JTextField();
        txtTurmaNova = new JTextField();
        txtCodSereManual = new JTextField();
        cbTipoAcao = new JComboBox<>(new String[]{"Troca de Turma", "Troca de Modalidade", "Vínculo na AF", "Remanejamento Compulsório"});
        txtTutor = new JTextField();
        txtEmailTutor = new JTextField();
        txtNre = new JTextField();
        txtMotivo = new JTextField();
        cbStatus = new JComboBox<>(new String[]{"Deferido", "Indeferido", "Resolvido"});

        formGrid.add(criarCampoInput("Nome Completo do Cursista *", txtNomeCursista));
        formGrid.add(criarCampoInput("E-mail Institucional (@escola.pr.gov.br) *", txtEmailCursista));
        formGrid.add(criarCampoInput("CGM *", txtCgm));
        formGrid.add(criarCampoInput("Linha Funcional (LF) *", txtLfManual));
        formGrid.add(criarCampoInput("Turma Anterior (Origem) *", txtTurmaAnterior));
        formGrid.add(criarCampoInput("Turma Nova (Destino — Grava na Coluna H) *", txtTurmaNova));
        formGrid.add(criarCampoInput("Cód. SERE da Turma Nova", txtCodSereManual));
        formGrid.add(criarCampoInput("Tipo de Movimentação", cbTipoAcao));
        formGrid.add(criarCampoInput("NRE do Cursista", txtNre));
        formGrid.add(criarCampoInput("Status da Decisão", cbStatus));
        formGrid.add(criarCampoInput("Motivo da Movimentação *", txtMotivo));
        formGrid.add(criarCampoInput("CPF (Apenas números)", txtCpf));

        panel.add(formGrid, BorderLayout.NORTH);

        JPanel justPanel = new JPanel(new BorderLayout(4, 4));
        justPanel.setOpaque(false);
        JLabel lblJ = new JLabel("Parecer / Justificativa Detalhada:");
        lblJ.setFont(new Font("Segoe UI", Font.BOLD, 12));
        justPanel.add(lblJ, BorderLayout.NORTH);
        txtJustificativa = new JTextArea(4, 40);
        txtJustificativa.setLineWrap(true);
        txtJustificativa.setWrapStyleWord(true);
        justPanel.add(new JScrollPane(txtJustificativa), BorderLayout.CENTER);
        panel.add(justPanel, BorderLayout.CENTER);

        JPanel bottomBar = new JPanel(new FlowLayout(FlowLayout.RIGHT));
        bottomBar.setOpaque(false);
        JButton btnSalvarManual = new JButton("💾 Gravar Movimentação (Coluna H + TiDB) e Abrir E-mails");
        btnSalvarManual.setFont(new Font("Segoe UI", Font.BOLD, 13));
        btnSalvarManual.setBackground(new Color(0, 152, 74));
        btnSalvarManual.setForeground(Color.WHITE);
        btnSalvarManual.setFocusPainted(false);
        btnSalvarManual.addActionListener(e -> salvarMovimentacaoManual());
        bottomBar.add(btnSalvarManual);

        panel.add(bottomBar, BorderLayout.SOUTH);
        return panel;
    }

    private JPanel criarCampoInput(String label, JComponent field) {
        JPanel p = new JPanel(new BorderLayout(4, 4));
        p.setOpaque(false);
        JLabel lbl = new JLabel(label);
        lbl.setFont(new Font("Segoe UI", Font.BOLD, 12));
        lbl.setForeground(new Color(30, 41, 59));
        p.add(lbl, BorderLayout.NORTH);
        p.add(field, BorderLayout.CENTER);
        return p;
    }

    private void salvarMovimentacaoManual() {
        String nome = txtNomeCursista.getText().trim();
        String turmaNova = txtTurmaNova.getText().trim();
        if (nome.isEmpty() || turmaNova.isEmpty()) {
            JOptionPane.showMessageDialog(this, "Preencha pelo menos o Nome do Cursista e a Turma Nova.", "Campos Obrigatórios", JOptionPane.WARNING_MESSAGE);
            return;
        }

        Solicitacao sol = new Solicitacao();
        sol.setId("MOV_MANUAL_" + System.currentTimeMillis());
        sol.setDataSolicitacao(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        sol.setNomeCursista(nome);
        sol.setEmailCursista(txtEmailCursista.getText().trim());
        sol.setCgm(txtCgm.getText().trim());
        sol.setLinhaFuncional(txtLfManual.getText().trim().isEmpty() ? "1" : txtLfManual.getText().trim());
        sol.setCpf(txtCpf.getText().trim());
        sol.setTurmaAntiga(txtTurmaAnterior.getText().trim());
        sol.setTurmaNova(turmaNova);
        sol.setTipoAcao((String) cbTipoAcao.getSelectedItem());
        sol.setMotivo(txtMotivo.getText().trim());
        sol.setJustificativa(txtJustificativa.getText().trim());
        String status = (String) cbStatus.getSelectedItem();
        String codSere = txtCodSereManual.getText().trim();
        String parecer = txtJustificativa.getText().trim();

        setCursor(Cursor.getPredefinedCursor(Cursor.WAIT_CURSOR));
        new Thread(() -> {
            DadosNotificacaoEmail dadosEmail = sheetsService.processarMovimentacao(sol, status, codSere, parecer);
            SwingUtilities.invokeLater(() -> {
                setCursor(Cursor.getDefaultCursor());
                DialogEnvioEmail dialogEmail = new DialogEnvioEmail(this, dadosEmail, sheetsService);
                dialogEmail.setVisible(true);
                carregarHistoricoAsync();
            });
        }).start();
    }

    private void estilizarTabela(JTable table) {
        table.setRowHeight(30);
        table.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        table.getTableHeader().setFont(new Font("Segoe UI", Font.BOLD, 12));
        table.getTableHeader().setBackground(new Color(241, 245, 249));
        table.getTableHeader().setForeground(new Color(0, 29, 61));
        table.setSelectionBackground(new Color(219, 234, 254));
        table.setSelectionForeground(new Color(0, 29, 61));
        table.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        table.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));

        DefaultTableCellRenderer zebra = new DefaultTableCellRenderer() {
            @Override
            public Component getTableCellRendererComponent(JTable tbl, Object val, boolean isSel, boolean hasFoc, int row, int col) {
                Component c = super.getTableCellRendererComponent(tbl, val, isSel, hasFoc, row, col);
                if (!isSel) {
                    c.setBackground(row % 2 == 0 ? Color.WHITE : new Color(248, 250, 252));
                    if (col == 8 && tbl == tabelaPendentes) {
                        c.setForeground(new Color(0, 114, 188));
                        setFont(new Font("Segoe UI", Font.BOLD, 12));
                    } else {
                        c.setForeground(new Color(30, 41, 59));
                    }
                }
                setBorder(new EmptyBorder(0, 8, 0, 8));
                return c;
            }
        };
        for (int i = 0; i < table.getColumnCount(); i++) {
            table.getColumnModel().getColumn(i).setCellRenderer(zebra);
        }
    }

    private String v(String s) {
        return v(s, "—");
    }

    private String v(String s, String padrao) {
        return (s != null && !s.trim().isEmpty()) ? s.trim() : padrao;
    }
}
