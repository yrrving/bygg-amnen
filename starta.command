#!/bin/bash
# Dubbelklicka för att starta prototypen i webbläsaren.
# Webbläsare kör inte JavaScript-moduler direkt från disken, därför en liten
# lokal server. Den lyssnar bara på den här datorn (127.0.0.1).
cd "$(dirname "$0")"
PORT=8765
(sleep 1; open "http://127.0.0.1:$PORT/") &
echo "Prototypen körs på http://127.0.0.1:$PORT/  (stäng fönstret eller tryck Ctrl+C för att stoppa)"
python3 -m http.server "$PORT" --bind 127.0.0.1
