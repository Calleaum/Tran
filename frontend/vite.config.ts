import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// TLS est terminé une seule fois, par nginx (voir nginx/nginx.conf) : le
// serveur de dev Vite ne parle qu'en clair, en interne, au conteneur nginx.
// Il ne doit donc jamais charger de certificat lui-même (sinon on se
// retrouve avec deux certificats à valider côté navigateur : un pour
// nginx, un pour le frontend).

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    // Depuis Vite 5.4.12+, le serveur de dev rejette (403 "Blocked
    // request") toute requête dont l'en-tête Host n'est pas localhost —
    // protection anti DNS-rebinding. Ici nginx transmet fidèlement le Host
    // envoyé par le navigateur (voir nginx/nginx.conf), donc une connexion
    // via l'IP du réseau local (ex. 192.168.1.42) serait bloquée sans ça.
    // Sûr dans ce contexte : le serveur n'est de toute façon jamais exposé
    // directement, il n'est joignable qu'à travers nginx (TLS + réseau
    // Docker interne).
    allowedHosts: true,
  },
})
