# Transcendence - Le Jeu du Président

Stack moderno et complet pour un projet éducatif de gestion de tournois du Jeu du Président avec:

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: NestJS + TypeScript + PostgreSQL
- **Realtime**: Socket.io pour les games en temps réel
- **Database**: PostgreSQL avec TypeORM

## 🚀 Démarrage rapide

### Prérequis
- Docker et Docker Compose installés
- Node.js 20+ (optionnel, pour le développement local)

### Lancer le projet avec Docker Compose

```bash
# À la racine du projet
docker compose up --build

# Le site sera accessible à: http://localhost:3000
# L'API sera accessible à: http://localhost:3001
```

### Structure du projet

```
Transcendence/
├── frontend/          # Application React (port 3000)
│   ├── src/
│   │   ├── chat/          # Chat global, MP, modales de profil
│   │   ├── game/          # Table de jeu du Président (cartes, rôles, défausse)
│   │   ├── lobby/         # Menus : accueil, jeu, social, classement, options
│   │   ├── pages/         # Écrans routés (login, register, home, games...)
│   │   ├── services/      # api.ts (REST), socket.ts (socket.io), authService.ts
│   │   ├── social/        # Données amis / quêtes / progression
│   │   └── tournament/    # Brackets et création de tournoi
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
├── backend/           # API NestJS (port 3001)
│   ├── src/
│   │   ├── entities/      # User, PresidentGame, GameHistory, Friendship, Message
│   │   ├── gateway/       # GameGateway (socket.io, parties de Président)
│   │   ├── modules/
│   │   │   ├── auth/          # JWT : register / login / me
│   │   │   ├── chat/          # Messages privés + ChatGateway + rate limiting
│   │   │   ├── friends/       # Demandes d'amis, blocages
│   │   │   ├── history/       # Historique des parties
│   │   │   ├── player/        # Profils, stats, leaderboard
│   │   │   ├── presence/      # Suivi en ligne / hors ligne
│   │   │   ├── president/     # Règles et état des parties
│   │   │   └── xp/            # XP, niveaux, badges
│   │   ├── main.ts
│   │   └── app.module.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── docker-compose.yml
└── .env              # Variables d'environnement
```

## 🔌 API

| Domaine | Routes |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| Joueurs | `GET /players`, `GET /players/leaderboard`, `GET /players/:id`, `GET /players/:id/stats`, `PATCH /players/:id` |
| XP | `GET /xp/me`, `GET /xp/leaderboard`, `GET /xp/:id` |
| Historique | `GET /history`, `GET /history/me`, `GET /history/player/:id`, `GET /history/:id` |
| Amis | `GET /friends`, `GET /friends/requests/{incoming,outgoing}`, `POST /friends/requests`, `POST /friends/requests/:id/{accept,decline}`, `DELETE /friends/:id`, `POST /friends/:id/{block,unblock}` |
| Chat | `GET /chat/conversations`, `GET /chat/conversations/:id/messages`, `POST /chat/conversations/:id/read`, `GET /chat/unread-count` |
| Président | `GET /president`, `GET /president/me`, `GET /president/:id[/state]`, `POST /president[/:id/join]`, `PATCH /president/:id/{start,finish}` |

WebSocket (JWT dans `auth.token`) :
- namespace par défaut → `president:join_room`, `president:join`, `president:start`, `president:play`, `president:pass`, `president:finish`, `president:invite`, `president:chat:send`
- namespace `/chat` → `dm:send`, `dm:typing`, `dm:read`

Côté front, tout passe par `frontend/src/services/api.ts` (instance axios avec
injection automatique du JWT) et `frontend/src/services/socket.ts`.

## 📝 Configuration

Modifiez le fichier `.env` pour personnaliser:
- Identifiants PostgreSQL
- JWT Secret
- CORS origins
- URLs API/WebSocket

## 🛠 Développement

### Arrêter les containers

```bash
docker compose down
```

### Voir les logs

```bash
# Tous les services
docker compose logs -f

# Service spécifique
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
```

### Accès à la base de données

```bash
# Via psql
docker exec -it transcendence_postgres psql -U postgres -d transcendence
```

## 📦 Dépendances clés

### Backend
- NestJS 10
- TypeORM
- Socket.io
- PostgreSQL Driver
- JWT (Passport)

### Frontend
- React 18
- Vite
- Socket.io Client
- Axios

## 🎯 État actuel

Le front ne contient plus aucune donnée fictive : chaque écran lit le backend.
Amis, demandes, blocages, présence, messages privés, profil, statistiques,
classement, XP, salons et parties de Président viennent tous de l'API ou des
sockets.

Ce qui n'a pas encore de backend est affiché vide plutôt que simulé :

1. **Chat global et groupes** — l'onglet "Global" reste visible mais vide et en
   lecture seule (seuls les messages privés ont un `ChatGateway`).
2. **Quêtes** — le panneau est conservé dans le hub, sans quête (ni système
   local ni endpoint).
3. **Tournois** — le tableau se construit à partir des joueurs réellement
   inscrits, mais rien n'est persisté et aucun résultat n'est simulé : il faut
   un module tournoi côté backend pour le faire avancer.

## ⚠️ Notes de développement

- TypeScript partout pour une meilleure qualité de code
- Modules NestJS bien séparés (architecture modulaire)
- Hot-reload activé pour le développement
- Base de données auto-synchronisée en développement
