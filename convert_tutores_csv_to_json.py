import csv
import json
import os

csv_filename = os.path.join("..", "Estágio Probatório - Gestão de turmas - 2026 (respostas) - TUTORES.csv")
json_filename = os.path.join("src", "tutores_fallback.json")

print(f"Lendo CSV de Tutores: {csv_filename}")
records = []

with open(csv_filename, mode='r', encoding='utf-8') as f:
    # Remove BOM se houver
    first_line = f.readline()
    if first_line.startswith('\ufeff'):
        first_line = first_line[1:]
    f.seek(0)
    
    reader = csv.DictReader(f)
    
    # Limpamos os nomes das colunas de espaços extras
    cleaned_fieldnames = [field.strip() for field in reader.fieldnames]
    reader.fieldnames = cleaned_fieldnames
    
    for row in reader:
        record = {}
        for key, value in row.items():
            if key:
                clean_key = key.strip()
                clean_value = value.strip() if value else ""
                
                # Mapeamento e padronização de chaves
                if clean_key == 'e-mail_nre':
                    record['email_nre'] = clean_value
                else:
                    record[clean_key] = clean_value
        
        # Garante que campos de CPF e RG não tenham formatação estranha
        if 'cpf' in record:
            record['cpf'] = record['cpf'].replace('.', '').replace('-', '')
        if 'rg' in record:
            record['rg'] = record['rg'].replace('.', '').replace('-', '')
            
        records.append(record)

print(f"Total de tutores lidos: {len(records)}")

print(f"Gravando JSON em: {json_filename}")
with open(json_filename, mode='w', encoding='utf-8') as f:
    json.dump(records, f, ensure_ascii=False, indent=2)

print("Conversão de tutores concluída com sucesso!")
