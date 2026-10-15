#!/usr/bin/env bash
# Prepara e executa o PatasPerto do zero: ambiente → banco → dataset → modelo → app.
# Uso: bash preparar.sh          (ou: bash preparar.sh --sem-app para só preparar)
set -e
cd "$(dirname "$0")"

# o Python do venv fica em .venv/bin (Linux/Mac) ou em .venv/Scripts (Windows / Git Bash)
py_venv() { if [ -x .venv/Scripts/python.exe ]; then echo .venv/Scripts/python.exe; else echo .venv/bin/python; fi; }
export PYTHONUTF8=1   # acentos no console do Windows

if [ ! -x "$(py_venv)" ]; then
  echo "▶ Criando ambiente virtual (.venv) com Python 3.12 via uv…"
  if command -v uv >/dev/null 2>&1; then
    uv venv --python 3.12 .venv
    uv pip install --python "$(py_venv)" -r requirements.txt
  else
    python3 -m venv .venv 2>/dev/null || python -m venv .venv   # no Windows costuma ser só "python"
    "$(py_venv)" -m pip install -q -r requirements.txt
  fi
fi
PY=$(py_venv)

echo "▶ 1/3 Criando o banco SQLite (banco/patasperto.db)…";   $PY banco/criar_banco.py
echo; echo "▶ 2/3 Gerando o dataset sintético (ml/dataset.csv)…"; $PY ml/gerar_dataset.py
echo; echo "▶ 3/3 Treinando o Random Forest (ml/modelo.pkl)…";  $PY ml/treinar_modelo.py

if [ "$1" != "--sem-app" ]; then
  echo; echo "▶ Subindo a API + app em http://127.0.0.1:5000"
  $PY app.py
fi
