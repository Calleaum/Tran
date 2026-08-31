# Sons à déposer ici

Place ici 5 fichiers audio courts (formats mp3, wav ou ogg tous acceptés
par le navigateur, mais garde le nom et l'extension .mp3 pour matcher le
code, ou adapte les chemins dans `frontend/src/sound.ts`) :

- `hover.mp3`     — petit tap au survol des cartes/boutons/tuiles
- `click.mp3`     — clic net de validation dans les menus
- `card-play.mp3` — bruit de carte posée sur la table
- `pass.mp3`      — son discret pour "passer son tour"
- `success.mp3`   — jingle court pour une victoire / qualification

Sources gratuites et libres de droits suggérées :
- https://mixkit.co/free-sound-effects/ (pas d'inscription requise)
- https://pixabay.com/sound-effects/ (pas d'inscription requise)
- https://freesound.org/ (inscription gratuite, vérifier la licence CC0)

Cherche par exemple : "card flip", "card slide", "button click", "ui hover",
"success chime".

Une fois les fichiers déposés ici avec ces noms exacts, ils sont détectés
automatiquement par `frontend/src/sound.ts` — aucun autre changement de
code n'est nécessaire.
