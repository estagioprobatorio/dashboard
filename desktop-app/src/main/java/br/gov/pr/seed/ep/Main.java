package br.gov.pr.seed.ep;

import br.gov.pr.seed.ep.ui.MovimentacoesFrame;
import com.formdev.flatlaf.FlatLightLaf;

import javax.swing.*;
import java.awt.*;

public class Main {
    public static void main(String[] args) {
        // Inicializa o tema moderno FlatLaf
        try {
            FlatLightLaf.setup();

            // Configurações visuais modernas do FlatLaf
            UIManager.put("Button.arc", 8);
            UIManager.put("Component.arc", 8);
            UIManager.put("ProgressBar.arc", 8);
            UIManager.put("TextComponent.arc", 8);
            UIManager.put("Table.rowHeight", 26);
            UIManager.put("Table.showHorizontalLines", true);
            UIManager.put("Table.showVerticalLines", false);
            UIManager.put("Table.intercellSpacing", new Dimension(0, 1));
            UIManager.put("TabbedPane.showTabSeparators", true);
            UIManager.put("TabbedPane.tabHeight", 34);
        } catch (Exception e) {
            try {
                UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
            } catch (Exception ignored) {}
        }

        SwingUtilities.invokeLater(() -> {
            MovimentacoesFrame frame = new MovimentacoesFrame();
            frame.setVisible(true);
        });
    }
}
