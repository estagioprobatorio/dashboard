package br.gov.pr.seed.ep.ui;

import br.gov.pr.seed.ep.model.Movimentacao;
import br.gov.pr.seed.ep.service.DatabaseService;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import javax.swing.border.TitledBorder;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.util.List;

public class MovimentacoesFrame extends JFrame {

    private final DatabaseService dbService = new DatabaseService();

    // Campos do Formulário
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

    // Tabela
    private JTable tabelaMovimentacoes;
    private DefaultTableModel tableModel;

    public MovimentacoesFrame() {
        super("SEED-PR · Gestão de Movimentações (Estágio Probatório)");
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setSize(1100, 750);
        setLocationRelativeTo(null);

        initComponents();
        carregarTabelaAsync();
    }

    private void initComponents() {
        JPanel mainPanel = new JPanel(new BorderLayout(10, 10));
        mainPanel.setBorder(new EmptyBorder(12, 12, 12, 12));
        mainPanel.setBackground(new Color(248, 250, 252));

        // 1. Cabeçalho Superior
        JPanel headerPanel = new JPanel(new BorderLayout());
        headerPanel.setBackground(new Color(0, 29, 61));
        headerPanel.setBorder(new EmptyBorder(14, 18, 14, 18));

        JLabel lblTitle = new JLabel("SEED-PR · ESTADO DO PARANÁ · ESTÁGIO PROBATÓRIO");
        lblTitle.setFont(new Font("Segoe UI", Font.BOLD, 16));
        lblTitle.setForeground(Color.WHITE);

        JLabel lblSub = new JLabel("Sistema Desktop Oficial de Gestão de Movimentações e Trocas de Turmas (TiDB Cloud)");
        lblSub.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        lblSub.setForeground(new Color(191, 219, 254));

        headerPanel.add(lblTitle, BorderLayout.NORTH);
        headerPanel.add(lblSub, BorderLayout.SOUTH);
        mainPanel.add(headerPanel, BorderLayout.NORTH);

        // 2. Formulário de Cadastro (Centro Superior)
        JPanel formContainer = new JPanel(new BorderLayout(8, 8));
        formContainer.setOpaque(false);

        JPanel fieldsPanel = new JPanel(new GridLayout(6, 4, 10, 8));
        fieldsPanel.setBorder(BorderFactory.createTitledBorder(
                BorderFactory.createLineBorder(new Color(203, 213, 225)),
                "Nova Movimentação de Cursista",
                TitledBorder.LEFT, TitledBorder.TOP,
                new Font("Segoe UI", Font.BOLD, 13), new Color(15, 23, 42)
        ));
        fieldsPanel.setBackground(Color.WHITE);

        // Linha 1: Cursista e CPF
        fieldsPanel.add(new JLabel("Nome Completo do Cursista:"));
        txtNomeCursista = new JTextField();
        fieldsPanel.add(txtNomeCursista);

        fieldsPanel.add(new JLabel("CPF (somente números):"));
        txtCpf = new JTextField();
        fieldsPanel.add(txtCpf);

        // Linha 2: CGM e E-mail Institucional
        fieldsPanel.add(new JLabel("CGM:"));
        txtCgm = new JTextField();
        fieldsPanel.add(txtCgm);

        fieldsPanel.add(new JLabel("E-mail @escola.pr.gov.br:"));
        txtEmailCursista = new JTextField();
        fieldsPanel.add(txtEmailCursista);

        // Linha 3: Turmas
        fieldsPanel.add(new JLabel("Turma Anterior:"));
        txtTurmaAnterior = new JTextField();
        fieldsPanel.add(txtTurmaAnterior);

        fieldsPanel.add(new JLabel("Turma Nova (Destino):"));
        txtTurmaNova = new JTextField();
        fieldsPanel.add(txtTurmaNova);

        // Linha 4: Tipo de Ação e Status
        fieldsPanel.add(new JLabel("Tipo de Ação:"));
        cbTipoAcao = new JComboBox<>(new String[]{
                "Troca de Turma",
                "Alteração de Modalidade",
                "Vínculo na AF",
                "Transferência de Polo/NRE",
                "Regularização de Matrícula",
                "Exoneração / Desistência"
        });
        fieldsPanel.add(cbTipoAcao);

        fieldsPanel.add(new JLabel("Situação / Status:"));
        cbStatus = new JComboBox<>(new String[]{"Deferido", "Em Análise", "Concluído", "Indeferido"});
        fieldsPanel.add(cbStatus);

        // Linha 5: Tutor e NRE
        fieldsPanel.add(new JLabel("Tutor Responsável:"));
        txtTutor = new JTextField();
        fieldsPanel.add(txtTutor);

        fieldsPanel.add(new JLabel("NRE de Exercício:"));
        txtNre = new JTextField();
        fieldsPanel.add(txtNre);

        // Linha 6: Motivo e E-mail Tutor
        fieldsPanel.add(new JLabel("Motivo Resumido:"));
        txtMotivo = new JTextField();
        fieldsPanel.add(txtMotivo);

        fieldsPanel.add(new JLabel("E-mail do Tutor:"));
        txtEmailTutor = new JTextField();
        fieldsPanel.add(txtEmailTutor);

        formContainer.add(fieldsPanel, BorderLayout.CENTER);

        // Justificativa e Botões
        JPanel bottomFormPanel = new JPanel(new BorderLayout(8, 8));
        bottomFormPanel.setOpaque(false);

        JPanel justPanel = new JPanel(new BorderLayout(4, 4));
        justPanel.setOpaque(false);
        justPanel.add(new JLabel("Justificativa / Observações Administrativas:"), BorderLayout.NORTH);
        txtJustificativa = new JTextArea(2, 20);
        txtJustificativa.setLineWrap(true);
        justPanel.add(new JScrollPane(txtJustificativa), BorderLayout.CENTER);
        bottomFormPanel.add(justPanel, BorderLayout.CENTER);

        // Botões de Ação
        JPanel btnPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT, 10, 8));
        btnPanel.setOpaque(false);

        JButton btnLimpar = new JButton("Limpar");
        btnLimpar.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        btnLimpar.addActionListener(e -> limparCampos());
        btnPanel.add(btnLimpar);

        JButton btnGravar = new JButton("✓ Gravar no TiDB Cloud");
        btnGravar.setFont(new Font("Segoe UI", Font.BOLD, 13));
        btnGravar.setBackground(new Color(0, 152, 74));
        btnGravar.setForeground(Color.WHITE);
        btnGravar.setFocusPainted(false);
        btnGravar.addActionListener(e -> executarGravacao());
        btnPanel.add(btnGravar);

        bottomFormPanel.add(btnPanel, BorderLayout.SOUTH);
        formContainer.add(bottomFormPanel, BorderLayout.SOUTH);

        // 3. Tabela Inferior de Consulta (Movimentações Realizadas)
        JPanel tableContainer = new JPanel(new BorderLayout(6, 6));
        tableContainer.setOpaque(false);
        tableContainer.setBorder(BorderFactory.createTitledBorder(
                BorderFactory.createLineBorder(new Color(203, 213, 225)),
                "Movimentações Realizadas (Registros no Banco TiDB Cloud)",
                TitledBorder.LEFT, TitledBorder.TOP,
                new Font("Segoe UI", Font.BOLD, 13), new Color(15, 23, 42)
        ));

        String[] cols = {"ID", "Data/Hora", "Cursista", "Tipo", "Turma Anterior", "Turma Nova", "Tutor", "Status", "Motivo"};
        tableModel = new DefaultTableModel(cols, 0) {
            @Override
            public boolean isCellEditable(int row, int col) { return false; }
        };

        tabelaMovimentacoes = new JTable(tableModel);
        tabelaMovimentacoes.setRowHeight(24);
        tabelaMovimentacoes.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        tabelaMovimentacoes.getTableHeader().setFont(new Font("Segoe UI", Font.BOLD, 12));

        JScrollPane scrollTable = new JScrollPane(tabelaMovimentacoes);
        scrollTable.setPreferredSize(new Dimension(1000, 220));
        tableContainer.add(scrollTable, BorderLayout.CENTER);

        JPanel tableFooter = new JPanel(new FlowLayout(FlowLayout.LEFT));
        tableFooter.setOpaque(false);
        JButton btnRecarregar = new JButton("🔄 Atualizar Lista");
        btnRecarregar.addActionListener(e -> carregarTabelaAsync());
        tableFooter.add(btnRecarregar);
        tableContainer.add(tableFooter, BorderLayout.SOUTH);

        // Divisão Vertical: Formulário no Topo, Tabela Embaixo
        JSplitPane splitPane = new JSplitPane(JSplitPane.VERTICAL_SPLIT, formContainer, tableContainer);
        splitPane.setResizeWeight(0.52);
        splitPane.setDividerSize(6);
        splitPane.setOpaque(false);

        mainPanel.add(splitPane, BorderLayout.CENTER);
        setContentPane(mainPanel);
    }

    private void executarGravacao() {
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

        // Executa em thread para não travar a interface
        new Thread(() -> {
            boolean ok = dbService.gravarMovimentacao(m);
            SwingUtilities.invokeLater(() -> {
                if (ok) {
                    JOptionPane.showMessageDialog(this,
                            "Movimentação do cursista registrada com sucesso no TiDB Cloud!\n" +
                                    "O dashboard web refletirá a alteração automaticamente.",
                            "Sucesso", JOptionPane.INFORMATION_MESSAGE);
                    limparCampos();
                    carregarTabelaAsync();
                } else {
                    JOptionPane.showMessageDialog(this,
                            "Não foi possível gravar a movimentação. Verifique a conexão com o TiDB Cloud.",
                            "Erro na Gravação", JOptionPane.ERROR_MESSAGE);
                }
            });
        }).start();
    }

    private void carregarTabelaAsync() {
        new Thread(() -> {
            List<Movimentacao> lista = dbService.listarMovimentacoes();
            SwingUtilities.invokeLater(() -> {
                tableModel.setRowCount(0);
                for (Movimentacao m : lista) {
                    tableModel.addRow(new Object[]{
                            m.getId(),
                            m.getTimestamp(),
                            m.getNomeCursista() != null ? m.getNomeCursista() : m.getEmailCursista(),
                            m.getTipoAcao(),
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
