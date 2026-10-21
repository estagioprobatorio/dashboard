import subprocess
import os
import sys
import shutil

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ESBUILD = os.path.join(BASE_DIR, "node_modules", "@esbuild", "win32-x64", "esbuild.exe")
DIST_DIR = os.path.join(BASE_DIR, "dist")
ASSETS_DIR = os.path.join(DIST_DIR, "assets")

os.makedirs(ASSETS_DIR, exist_ok=True)

out_js = os.path.join(ASSETS_DIR, "index-C8TvWzz_.js")
out_css = os.path.join(ASSETS_DIR, "index-BkIZ9E4d.css")

defines = [
    '--define:process.env.NODE_ENV="production"',
    '--define:import.meta.env.VITE_SUPABASE_URL="https://hoiihqrivcelsfivjpqs.supabase.co"',
    '--define:import.meta.env.VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvaWlocXJpdmNlbHNmaXZqcHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NTcyNjcsImV4cCI6MjEwMTQzMzI2N30.HELd7SnBkp7f8JhAVusY-KiKCJ7Uum8-qndRMYk-3Is"',
    '--define:import.meta.env.VITE_FIREBASE_API_KEY=""',
    '--define:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN=""',
    '--define:import.meta.env.VITE_FIREBASE_DATABASE_URL=""',
    '--define:import.meta.env.VITE_FIREBASE_PROJECT_ID=""',
    '--define:import.meta.env.VITE_FIREBASE_STORAGE_BUCKET=""',
    '--define:import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID=""',
    '--define:import.meta.env.VITE_FIREBASE_APP_ID=""',
    '--define:import.meta.env.VITE_APPS_SCRIPT_URL=""',
]

cmd = [
    ESBUILD,
    os.path.join(BASE_DIR, "src", "main.jsx"),
    "--bundle",
    f"--outfile={out_js}",
    "--loader:.jsx=jsx",
    "--loader:.js=jsx",
    "--loader:.json=json",
    "--loader:.svg=file",
    "--loader:.png=file",
    "--loader:.jpg=file",
    "--loader:.css=css",
    "--external:/*.png",
    "--external:/*.svg",
    "--external:/*.jpg",
    "--jsx=automatic",
    "--minify",
    "--target=es2020",
    "--format=esm",
] + defines

print("Compilando código atual do GitHub (src/)...")
res = subprocess.run(cmd, capture_output=True, text=True)

if res.returncode != 0:
    print("ERRO na compilação:")
    print(res.stderr)
    sys.exit(1)

print("Build JS concluído com sucesso!")

# Se o esbuild gerou um arquivo css correspondente
esbuild_css = out_js.replace(".js", ".css")
if os.path.exists(esbuild_css):
    shutil.copy2(esbuild_css, out_css)
    print("CSS atualizado no dist!")
else:
    # Copia o src/index.css para dist/assets se necessário
    src_css = os.path.join(BASE_DIR, "src", "index.css")
    if os.path.exists(src_css):
        shutil.copy2(src_css, out_css)
        print("CSS de src/index.css copiado para o dist!")

# Copia brasao_parana.svg e arquivos públicos para dist
public_dir = os.path.join(BASE_DIR, "public")
if os.path.exists(public_dir):
    for f in os.listdir(public_dir):
        src_f = os.path.join(public_dir, f)
        dst_f = os.path.join(DIST_DIR, f)
        if os.path.isfile(src_f):
            shutil.copy2(src_f, dst_f)

# Atualiza dist/index.html apontando para os novos arquivos JS e CSS
index_html = os.path.join(DIST_DIR, "index.html")
if os.path.exists(index_html):
    with open(index_html, "r", encoding="utf-8") as f:
        html = f.read()
    import re
    html = re.sub(r'/assets/index-[^"]+\.js', f'/assets/{os.path.basename(out_js)}', html)
    html = re.sub(r'/assets/index-[^"]+\.css', f'/assets/{os.path.basename(out_css)}', html)
    with open(index_html, "w", encoding="utf-8") as f:
        f.write(html)
    print("dist/index.html atualizado com os novos hashes JS/CSS!")

print(f"\nDist atualizado com sucesso a partir do GitHub!")
print(f"Arquivo JS gerado: {out_js} ({os.path.getsize(out_js)} bytes)")
print(f"Arquivo CSS gerado: {out_css} ({os.path.getsize(out_css)} bytes)")
