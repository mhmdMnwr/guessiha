#!/bin/sh
set -e

mkdir -p /etc/letsencrypt/live/guessiha.duckdns.org

if [ -f /etc/letsencrypt-host/live/guessiha.duckdns.org/fullchain.pem ]; then
  cp -RL /etc/letsencrypt-host/live/guessiha.duckdns.org/* /etc/letsencrypt/live/guessiha.duckdns.org/
elif [ ! -f /etc/letsencrypt/live/guessiha.duckdns.org/fullchain.pem ]; then
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/letsencrypt/live/guessiha.duckdns.org/privkey.pem \
    -out /etc/letsencrypt/live/guessiha.duckdns.org/fullchain.pem \
    -subj "/CN=guessiha.duckdns.org" 2>/dev/null
fi

exec nginx -g "daemon off;"
