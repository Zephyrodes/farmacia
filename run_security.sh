#!/bin/bash

# Activar entorno virtual
source venv/bin/activate

echo "Ejecutando Bandit..."
bandit -r .

echo ""
echo "Ejecutando Semgrep..."
semgrep --config=p/ci .
