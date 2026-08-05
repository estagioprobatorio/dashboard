import csv
import json
import os

csv_filename = os.path.join("..", "Estágio Probatório - Gestão de turmas - 2026 (respostas) - DADOS.csv")
json_filename = os.path.join("src", "data_fallback.json")

print(f"Lendo CSV: {csv_filename}")
records = []

with open(csv_filename, mode='r', encoding='utf-8') as f:
    # Remove BOM se houver
    first_line = f.readline()
    if first_line.startswith('\ufeff'):
        first_line = first_line[1:]
    f.seek(0)
    
    # Criamos o leitor DictReader
    reader = csv.DictReader(f)
    
    # Limpamos os nomes das colunas de espaços extras
    cleaned_fieldnames = [field.strip() for field in reader.fieldnames]
    reader.fieldnames = cleaned_fieldnames
    
    for row in reader:
        # Criamos um registro limpo
        record = {}
        for key, value in row.items():
            if key:
                clean_key = key.strip()
                # Coerção de valores vazios para nulos/vazios adequados
                clean_value = value.strip() if value else ""
                
                # Mapeamento e padronização de chaves para compatibilidade com o front-end
                if clean_key == 'e-mail':
                    record['e-mail'] = clean_value
                    record['email'] = clean_value
                elif clean_key == 'e-mail_formador':
                    record['e-mail_formador'] = clean_value
                    record['email_formador'] = clean_value
                elif clean_key == 'e-mail_nre':
                    record['e-mail_nre'] = clean_value
                    record['email_nre'] = clean_value
                elif clean_key == 'Link Classroom':
                    record['Link Classroom'] = clean_value
                    record['link_classroom'] = clean_value
                else:
                    record[clean_key] = clean_value
        
        # Garante que cgm seja uma string limpa
        if 'cgm' in record and record['cgm']:
            # Se vier científico ou float, tenta converter
            cgm_val = record['cgm']
            if '.' in cgm_val:
                try:
                    cgm_val = str(int(float(cgm_val)))
                except ValueError:
                    pass
            record['cgm'] = cgm_val
            
        records.append(record)

print(f"Total de registros lidos: {len(records)}")

print(f"Gravando JSON em: {json_filename}")
with open(json_filename, mode='w', encoding='utf-8') as f:
    json.dump(records, f, ensure_ascii=False, indent=2)

print("Conversão concluída com sucesso!")
