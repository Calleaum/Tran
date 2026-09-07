#!/bin/sh
# Génère un certificat auto-signé pour le développement local (HTTPS).
# À exécuter une seule fois (ou à chaque renouvellement) depuis la racine du
# projet : `sh certs/generate-certs.sh`
# Les fichiers générés (cert.pem / key.pem) sont ignorés par git (.gitignore).

set -e
CERT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Détecte la ou les IP locales de cette machine, pour que le certificat soit
# aussi valide quand le site est ouvert depuis un autre PC du réseau via
# https://<IP_LAN>:3000 (sinon le navigateur affiche en plus un avertissement
# de nom de certificat invalide). Best-effort : Linux (hostname -I) puis
# macOS (ipconfig) ; si rien n'est trouvé, on retombe sur localhost/127.0.0.1.
detect_lan_ips() {
  if command -v hostname >/dev/null 2>&1 && hostname -I >/dev/null 2>&1; then
    hostname -I
  elif command -v ipconfig >/dev/null 2>&1; then
    { ipconfig getifaddr en0; ipconfig getifaddr en1; } 2>/dev/null
  fi
}

SAN="DNS:localhost,IP:127.0.0.1"
for ip in $(detect_lan_ips); do
  case "$ip" in
    127.*|*:*) continue ;; # ignore loopback (déjà présent) et IPv6
  esac
  SAN="$SAN,IP:$ip"
done

openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout "$CERT_DIR/key.pem" \
  -out "$CERT_DIR/cert.pem" \
  -days 365 \
  -subj "/C=FR/ST=Normandie/L=Local/O=Transcendence/CN=localhost" \
  -addext "subjectAltName=$SAN"

echo "✔ Certificats générés dans $CERT_DIR (cert.pem / key.pem)"
echo "  Valide pour : $SAN"
