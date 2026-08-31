Frontend - instructions rapides

Interface React du Jeu du Président, branchée sur l'API NestJS du dossier
`backend/`. Aucune donnée n'est fabriquée côté client : tout ce qui s'affiche
vient du serveur, ou reste vide.

Lancer en dev

```bash
cd frontend
npm install
npm run dev
```

Le backend doit tourner en parallèle (`docker compose up --build` à la racine,
ou `cd backend && npm run start:dev` + une base PostgreSQL). Sans backend, la
connexion échoue : il n'y a plus de mode hors-ligne simulé.

Variables d'environnement

- `VITE_API_URL` : URL de base du backend (par défaut `http://localhost:3001`).
- `VITE_WS_URL` : URL des sockets (par défaut `http://localhost:3001`).

Couche services (`src/services/`)

- `api.ts` : instance axios partagée (base URL + injection automatique du JWT)
  et clients typés par domaine — `authApi`, `playerService`, `xpService`,
  `historyService`, `friendsService`, `chatService`, `presidentService`.
- `socket.ts` : connexions socket.io authentifiées — `getGameSocket()`
  (namespace par défaut, événements `president:*`) et `getChatSocket()`
  (namespace `/chat`, événements `dm:*` et présence).
- `authService.ts` : register / login / getMe / logout.

Le token JWT est stocké dans `localStorage` sous la clé `token`.

D'où viennent les données

| Écran | Source |
| --- | --- |
| Social, panneau Amis | `GET /friends*`, `GET /players`, présence via `/chat` |
| Chat privé | socket `/chat` (`dm:send`, `dm:receive`) + `GET /chat/*` |
| Profil, modale de profil | `GET /players/:id/stats` |
| Hub de profil (XP, niveau, badges) | `GET /xp/me` |
| Classement | `GET /players/leaderboard` |
| Menu Jouer, table de jeu | `GET/POST /president` + socket `president:*` |

Sans backend correspondant (affiché vide, jamais simulé)

- **Chat global et groupes** : onglet "Global" visible, vide, en lecture seule.
- **Quêtes** : panneau conservé, aucune quête.
- **Tournois** : le tableau part des joueurs réellement inscrits, mais rien
  n'est persisté et aucun résultat n'est généré — il attend un module tournoi
  côté serveur.
