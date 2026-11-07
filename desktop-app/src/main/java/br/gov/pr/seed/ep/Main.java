package br.gov.pr.seed.ep;

import br.gov.pr.seed.ep.ui.MovimentacoesFrame;

import javax.swing.*;

public class Main {
    public static void main(String[] args) {
        // Tenta aplicar o tema moderno FlatLaf ou o System Look and Feel
        try {
            UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
        } catch (Exception ignored) {}

        SwingUtilities.invokeLater(() -> {
            MovimentacoesFrame frame = new MovimentacoesFrame();
            frame.setVisible(true);
        });
    }
}
