import React, { useMemo } from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { parseScore } from '../utils/aiPedagogicalService';

export default function RadarCompetenciasCursista({ observacoes = [], title = "Radar de Competências Docentes" }) {
  const radarData = useMemo(() => {
    if (!Array.isArray(observacoes) || observacoes.length === 0) {
      return [
        { dimensao: 'Planejamento', nota: 2.0, fullMark: 3 },
        { dimensao: 'Gestão de Sala', nota: 2.0, fullMark: 3 },
        { dimensao: 'Metodologias', nota: 2.0, fullMark: 3 },
        { dimensao: 'RCO+Aulas', nota: 2.0, fullMark: 3 },
        { dimensao: 'Clima Escolar', nota: 2.0, fullMark: 3 },
        { dimensao: 'Avaliação', nota: 2.0, fullMark: 3 },
        { dimensao: 'Gestão do Tempo', nota: 2.0, fullMark: 3 }
      ];
    }

    // Acumuladores
    const dimensoes = {
      'Planejamento': { sum: 0, count: 0 },
      'Prática em Sala': { sum: 0, count: 0 },
      'Gestão de Sala': { sum: 0, count: 0 },
      'Metodologias': { sum: 0, count: 0 },
      'RCO+Aulas': { sum: 0, count: 0 },
      'Clima & Interação': { sum: 0, count: 0 },
      'Gestão do Tempo': { sum: 0, count: 0 }
    };

    observacoes.forEach(obs => {
      const plan = parseScore(obs.nivel_planejamento || obs.planejamento || obs.criterio1_nivel);
      const prat = parseScore(obs.nivel_pratica || obs.pratica || obs.criterio2_nivel);

      if (plan !== null) {
        dimensoes['Planejamento'].sum += plan;
        dimensoes['Planejamento'].count += 1;
        dimensoes['RCO+Aulas'].sum += plan;
        dimensoes['RCO+Aulas'].count += 1;
      }
      if (prat !== null) {
        dimensoes['Prática em Sala'].sum += prat;
        dimensoes['Prática em Sala'].count += 1;
        dimensoes['Gestão de Sala'].sum += prat;
        dimensoes['Gestão de Sala'].count += 1;
        dimensoes['Metodologias'].sum += prat;
        dimensoes['Metodologias'].count += 1;
        dimensoes['Clima & Interação'].sum += prat;
        dimensoes['Clima & Interação'].count += 1;
        dimensoes['Gestão do Tempo'].sum += prat;
        dimensoes['Gestão do Tempo'].count += 1;
      }

      // Se houver rubricas detalhadas aninhadas
      if (Array.isArray(obs.rubrics)) {
        obs.rubrics.forEach(r => {
          if (r.criterio && typeof r.score === 'number') {
            const cLower = r.criterio.toLowerCase();
            if (cLower.includes('planejamento') || cLower.includes('prazo')) {
              dimensoes['Planejamento'].sum += r.score;
              dimensoes['Planejamento'].count += 1;
            } else if (cLower.includes('gestão') || cLower.includes('sala')) {
              dimensoes['Gestão de Sala'].sum += r.score;
              dimensoes['Gestão de Sala'].count += 1;
            } else if (cLower.includes('tempo')) {
              dimensoes['Gestão do Tempo'].sum += r.score;
              dimensoes['Gestão do Tempo'].count += 1;
            } else if (cLower.includes('interação') || cLower.includes('clima') || cLower.includes('acolhimento')) {
              dimensoes['Clima & Interação'].sum += r.score;
              dimensoes['Clima & Interação'].count += 1;
            } else {
              dimensoes['Metodologias'].sum += r.score;
              dimensoes['Metodologias'].count += 1;
            }
          }
        });
      }
    });

    return Object.entries(dimensoes).map(([dimensao, val]) => {
      const media = val.count > 0 ? Number((val.sum / val.count).toFixed(2)) : 2.0;
      return {
        dimensao,
        nota: media,
        fullMark: 3
      };
    });
  }, [observacoes]);

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '1.25rem',
      border: '1px solid #e2e8f0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#002b7f', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            🎯 {title}
          </h4>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Média de proficiência por competência docente observada (escala 0 a 3.0)
          </span>
        </div>
        <span style={{ fontSize: '0.72rem', backgroundColor: '#eff6ff', color: '#1e40af', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
          {observacoes.length} observação(ões) analisada(s)
        </span>
      </div>

      <div style={{ width: '100%', height: '280px' }}>
        <ResponsiveContainer>
          <RadarChart data={radarData} outerRadius="75%">
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="dimensao" tick={{ fill: '#334155', fontSize: 11, fontWeight: 700 }} />
            <PolarRadiusAxis angle={30} domain={[0, 3]} stroke="#94a3b8" />
            <Radar
              name="Proficiência Docente"
              dataKey="nota"
              stroke="#007a33"
              fill="#007a33"
              fillOpacity={0.35}
            />
            <Tooltip formatter={(value) => [`${value} / 3.0`, 'Nota Formativa']} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span style={{ width: '10px', height: '10px', backgroundColor: '#007a33', borderRadius: '2px', display: 'inline-block' }} />
          Média Formativa do Professor
        </span>
        <span>• Meta institucional: ≥ 2.0 (Atendeu integralmente)</span>
      </div>
    </div>
  );
}
