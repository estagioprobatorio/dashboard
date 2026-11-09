// =========================================================================================
// GERADOR DE COMPROVANTE OFICIAL PARA IMPRESSÃO / PDF - INTENÇÃO DE VAGA 2027 (SEED-PR)
// Imprime comprovante individual ou lote de comprovantes com Nome, Matrícula, Turno e Carimbo
// =========================================================================================

function escapeHtml(val) {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatarCarimboDataHora(valorData) {
  if (!valorData) {
    return new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
  const str = String(valorData).trim();
  // Se já estiver formatado como dd/mm/aaaa hh:mm
  if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) {
    return str;
  }
  const dt = new Date(str);
  if (!isNaN(dt.getTime())) {
    return dt.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
  return str;
}

function normalizarDadosComprovante(raw) {
  const cgm = String(raw.cgm_cursista || raw.cgm || '').trim();
  const lf = String(raw.linha_funcional || raw.lf || '1').replace(/\D/g, '').trim() || '1';
  const cgmLf = String(raw.cgm_lf || (cgm ? `${cgm}_LF${lf}` : `PADRAO_${lf}`)).trim();
  const matriculaFormatada = cgm ? `CGM ${cgm} · Padrão / LF ${lf} (${cgmLf})` : `Padrão / LF ${lf} (${cgmLf})`;

  const nome = raw.nome_cursista || raw.nome || 'Docente Cursista';
  const email = String(raw.email_cursista || raw.email || raw['e-mail'] || '—').trim().toLowerCase();
  const nre = raw.nre || raw.nre_exe || '—';
  const componente = raw.componente || raw.componente_conc || '—';
  const chamamento = raw.chamamento || raw.chamamentoTexto || '—';
  const etapa2027 = raw.ano_formativo_pretendido || raw.ano_formativo_2027 || raw.etapa2027 || '2027/1';
  const diaSemana = raw.dia_semana_formativo || raw.dia_da_semana || 'Conforme oferta do componente';
  const turno = raw.turnoPretendido || raw.turno_pretendido || raw.opcao_turno || 'Não informado';
  const horario = raw.horarioPretendido || raw.horario_pretendido || raw.opcao_modalidade || 'Conforme turno selecionado';

  const necessitaEspecial =
    raw.necessitaAtendimentoEspecializado === 'Sim' ||
    raw.necessitaAtendimentoEspecializado === true ||
    raw.necessita_atendimento_especializado === 'SIM';
  const descEspecial = raw.descricaoAtendimentoEspecializado || raw.descricao_atendimento_especializado || '';

  const carimbo = formatarCarimboDataHora(
    raw.data_aceite_termo || raw.created_at || raw.timestamp || raw.data_submissao
  );

  const protocolo = `EP2027-${cgmLf.replace(/[^A-Za-z0-9]/g, '')}-${carimbo.replace(/\D/g, '').slice(0, 12) || Date.now().toString().slice(-6)}`;

  return {
    protocolo,
    nome,
    email,
    cgm,
    lf,
    cgmLf,
    matriculaFormatada,
    nre,
    componente,
    chamamento,
    etapa2027,
    diaSemana,
    turno,
    horario,
    necessitaEspecial,
    descEspecial,
    carimbo
  };
}

function renderCardComprovanteHtml(item, idx, total) {
  const d = normalizarDadosComprovante(item);
  const quebraPagina = idx < total - 1 ? 'page-break-after: always;' : '';

  return `
    <div class="receipt-page" style="${quebraPagina}">
      <div class="receipt-container">
        <!-- CABEÇALHO INSTITUCIONAL -->
        <div class="receipt-header">
          <div class="header-left">
            <div class="org-badge">GOVERNO DO ESTADO DO PARANÁ · SEED-PR</div>
            <h1 class="receipt-title">COMPROVANTE DE INTENÇÃO DE MATRÍCULA · 2027/1</h1>
            <div class="receipt-subtitle">Programa de Formação no Estágio Probatório Docente</div>
          </div>
          <div class="header-right">
            <div class="status-pill">✓ INTENÇÃO CONFIRMADA</div>
            <div class="protocol-text">Protocolo: <strong>${escapeHtml(d.protocolo)}</strong></div>
          </div>
        </div>

        <!-- DESTAQUES PRINCIPAIS EXIGIDOS: NOME, MATRÍCULA, TURNO E CARIMBO DE DATA/HORA -->
        <div class="highlight-banner">
          <div class="highlight-item highlight-wide">
            <span class="hl-label">NOME DO(A) CURSISTA</span>
            <span class="hl-value hl-name">${escapeHtml(d.nome)}</span>
            <span class="hl-sub">${escapeHtml(d.email)}</span>
          </div>
          <div class="highlight-item">
            <span class="hl-label">MATRÍCULA / VÍNCULO</span>
            <span class="hl-value hl-matricula">${escapeHtml(d.matriculaFormatada)}</span>
          </div>
          <div class="highlight-item">
            <span class="hl-label">TURNO E HORÁRIO ESCOLHIDOS</span>
            <span class="hl-value hl-turno">${escapeHtml(d.turno)}</span>
            <span class="hl-sub-strong">${escapeHtml(d.horario)}</span>
          </div>
          <div class="highlight-item">
            <span class="hl-label">CARIMBO DE DATA E HORA</span>
            <span class="hl-value hl-timestamp">🕒 ${escapeHtml(d.carimbo)}</span>
            <span class="hl-sub">Horário Oficial de Brasília</span>
          </div>
        </div>

        <!-- DETALHAMENTO COMPLETO DO REGISTRO -->
        <div class="section-box">
          <div class="section-title">DADOS ACADÊMICOS E FUNCIONAIS DA MATRÍCULA</div>
          <table class="info-table">
            <tbody>
              <tr>
                <th>Docente Cursista:</th>
                <td><strong>${escapeHtml(d.nome)}</strong></td>
                <th>Código da Matrícula (CGM_LF):</th>
                <td><strong>${escapeHtml(d.cgmLf)}</strong> (Linha Funcional ${escapeHtml(d.lf)})</td>
              </tr>
              <tr>
                <th>E-mail Institucional:</th>
                <td>${escapeHtml(d.email)}</td>
                <th>Núcleo Regional (NRE):</th>
                <td><strong>${escapeHtml(d.nre)}</strong></td>
              </tr>
              <tr>
                <th>Componente Curricular:</th>
                <td><strong>${escapeHtml(d.componente)}</strong></td>
                <th>Chamamento de Ingresso:</th>
                <td>${escapeHtml(d.chamamento)}</td>
              </tr>
              <tr>
                <th>Etapa Formativa 2027/1:</th>
                <td><strong>${escapeHtml(d.etapa2027)}</strong></td>
                <th>Dia Formativo Semanal:</th>
                <td>${escapeHtml(d.diaSemana)}</td>
              </tr>
              <tr>
                <th>Turno Pretendido 2027:</th>
                <td><strong style="color:#006b34;">${escapeHtml(d.turno)}</strong></td>
                <th>Horário Pretendido 2027:</th>
                <td><strong style="color:#004b87;">${escapeHtml(d.horario)}</strong></td>
              </tr>
              <tr>
                <th>Atendimento Especializado:</th>
                <td colspan="3">
                  ${d.necessitaEspecial
                    ? `<strong>SIM</strong> — ${escapeHtml(d.descEspecial || 'Solicitado pelo cursista')}`
                    : 'Não solicitado'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- DECLARAÇÃO DE CIÊNCIA E AUTENTICAÇÃO -->
        <div class="declaration-box">
          <strong>✓ Declaração de Ciência e Concordância Assinalada pelo(a) Cursista:</strong>
          <p>
            Declaro estar ciente de que o preenchimento deste formulário constitui uma pré-inscrição estritamente necessária para o
            planejamento e a organização prévia das turmas de 2027. Concordo que a priorização do turno e do horário solicitados estará
            condicionada à confirmação do meu suprimento de aulas no mesmo turno no ano letivo de 2027, conforme o processo oficial de
            distribuição e atribuição de vagas da SEED-PR.
          </p>
        </div>

        <!-- RODAPÉ COM CARIMBO E CÓPIA INSTITUCIONAL -->
        <div class="receipt-footer">
          <div>
            <strong>Carimbo de Registro Oficial:</strong> ${escapeHtml(d.carimbo)} ·
            <strong>Matrícula:</strong> ${escapeHtml(d.cgmLf)} ·
            <strong>Turno:</strong> ${escapeHtml(d.turno)}
          </div>
          <div style="margin-top: 3px;">
            Cópia de confirmação encaminhada para <strong>${escapeHtml(d.email)}</strong>,
            <strong>jorge.dotti@escola.pr.gov.br</strong> e <strong>estagioprobatorio@escola.pr.gov.br</strong>.
          </div>
        </div>
      </div>
    </div>
  `;
}

export function imprimirComprovanteIntencao2027(registroOuLista) {
  const lista = Array.isArray(registroOuLista) ? registroOuLista : [registroOuLista];
  if (!lista.length || !lista[0]) return;

  const cardsHtml = lista.map((item, idx) => renderCardComprovanteHtml(item, idx, lista.length)).join('\n');
  const primeiro = normalizarDadosComprovante(lista[0]);
  const tituloDoc = lista.length === 1
    ? `Comprovante Intenção 2027 - ${primeiro.nome} (${primeiro.cgmLf})`
    : `Comprovantes Intenção 2027 - SEED-PR (${lista.length} registros)`;

  const htmlCompleto = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(tituloDoc)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #f1f5f9;
    }
    .no-print-toolbar {
      background: #001d3d;
      color: #ffffff;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    }
    .no-print-toolbar button {
      background: #00984a;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      margin-left: 8px;
    }
    .no-print-toolbar button.btn-close {
      background: #475569;
    }
    .receipt-page {
      max-width: 190mm;
      margin: 16px auto;
      background: #ffffff;
      padding: 0;
    }
    .receipt-container {
      border: 2px solid #002d5c;
      border-radius: 10px;
      overflow: hidden;
      background: #ffffff;
    }
    .receipt-header {
      background: linear-gradient(135deg, #001d3d 0%, #003566 100%);
      color: #ffffff;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      border-bottom: 3px solid #00984a;
    }
    .org-badge {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: #86efac;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .receipt-title {
      margin: 0;
      font-size: 16px;
      font-weight: 800;
      letter-spacing: -0.01em;
    }
    .receipt-subtitle {
      font-size: 11px;
      color: #cbd5e1;
      margin-top: 2px;
    }
    .header-right {
      text-align: right;
      flex-shrink: 0;
    }
    .status-pill {
      display: inline-block;
      background: #00984a;
      color: #ffffff;
      font-size: 11px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 999px;
      margin-bottom: 4px;
    }
    .protocol-text {
      font-size: 10px;
      color: #e2e8f0;
    }
    .highlight-banner {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      padding: 14px 18px;
      background: #f8fafc;
      border-bottom: 1px solid #cbd5e1;
    }
    .highlight-item {
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      border-left: 5px solid #002d5c;
      border-radius: 8px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .highlight-wide {
      grid-column: 1 / -1;
      border-left-color: #00984a;
      background: #f0fdf4;
    }
    .hl-label {
      font-size: 10px;
      font-weight: 800;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .hl-value {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
    }
    .hl-name {
      font-size: 16px;
      color: #001d3d;
    }
    .hl-matricula {
      color: #002d5c;
      font-family: Consolas, Monaco, monospace;
    }
    .hl-turno {
      color: #007a33;
      font-size: 15px;
    }
    .hl-timestamp {
      color: #1e3a8a;
    }
    .hl-sub {
      font-size: 11px;
      color: #64748b;
    }
    .hl-sub-strong {
      font-size: 11.5px;
      font-weight: 700;
      color: #0369a1;
    }
    .section-box {
      padding: 14px 18px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 800;
      color: #002d5c;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .info-table th,
    .info-table td {
      border: 1px solid #cbd5e1;
      padding: 7px 10px;
      text-align: left;
      vertical-align: top;
    }
    .info-table th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      width: 22%;
    }
    .info-table td {
      width: 28%;
      color: #0f172a;
    }
    .declaration-box {
      margin: 0 18px 14px 18px;
      padding: 10px 14px;
      background: #f0fdf4;
      border: 1px solid #86efac;
      border-radius: 8px;
      font-size: 11px;
      color: #166534;
      line-height: 1.45;
    }
    .declaration-box p {
      margin: 4px 0 0 0;
    }
    .receipt-footer {
      background: #f8fafc;
      border-top: 1px solid #cbd5e1;
      padding: 10px 18px;
      font-size: 10.5px;
      color: #475569;
      line-height: 1.4;
    }
    @media print {
      body {
        background: #ffffff;
      }
      .no-print-toolbar {
        display: none !important;
      }
      .receipt-page {
        max-width: 100%;
        margin: 0;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-toolbar">
    <div>
      <strong>🖨️ Visualização de Impressão Oficial · SEED-PR</strong>
      <span style="font-size:12px; margin-left:10px; opacity:0.85;">(${lista.length} comprovante${lista.length > 1 ? 's' : ''})</span>
    </div>
    <div>
      <button onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
      <button class="btn-close" onclick="window.close()">✕ Fechar</button>
    </div>
  </div>
  ${cardsHtml}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 250);
    };
  </script>
</body>
</html>`;

  const printWin = window.open('', '_blank', 'width=920,height=820,scrollbars=yes,resizable=yes');
  if (printWin) {
    printWin.document.open();
    printWin.document.write(htmlCompleto);
    printWin.document.close();
  } else {
    // Fallback via iframe oculto caso o bloqueador de pop-ups impeça nova janela
    let iframe = document.getElementById('iframe-print-comprovante-2027');
    if (iframe) iframe.remove();
    iframe = document.createElement('iframe');
    iframe.id = 'iframe-print-comprovante-2027';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlCompleto);
    doc.close();
  }
}
