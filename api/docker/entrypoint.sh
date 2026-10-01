#!/bin/bash
set -e

# Render sets $PORT automatically. Fallback to 3000 for local testing.
PORT="${PORT:-3000}"

# Update Apache to listen on the correct port
sed -i "s/Listen [0-9]*/Listen ${PORT}/" /etc/apache2/ports.conf
sed -i "s/:[0-9]*>/:${PORT}>/" /etc/apache2/sites-available/000-default.conf

exec apache2-foreground