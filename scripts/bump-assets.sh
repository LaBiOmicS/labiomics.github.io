#!/usr/bin/env bash
# Atualiza o ?v= das referências a CSS/JS no index.html com o hash do conteúdo de cada arquivo.
# Rode antes de cada commit que altere arquivos em assets/ para evitar que navegadores usem cache antigo.
set -euo pipefail
cd "$(dirname "$0")/.."
for f in assets/style.css assets/app.js assets/projects.js; do
  h=$(sha1sum "$f" | cut -c1-8)
  sed -i -E "s#(${f})(\?v=[0-9a-f]+)?\"#\1?v=${h}\"#" index.html
done
grep -oE 'assets/[a-z]+\.(css|js)\?v=[0-9a-f]+' index.html
