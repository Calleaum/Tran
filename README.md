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
docker-compose up --build

# Le site sera accessible à: http://localhost:3000
# L'API sera accessible à: http://localhost:3001
```

### Structure du projet

```
Transcendence/
├── frontend/          # Application React (port 3000)
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
├── backend/           # API NestJS (port 3001)
│   ├── src/
│   │   ├── modules/
│   │   │   ├── game/
│   │   │   ├── player/
│   │   │   └── tournament/
│   │   ├── main.ts
│   │   └── app.module.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── docker-compose.yml
└── .env              # Variables d'environnement
```

## 📝 Configuration

Modifiez le fichier `.env` pour personnaliser:
- Identifiants PostgreSQL
- JWT Secret
- CORS origins
- URLs API/WebSocket

## 🛠 Développement

### Arrêter les containers

```bash
docker-compose down
```

### Voir les logs

```bash
# Tous les services
docker-compose logs -f

# Service spécifique
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
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

## 🎯 Prochaines étapes

1. Implémenter les entities TypeORM (Player, Game, Tournament, Card)
2. Créer les DTO pour validation
3. Ajouter authentification JWT
4. Implémenter WebSocket pour les games en temps réel
5. Développer l'UI pour les différentes pages et phases du jeu

## ⚠️ Notes de développement

- TypeScript partout pour une meilleure qualité de code
- Modules NestJS bien séparés (architecture modulaire)
- Hot-reload activé pour le développement
- Base de données auto-synchronisée en développement
