#!/usr/bin/env python3
"""
Launcher da migração TiDB Serverless Cloud
Executa o carregador oficial em Node.js com MySQL2 e SSL
"""
import subprocess
import sys
import os

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    script = os.path.join(base_dir, "popular_tidb.cjs")
    res = subprocess.run(["node", script], cwd=base_dir)
    sys.exit(res.returncode)

if __name__ == "__main__":
    main()
