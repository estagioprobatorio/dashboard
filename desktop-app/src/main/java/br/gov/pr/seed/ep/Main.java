package br.gov.pr.seed.ep;

import br.gov.pr.seed.ep.ui.MovimentacoesFrame;
import com.formdev.flatlaf.FlatLightLaf;

import javax.swing.*;
import java.awt.*;

public class Main {
    public static void main(String[] args) {
        System.setProperty("awt.useSystemAAFontSettings", "on");
        System.setProperty("swing.aatext", "true");
        System.setProperty("flatlaf.useWindowDecorations", "true");
        System.setProperty("flatlaf.menuBarEmbedded", "true");

        try {
            FlatLightLaf.setup();

            UIManager.put("defaultFont", new Font("Segoe UI", Font.PLAIN, 12));
            UIManager.put("Button.arc", 8);
            UIManager.put("Component.arc", 8);
            UIManager.put("ProgressBar.arc", 8);
            UIManager.put("TextComponent.arc", 8);
            UIManager.put("ScrollBar.showButtons", false);
            UIManager.put("ScrollBar.width", 10);
            UIManager.put("Table.rowHeight", 30);
            UIManager.put("Table.showHorizontalLines", true);
            UIManager.put("Table.showVerticalLines", false);
            UIManager.put("Table.intercellSpacing", new Dimension(0, 1));
            UIManager.put("TabbedPane.showTabSeparators", true);
            UIManager.put("TabbedPane.tabHeight", 36);
            UIManager.put("TabbedPane.selectedBackground", Color.WHITE);
            UIManager.put("TitlePane.unifiedBackground", false);
            UIManager.put("TitlePane.background", new Color(0, 29, 61));
            UIManager.put("TitlePane.foreground", Color.WHITE);
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
