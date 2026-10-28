#!/usr/bin/env python3
"""
Script para popular o novo projeto Supabase (apebaoinlopybfgvhudf) com os dados base:
- tutores (src/tutores_fallback.json)
- cursistas (src/data_fallback.json)
- observacoes_pratica (src/observacoes_fallback.json)

IMPORTANTE: Antes de rodar este script, execute o arquivo:
  google-apps-script/setup_novo_supabase_completo.sql
no SQL Editor do painel do Supabase:
  https://supabase.com/dashboard/project/apebaoinlopybfgvhudf/sql/new
"""

import json
import os
import sys
import urllib.request
import urllib.error

SUPABASE_URL = "https://apebaoinlopybfgvhudf.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwZWJhb2lubG9weWJmZ3ZodWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwOTUwOTQsImV4cCI6MjEwODY3MTA5NH0.WlEm896zVOrqYks0Nco1_Plku-d1ksdJ-oBJM0W-JJg"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def post_batch(table, batch, on_conflict=None):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    if on_conflict:
        url += f"?on_conflict={on_conflict}"

    data = json.dumps(batch).encode("utf-8")
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal" if on_conflict else "return=minimal",
    }

    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            return resp.status, ""
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace")
    except Exception as e:
        return 0, str(e)


def upload_tutores():
    path = os.path.join(BASE_DIR, "src", "tutores_fallback.json")
    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    rows = []
    for t in raw:
        rows.append({
            "tutor_responsavel": t.get("tutor_responsavel"),
            "email_educ": t.get("email_educ"),
            "email_adm": t.get("email_adm"),
            "telefone": t.get("telefone"),
            "nre_tutor": t.get("nre_tutor"),
            "email_nre": t.get("email_nre"),
        })

    status, err = post_batch("tutores", rows)
    if 200 <= status < 300:
        print(f"[OK] tutores: {len(rows)} registros enviados.")
        return True
    else:
        print(f"[ERRO] tutores (HTTP {status}): {err}")
        return False


def upload_cursistas():
    path = os.path.join(BASE_DIR, "src", "data_fallback.json")
    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    allowed_cols = {
        "cod_cursista", "cgm", "nome_cursista", "email", "cpf_cursista", "rg",
        "telefone_cursista", "modalidade", "componente", "turmas", "dia_da_semana",
        "horario_inicial", "horario_fim", "turno", "ano_formativo", "nome_formador",
        "cpf_formador", "rg_formador", "email_formador", "telefone_formador",
        "nre_formador", "componente_formador", "tutor_responsavel", "email_tutor",
        "telefone_tutor", "nre_tutor", "email_nre", "link", "id_classroom",
        "periodo_ini", "chamamento", "nre_exe", "munic_exe", "componente_conc",
        "observacoes_cursista", "observacoes_formador", "observacoes_tutor",
        "observacoes_turma"
    }

    rows = []
    seen_cod = set()
    for idx, r in enumerate(raw):
        cod = r.get("cod_cursista") or f"CURS_{r.get('cgm') or idx}_{idx}"
        if cod in seen_cod:
            cod = f"{cod}_{idx}"
        seen_cod.add(cod)

        clean = {k: r.get(k) for k in allowed_cols if k in r}
        clean["cod_cursista"] = str(cod)
        clean["email"] = r.get("email") or r.get("e-mail") or r.get("email_cursista")
        clean["email_formador"] = r.get("email_formador") or r.get("e-mail_formador") or r.get("e_mail_formador")
        rows.append(clean)

    batch_size = 250
    total = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        status, err = post_batch("cursistas", batch, on_conflict="cod_cursista")
        if 200 <= status < 300:
            total += len(batch)
            print(f"  -> cursistas: {total}/{len(rows)}")
        else:
            print(f"[ERRO] cursistas lote {i} (HTTP {status}): {err}")
            return False
    print(f"[OK] cursistas: {total} registros enviados.")
    return True


def upload_observacoes():
    path = os.path.join(BASE_DIR, "src", "observacoes_fallback.json")
    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    allowed_cols = {
        "id_origem", "carimbo", "email_cursista", "nome_cursista", "email_formador",
        "nome_formador", "ano_formativo", "semestre", "chamamento", "modalidade",
        "componente", "tema", "observacao_realizada", "is_realizada", "data_pratica",
        "data_observacao", "data_feedback", "data_agendamento", "modalidade_feedback",
        "motivo_devolutiva", "link_gravacao_pratica", "link_planejamento",
        "link_gravacao_feedback", "nivel_planejamento", "nivel_pratica",
        "evidencias_planejamento", "evidencias_pratica", "questionamentos_propositivos",
        "proposicoes_sugestoes", "combinados", "justificativa_nao_realizada",
        "contexto_justificativa", "reflexoes_gerais"
    }

    rows = []
    seen_ids = set()
    for idx, o in enumerate(raw):
        email = (o.get("email_cursista") or "").strip()
        if not email:
            continue
        id_orig = str(o.get("id_origem") or o.get("id") or f"HIST_{idx + 1}")
        if id_orig in seen_ids:
            id_orig = f"{id_orig}_{idx}"
        seen_ids.add(id_orig)

        clean = {k: o.get(k) for k in allowed_cols if k in o}
        clean["id_origem"] = id_orig
        clean["email_cursista"] = email
        rows.append(clean)

    batch_size = 250
    total = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        status, err = post_batch("observacoes_pratica", batch, on_conflict="id_origem")
        if 200 <= status < 300:
            total += len(batch)
            print(f"  -> observacoes_pratica: {total}/{len(rows)}")
        else:
            print(f"[ERRO] observacoes_pratica lote {i} (HTTP {status}): {err}")
            return False
    print(f"[OK] observacoes_pratica: {total} registros enviados.")
    return True


def main():
    print(f"Conectando ao novo Supabase: {SUPABASE_URL}")
    if not upload_tutores():
        print("\n⚠️ Antes de popular os dados, execute o SQL de criação das tabelas:")
        print("  1. Abra: https://supabase.com/dashboard/project/apebaoinlopybfgvhudf/sql/new")
        print("  2. Cole o conteúdo de: google-apps-script/setup_novo_supabase_completo.sql")
        print("  3. Clique em 'Run' e depois rode novamente: python3 popular_novo_supabase.py")
        sys.exit(1)
    upload_cursistas()
    upload_observacoes()
    print("\n✅ Base completa (Tutores, Cursistas e Observações) sincronizada no novo Supabase!")
    print("Para buscar as observações mais recentes das 4 planilhas, rode 'sincronizarTodasAsPlanilhas' no Google Apps Script.")


if __name__ == "__main__":
    main()
