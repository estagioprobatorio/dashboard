import http.server
import socketserver
import functools
import os
import sys
import webbrowser

PORT = 5173
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(BASE_DIR, "dist")

if not os.path.exists(DIST_DIR):
    print(f"Erro: A pasta dist nao foi encontrada em:\n{DIST_DIR}")
    input("Pressione Enter para fechar...")
    sys.exit(1)

class SPAServerHandler(http.server.SimpleHTTPRequestHandler):
    def send_error(self, code, message=None):
        if code == 404:
            index_path = os.path.join(self.directory, "index.html")
            if os.path.exists(index_path):
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.end_headers()
                with open(index_path, "rb") as f:
                    self.wfile.write(f.read())
                return
        super().send_error(code, message)

Handler = functools.partial(SPAServerHandler, directory=DIST_DIR)
socketserver.TCPServer.allow_reuse_address = True

print("=" * 65)
print("  ESTAGIO PROBATORIO - SEED/PR (SERVIDOR LOCAL ATIVO)")
print("=" * 65)
print(f"  * URL de Acesso:  http://localhost:{PORT}")
print(f"  * Pasta servida:  {DIST_DIR}")
print("  * Pressione Ctrl+C na janela para encerrar o servidor.")
print("=" * 65)

# Tenta abrir o navegador automaticamente
try:
    webbrowser.open(f"http://localhost:{PORT}")
except Exception:
    pass

try:
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\nServidor encerrado.")
except Exception as e:
    print(f"\nErro ao iniciar servidor na porta {PORT}: {e}")
    input("Pressione Enter para sair...")
