/**
 * Base de Dados e Helpers do Portal Tutor Insights integrado.
 * Acompanhamento que o Professor Tutor realiza dos seus Formadores e Técnicos.
 * 
 * Conforme dados reais de docs/Respostas ao formulário 1.csv
 * Origem Google Sheets:
 * - SPREADSHEET_ID: 1V54Gl-KVGaHjLBH07hQZxq6GU88kfn0Xurh5P2LuSz8
 * - GID: 1228233119
 * - SHEET_NAME: Respostas ao formulário 1 (A2:AT - 46 colunas)
 */

import tutoresFallback from '../tutores_fallback.json';

export const SPREADSHEET_ID = "1V54Gl-KVGaHjLBH07hQZxq6GU88kfn0Xurh5P2LuSz8";
export const SHEET_NAME = "Respostas ao formulário 1";
export const SHEET_GID = "1228233119";

// Mapa de e-mail -> Nome oficial do Tutor para fallback de preenchimento
const officialTutorEmailMap = new Map();
const officialTutorNreMap = new Map();

(tutoresFallback || []).forEach(t => {
  const name = (t.tutor_responsavel || t.nome || '').trim();
  const nre = (t.nre_tutor || t.nre || '').trim();
  if (t.email_educ) {
    const e = t.email_educ.trim().toLowerCase();
    officialTutorEmailMap.set(e, name);
    if (nre) officialTutorNreMap.set(e, nre);
  }
  if (t.email_adm) {
    const e = t.email_adm.trim().toLowerCase();
    officialTutorEmailMap.set(e, name);
    if (nre) officialTutorNreMap.set(e, nre);
  }
});

/**
 * Resolve o nome canônico do tutor com fallback inteligente por e-mail:
 * Se o tutor digitou o nome incorreto ou deixou em branco, busca pelo e-mail institucional
 */
export function resolveTutorName(tutorName, tutorEmail, customTutores = null) {
  const cleanEmail = String(tutorEmail || '').trim().toLowerCase();
  
  // 1. Se lista personalizada fornecida, tentar mapear primeiro por ela
  if (customTutores && Array.isArray(customTutores)) {
    const match = customTutores.find(t => {
      const eEduc = String(t.email_educ || '').trim().toLowerCase();
      const eAdm = String(t.email_adm || '').trim().toLowerCase();
      return cleanEmail && (cleanEmail === eEduc || cleanEmail === eAdm);
    });
    if (match && (match.tutor_responsavel || match.nome)) {
      return (match.tutor_responsavel || match.nome).trim();
    }
  }

  // 2. Mapeamento oficial via mapa pré-calculado
  if (cleanEmail && officialTutorEmailMap.has(cleanEmail)) {
    return officialTutorEmailMap.get(cleanEmail);
  }

  // 3. Se o nome veio preenchido, verificar se corresponde a algum tutor conhecido
  if (tutorName && String(tutorName).trim()) {
    const cleanName = String(tutorName).trim().toUpperCase();
    const list = customTutores || tutoresFallback;
    const match = list.find(t => (t.tutor_responsavel || t.nome || '').trim().toUpperCase() === cleanName);
    if (match) return (match.tutor_responsavel || match.nome).trim();
    return String(tutorName).trim();
  }

  // 4. Fallback derivado do prefixo do e-mail (ex: maria.silva@escola -> Maria Silva)
  if (cleanEmail && cleanEmail.includes('@')) {
    const userPart = cleanEmail.split('@')[0];
    const parts = userPart.split(/[._-]/).filter(Boolean);
    if (parts.length > 0) {
      return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
    }
  }

  return 'Tutor não informado';
}

export const MOCK_TUTOR_OBSERVATIONS = [];

export const MODALIDADES_TUTORIA = [
  "Encontro Formativo",
  "Diálogo Formativo",
  "Devolutiva",
  "Checklist Operacional"
];

export const CRITERIOS_POR_MODALIDADE = {
  "Diálogo Formativo": [
    "Planejamento e prazo",
    "Etapas do diálogo formativo",
    "Materiais formativos",
    "Questionamentos propositivos",
    "Análise por evidências",
    "Acolhimento e escuta ativa",
    "Mediação de conflitos",
    "Sugestão de materiais e repertório",
    "Construção conjunta de combinados",
    "Gestão do tempo (10 a 20 min)"
  ],
  "Devolutiva": [
    "Planejamento e prazo",
    "Etapas da devolutiva",
    "Materiais formativos",
    "Análise por evidências",
    "Sugestão de materiais e repertório",
    "Gestão do tempo (5 a 10 min)"
  ],
  "Encontro Formativo": [
    "Condução a partir do roteiro",
    "Orientação por PDP e rubrica",
    "Transposição didática e contextualização",
    "Gestão da interação",
    "Comunicação e clima formativo",
    "Competência digital",
    "Gestão do tempo"
  ],
  "Checklist Operacional": [
    "Ações operacionais realizadas",
    "Ações operacionais não realizadas",
    "Outros registros pedagógicos"
  ]
};

export function stripAccents(s) {
  return (s || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeStr(s) {
  return stripAccents((s || "").normalize("NFC").toLowerCase().trim());
}

export function scoreFor(v) {
  if (!v) return null;
  const u = stripAccents(v.normalize("NFC").toUpperCase().trim());
  if (u.includes("NAO ATENDEU") && !u.includes("PARCIALMENTE")) return 0;
  if (u.includes("PARCIALMENTE")) return 1;
  if (u.includes("SUPEROU")) return 3;
  if (u.includes("INTEGRALMENTE") || (u.includes("ATENDEU") && !u.includes("PARCIALMENTE"))) return 2;
  if (u.includes("NAO OBSERVADO")) return null;
  return null;
}

export function classifyValue(v) {
  if (!v) return null;
  const u = stripAccents(v.normalize("NFC").toUpperCase().trim());
  if (u.includes("SUPEROU")) return "superou";
  if (u.includes("NAO OBSERVADO")) return null;
  if (u.includes("PARCIALMENTE")) return "parcial";
  if (u.includes("NAO ATENDEU")) return "nao";
  if (u.includes("INTEGRALMENTE") || u.includes("ATENDEU")) return "atendeu";
  return null;
}

export function detectModalidade(acaoObservada, acaoAcompanhamento) {
  const obs = stripAccents((acaoObservada || '').toLowerCase());
  if (obs.includes("encontro")) return "Encontro Formativo";
  if (obs.includes("dialogo")) return "Diálogo Formativo";
  if (obs.includes("devolutiva")) return "Devolutiva";

  const acomp = stripAccents((acaoAcompanhamento || '').toLowerCase());
  if (acomp.includes("checklist")) return "Checklist Operacional";
  if (acomp.includes("encontro")) return "Encontro Formativo";
  if (acomp.includes("dialogo")) return "Diálogo Formativo";
  if (acomp.includes("devolutiva")) return "Devolutiva";

  return "Outros";
}

/**
 * Converte matriz bruta do Google Sheets (A2:AT) em objetos ObservationRow estruturados.
 * Mapeia rigorosamente as 46 colunas conforme a planilha real de Respostas ao Formulário 1.
 */
export function parseGoogleSheetsValues(values) {
  if (!Array.isArray(values) || values.length === 0) return [];

  return values
    .filter(r => r && (r[2] || r[3] || r[1]))
    .map((r, idx) => {
      const get = (i) => (r[i] !== undefined && r[i] !== null ? r[i].toString().trim() : "");

      const timestamp = get(0);
      const tutorEmail = get(1);
      const rawTutor = get(2) || get(3);
      const tutor = resolveTutorName(rawTutor, tutorEmail);
      const formador = get(4) || get(5);
      const formadorEmail = get(6);
      const acaoAcompanhamento = get(7);
      const acaoObservada = get(8);
      const dataObservacao = get(9);
      const linkAcaoObservada = get(10);
      const dataFeedback = get(11);
      const linkFeedback = get(12);
      const linksComplementares = get(13);

      const modalidade = detectModalidade(acaoObservada, acaoAcompanhamento);

      let rubrics = [];
      if (modalidade === "Diálogo Formativo") {
        rubrics = CRITERIOS_POR_MODALIDADE["Diálogo Formativo"].map((c, i) => ({
          criterio: c,
          value: get(14 + i),
          score: scoreFor(get(14 + i)),
        }));
      } else if (modalidade === "Devolutiva") {
        rubrics = CRITERIOS_POR_MODALIDADE["Devolutiva"].map((c, i) => ({
          criterio: c,
          value: get(24 + i),
          score: scoreFor(get(24 + i)),
        }));
      } else if (modalidade === "Encontro Formativo") {
        rubrics = CRITERIOS_POR_MODALIDADE["Encontro Formativo"].map((c, i) => ({
          criterio: c,
          value: get(30 + i),
          score: scoreFor(get(30 + i)),
        }));
      }

      const scored = rubrics.filter(x => x.score !== null);
      const avg = scored.length > 0
        ? parseFloat((scored.reduce((s, x) => s + (x.score || 0), 0) / scored.length).toFixed(2))
        : null;

      return {
        id: `obs-sheet-${idx + 1}`,
        timestamp,
        tutorEmail,
        tutor,
        formador,
        formadorEmail,
        acaoAcompanhamento,
        acaoObservada,
        dataObservacao,
        linkAcaoObservada,
        dataFeedback,
        linkFeedback,
        linksComplementares,
        modalidade,
        rubrics,
        avgScore: avg,
        checklistRealizadas: get(37),
        checklistNaoRealizadas: get(38),
        outrosRegistros: get(39),
        destaques: get(40),
        desenvolver: get(41),
        encaminhamentos: get(42),
        nre: get(44) || "NRE Geral",
        tema: get(45) || "Prática Pedagógica",
      };
    });
}

/**
 * Busca observações de tutoria:
 * 1. TiDB Cloud Serverless (/api/tidb?action=get_observacoes_tutor)
 * 2. Static public asset (/tutor_observacoes_real.json - 2.013 registros reais)
 * 3. Google Sheets API (/api/sheets)
 * 4. Cache local / mock estruturado
 */
export async function fetchObservacoesTutor() {
  // 1. Tentar TiDB Serverless Cloud
  try {
    const tidbRes = await fetch('/api/tidb?action=get_observacoes_tutor');
    if (tidbRes.ok) {
      const data = await tidbRes.json();
      if (data && Array.isArray(data.observacoes) && data.observacoes.length > 0) {
        return data.observacoes;
      }
    }
  } catch (e) {
    console.warn("[TutorInsights] TiDB indisponível, buscando arquivo estático:", e);
  }

  // 2. Tentar base consolidada estática (2.013 observações reais)
  try {
    const staticRes = await fetch('/tutor_observacoes_real.json');
    if (staticRes.ok) {
      const staticData = await staticRes.json();
      if (Array.isArray(staticData) && staticData.length > 0) {
        return staticData;
      }
    }
  } catch (e) {
    console.warn("[TutorInsights] Arquivo estático /tutor_observacoes_real.json indisponível:", e);
  }

  // 3. Tentar Google Sheets API
  try {
    const url = `/api/sheets?sheetId=${SPREADSHEET_ID}&range=${encodeURIComponent(SHEET_NAME + '!A2:AT')}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.values) && data.values.length > 0) {
        const parsed = parseGoogleSheetsValues(data.values);
        if (parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn("[TutorInsights] Consulta remota Google Sheets indisponível:", e);
  }

  return getTutorObservacoesLocais();
}

export function getTutorObservacoesLocais() {
  try {
    const raw = localStorage.getItem('tutor_insights_observacoes');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Erro ao ler localStorage de observações de tutoria:', e);
  }
  return [];
}

export function salvarNovaObservacaoTutoria(novaObs) {
  try {
    const raw = localStorage.getItem('tutor_insights_observacoes');
    const atuais = raw ? JSON.parse(raw) : [];
    const id = `obs-tut-local-${Date.now()}`;
    const obsCompleta = { ...novaObs, id, timestamp: new Date().toISOString() };
    atuais.unshift(obsCompleta);
    localStorage.setItem('tutor_insights_observacoes', JSON.stringify(atuais));
    return obsCompleta;
  } catch (e) {
    console.error('Erro ao salvar no localStorage:', e);
    return novaObs;
  }
}
