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
  const rows = data.map((row, idx) => {
    return columns.map(col => {
      let val = col.accessor(row, idx);
      if (val === null || val === undefined || (typeof val === 'number' && isNaN(val))) val = '';
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
      let val = col.accessor(row, idx);
      if (val === null || val === undefined || val === '' || (typeof val === 'number' && isNaN(val))) val = '-';
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
          margin: 15mm 15mm 15mm 15mm;
        }
        * {
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          margin: 0;
          padding: 15px 25px;
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
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 0; }
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

// 3. Impressão de Fichas de Turmas com Lista Completa de Cursistas Ensalados
export function printEnsalamentoTurmasPDF({ title, subtitle, turmas, filterSummary = '' }) {
  if (!turmas || !turmas.length) {
    alert("Não há turmas para imprimir.");
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

  const totalCursistas = turmas.reduce((acc, t) => acc + (t.cursistas ? t.cursistas.length : 0), 0);

  const turmasHtml = turmas.map((tItem, tIdx) => {
    const cursistasRows = (tItem.cursistas || []).map((c, cIdx) => `
      <tr style="background-color: ${cIdx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="text-align: center; width: 35px; color: #64748b; font-weight: 600;">${cIdx + 1}</td>
        <td style="font-weight: 700; color: #0f172a;">${c.nome || '-'}</td>
        <td style="color: #0284c7;">${c.email || '-'}</td>
        <td style="color: #475569;">${c.cgm || '-'}</td>
        <td style="color: #475569;">${c.municipios || '-'}</td>
      </tr>
    `).join('');

    return `
      <div class="turma-card ${tIdx > 0 ? 'turma-card-next' : ''}">
        <div class="turma-header">
          <div class="turma-title-area">
            <span class="turma-badge">${tItem.turno || 'GERAL'} • ${tItem.anoFormativo || 'ESTÁGIO PROBATÓRIO'}</span>
            <h2 class="turma-name">🏫 ${tItem.turma || tItem.turmas}</h2>
          </div>
          <div class="turma-count-badge">
            👥 <b>${(tItem.cursistas || []).length}</b> Cursistas Ensalados
          </div>
        </div>

        <div class="turma-info-grid">
          <div class="info-box">
            <div class="info-label">🎓 Formador Responsável</div>
            <div class="info-val">${tItem.formador || 'Sem Formador'}</div>
            ${tItem.emailFormador ? `<div class="info-sub">✉️ ${tItem.emailFormador}</div>` : ''}
          </div>
          <div class="info-box">
            <div class="info-label">👤 Tutor Responsável</div>
            <div class="info-val">${tItem.tutor || 'Não Atribuído'}</div>
            ${tItem.emailTutor ? `<div class="info-sub">✉️ ${tItem.emailTutor}</div>` : ''}
            ${tItem.nreTutor ? `<div class="info-sub">📍 NRE: ${tItem.nreTutor}</div>` : ''}
          </div>
          <div class="info-box">
            <div class="info-label">📅 Componente & Horário</div>
            <div class="info-val">${tItem.componente || '-'}</div>
            <div class="info-sub">🗓️ ${tItem.diaSemana || 'Dia não informado'} ${tItem.horarioInicial ? `(${tItem.horarioInicial} às ${tItem.horarioFim})` : ''}</div>
          </div>
        </div>

        <h3 class="cursistas-table-title">👥 Relação de Cursistas Ensalados (${(tItem.cursistas || []).length})</h3>
        ${(tItem.cursistas && tItem.cursistas.length > 0) ? `
          <table class="cursistas-table">
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">#</th>
                <th>Nome do Cursista</th>
                <th>E-mail</th>
                <th>CGM</th>
                <th>Município</th>
              </tr>
            </thead>
            <tbody>
              ${cursistasRows}
            </tbody>
          </table>
        ` : `<div class="empty-cursistas">Nenhum cursista enturmado nesta turma.</div>`}
      </div>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>${title}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 15mm 15mm 15mm 15mm;
        }
        * {
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          margin: 0;
          padding: 15px 25px;
          color: #1e293b;
          font-size: 11px;
          background: #ffffff;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 3px solid #002d5c;
          padding-bottom: 12px;
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
          font-size: 17px;
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
          line-height: 1.4;
        }
        .filter-summary {
          background-color: #f1f5f9;
          border-left: 4px solid #002d5c;
          padding: 8px 12px;
          font-size: 10.5px;
          margin-bottom: 20px;
          border-radius: 4px;
        }
        .turma-card {
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 14px 16px;
          margin-bottom: 22px;
          background-color: #ffffff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          page-break-inside: avoid;
        }
        .turma-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 10px;
          margin-bottom: 12px;
        }
        .turma-badge {
          font-size: 9px;
          font-weight: 700;
          background-color: #e0f2fe;
          color: #0369a1;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
          display: inline-block;
          margin-bottom: 4px;
        }
        .turma-name {
          margin: 0;
          font-size: 14px;
          color: #002d5c;
          font-weight: 800;
        }
        .turma-count-badge {
          background-color: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
        }
        .turma-info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 14px;
        }
        .info-box {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 8px 10px;
        }
        .info-label {
          font-size: 9.5px;
          font-weight: 700;
          color: #002d5c;
          text-transform: uppercase;
          margin-bottom: 3px;
        }
        .info-val {
          font-size: 11px;
          font-weight: 700;
          color: #1e293b;
        }
        .info-sub {
          font-size: 9.5px;
          color: #64748b;
          margin-top: 2px;
          word-break: break-all;
        }
        .cursistas-table-title {
          font-size: 11px;
          color: #002d5c;
          font-weight: 700;
          margin: 0 0 6px 0;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .cursistas-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
        }
        .cursistas-table th {
          background-color: #002d5c;
          color: #ffffff;
          font-weight: 700;
          padding: 6px 8px;
          border: 1px solid #002d5c;
          text-align: left;
        }
        .cursistas-table td {
          padding: 5px 8px;
          border: 1px solid #cbd5e1;
        }
        .empty-cursistas {
          font-style: italic;
          color: #94a3b8;
          padding: 8px;
          font-size: 10px;
        }
        .footer {
          margin-top: 25px;
          border-top: 1px solid #cbd5e1;
          padding-top: 10px;
          display: flex;
          justify-content: space-between;
          font-size: 9.5px;
          color: #94a3b8;
        }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 0; }
          .turma-card { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="brand">
          <div class="logo-badge">SEED · PR</div>
          <div class="header-title">
            <h1>${title}</h1>
            <p>${subtitle || 'Fichas Oficiais de Ensalamento e Turmas'}</p>
          </div>
        </div>
        <div class="meta-info">
          <div><b>Emissão:</b> ${currentDateStr}</div>
          <div><b>Total de Turmas:</b> ${turmas.length}</div>
          <div><b>Total de Cursistas:</b> ${totalCursistas}</div>
        </div>
      </div>

      ${filterSummary ? `<div class="filter-summary"><b>Filtros Aplicados:</b> ${filterSummary}</div>` : ''}

      ${turmasHtml}

      <div class="footer">
        <div>Secretaria de Estado da Educação do Paraná - SEED/PR</div>
        <div>Relatório Oficial de Ensalamento - Fichas das Turmas e Cursistas</div>
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
