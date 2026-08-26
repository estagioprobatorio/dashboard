/**
 * Utilitários para Exportação de Dados em CSV e Impressão/PDF Estilizada
 * SEED-PR - Estágio Probatório
 */

// 1. Exportação em formato CSV com UTF-8 BOM
export function exportToCSV(filename, columns, data) {
  if (!data || !data.length) {
    alert("Não há dados para exportar.");
    return;
  }

  // Cabeçalhos
  const headers = columns.map(c => c.label).join(';');
  
  // Linhas
  const rows = data.map(row => {
    return columns.map(col => {
      let val = col.accessor(row);
      if (val === null || val === undefined) val = '';
      val = String(val).replace(/"/g, '""');
      if (val.includes(';') || val.includes('\n') || val.includes('"')) {
        return `"${val}"`;
      }
      return val;
    }).join(';');
  });

  const csvContent = '\uFEFF' + [headers, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 2. Impressão em PDF / Layout Oficial SEED-PR
export function printReportPDF({ title, subtitle, columns, data, filterSummary = '' }) {
  if (!data || !data.length) {
    alert("Não há dados para imprimir/gerar PDF.");
    return;
  }

  const printWindow = window.open('', '_blank', 'width=1000,height=800');
  if (!printWindow) {
    alert("Por favor, permita pop-ups para visualizar a impressão em PDF.");
    return;
  }

  const currentDateStr = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const tableHeadersHtml = columns.map(c => `<th style="text-align: ${c.align || 'left'};">${c.label}</th>`).join('');
  
  const tableRowsHtml = data.map((row, idx) => {
    const cells = columns.map(col => {
      let val = col.accessor(row);
      if (val === null || val === undefined || val === '') val = '-';
      return `<td style="text-align: ${col.align || 'left'};">${val}</td>`;
    }).join('');
    return `<tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">${cells}</tr>`;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>${title}</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 12mm;
        }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          margin: 0;
          padding: 0;
          color: #1e293b;
          font-size: 11px;
          background: #fff;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 3px solid #002d5c;
          padding-bottom: 10px;
          margin-bottom: 15px;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo-badge {
          background-color: #002d5c;
          color: #fff;
          font-weight: 800;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 14px;
          letter-spacing: 1px;
        }
        .header-title h1 {
          margin: 0;
          font-size: 18px;
          color: #002d5c;
          font-weight: 800;
        }
        .header-title p {
          margin: 2px 0 0 0;
          font-size: 11px;
          color: #64748b;
        }
        .meta-info {
          text-align: right;
          font-size: 10px;
          color: #64748b;
        }
        .filter-summary {
          background-color: #f1f5f9;
          border-left: 4px solid #0b3c5d;
          padding: 6px 10px;
          font-size: 10.5px;
          margin-bottom: 12px;
          border-radius: 4px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 5px;
          page-break-inside: auto;
        }
        tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
        th {
          background-color: #002d5c;
          color: #ffffff;
          font-weight: 700;
          padding: 8px 10px;
          border: 1px solid #002d5c;
          font-size: 10.5px;
          text-transform: uppercase;
        }
        td {
          padding: 7px 10px;
          border: 1px solid #cbd5e1;
          font-size: 10.5px;
        }
        .footer {
          margin-top: 20px;
          border-top: 1px solid #cbd5e1;
          padding-top: 8px;
          display: flex;
          justify-content: space-between;
          font-size: 9.5px;
          color: #94a3b8;
        }
        @media print {
          .no-print { display: none; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="brand">
          <div class="logo-badge">SEED · PR</div>
          <div class="header-title">
            <h1>${title}</h1>
            <p>${subtitle || 'Sistema de Gestão do Estágio Probatório'}</p>
          </div>
        </div>
        <div class="meta-info">
          <div><b>Emissão:</b> ${currentDateStr}</div>
          <div><b>Total de Registros:</b> ${data.length}</div>
        </div>
      </div>

      ${filterSummary ? `<div class="filter-summary"><b>Filtros Aplicados:</b> ${filterSummary}</div>` : ''}

      <table>
        <thead>
          <tr>${tableHeadersHtml}</tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>

      <div class="footer">
        <div>Secretaria de Estado da Educação do Paraná - SEED/PR</div>
        <div>Relatório Oficial de Acompanhamento do Estágio Probatório</div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
