const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '..', 'docs', 'Estágio Probatório - Gestão de turmas - 2026 (respostas) - TURMAS.csv');
const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);

const turmas = [];
const horariosPorComponente = {};
const diasPorComponente = {};
const turmasPorNome = {};

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  const parts = line.split(',');
  if (parts.length < 7) continue;

  const nomeFormador = (parts[0] || '').replace(/^"|"$/g, '').trim();
  const turma = (parts[1] || '').replace(/^"|"$/g, '').trim();
  const diaSemana = (parts[2] || '').replace(/^"|"$/g, '').trim();
  const hIni = (parts[3] || '').replace(/^"|"$/g, '').trim();
  const hFim = (parts[4] || '').replace(/^"|"$/g, '').trim();
  const turno = (parts[5] || '').replace(/^"|"$/g, '').trim().toUpperCase();
  const anoFormativo = (parts[6] || '').replace(/^"|"$/g, '').trim();
  const linkClassroom = (parts[7] || '').replace(/^"|"$/g, '').trim();
  const idClassroom = (parts[8] || '').replace(/^"|"$/g, '').trim();
  const tutorTurma = (parts[12] || '').replace(/^"|"$/g, '').trim();
  const componente = (parts[13] || '').replace(/^"|"$/g, '').trim().toUpperCase();

  const horarioFormatado = (hIni && hFim) ? `${hIni} às ${hFim}` : '';

  if (turma) {
    const infoTurma = {
      turma,
      formador: nomeFormador,
      diaSemana,
      horarioInicial: hIni,
      horarioFim: hFim,
      horarioFormatado,
      turno,
      anoFormativo,
      componente,
      tutor: tutorTurma,
      linkClassroom,
      idClassroom
    };
    turmas.push(infoTurma);
    turmasPorNome[turma] = infoTurma;
  }

  if (componente) {
    if (!horariosPorComponente[componente]) {
      horariosPorComponente[componente] = { MANHA: [], TARDE: [], NOITE: [] };
    }
    if (turno && horarioFormatado) {
      const turnoKey = turno.includes('MANH') ? 'MANHA' : turno.includes('TARD') ? 'TARDE' : 'NOITE';
      if (!horariosPorComponente[componente][turnoKey].includes(horarioFormatado)) {
        horariosPorComponente[componente][turnoKey].push(horarioFormatado);
      }
    }
    if (diaSemana && diaSemana !== '#REF!' && !diasPorComponente[componente]) {
      diasPorComponente[componente] = diaSemana;
    }
  }
}

// Sort
for (const comp in horariosPorComponente) {
  for (const t in horariosPorComponente[comp]) {
    horariosPorComponente[comp][t].sort();
  }
}

const dir = path.join(__dirname, '..', 'src', 'data');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const output = {
  total: turmas.length,
  horariosPorComponente,
  diasPorComponente,
  turmasPorNome
};

fs.writeFileSync(path.join(dir, 'turmasOficiais.json'), JSON.stringify(output, null, 2), 'utf8');
console.log('src/data/turmasOficiais.json gerado com sucesso! Total de turmas:', turmas.length);
