# Soutenances de stage

Planification des soutenances de stage de 3A pour la scolarité de l'École d'ingénieurs de Castelmont. La scolarité place chaque soutenance elle-même ; l'application vérifie toutes les règles avant l'enregistrement et signale chaque erreur.

NestJS + Prisma (SQLite) pour l'API, React pour le front, TypeScript partout.

## Démarrer

Prérequis : Docker (Docker Desktop lancé), avec Compose v2.

```sh
docker compose up
```

Rien d'autre à faire : pas de `.env` à créer. Au premier lancement, compose construit les images, applique les migrations, remplit la base avec les données de démonstration, puis démarre l'API et le front.

| Service | Adresse |
|---|---|
| Front | http://localhost:8080 |
| API | http://localhost:3000 |
| Santé de l'API | http://localhost:3000/health (répond 200) |
| Documentation de l'API (Swagger) | http://localhost:3000/docs |

Arrêter : `docker compose down`. Les données sont gardées dans le volume `data` et survivent aux redémarrages ; le seed ne réécrit jamais une base déjà remplie. Repartir de zéro : `docker compose down -v`.

## Comptes de démonstration

Mot de passe des trois comptes : `soutenance2027`

| Rôle | Identifiant (e-mail) | Ce qu'il voit |
|---|---|---|
| `ADMIN` (la scolarité) | `admin@castelmont.fr` | tout : session, personnes, comptes, disponibilités, placement, tuteurs entreprise |
| `ENSEIGNANT` | `margaux.mercier@castelmont.fr` | ses soutenances jour par jour, ses indisponibilités |
| `ELEVE` | `clara.muller@etu.castelmont.fr` | sa soutenance : créneau, salle, lien de visio, jury |

Il n'y a pas d'inscription publique. Pour créer un autre compte : se connecter en admin, page **Comptes**, choisir le rôle (Enseignant ou Élève), la personne (parmi celles qui n'ont pas encore de compte) et un mot de passe initial de 8 caractères au moins. L'identifiant est l'e-mail de la personne.

Les tuteurs entreprise n'ont pas de compte : la scolarité copie leur planning dans un e-mail (page **Tuteurs entreprise**).

### Données de démonstration

La semaine du lundi 21 au vendredi 25 juin 2027 ; 4 salles (A à D), les salles C et D fermées le jeudi après-midi ; 60 créneaux de 40 minutes ; 35 enseignants, chacun tuteur académique de 2 à 4 élèves ; 100 élèves dans 65 entreprises, dont plusieurs partagent un tuteur entreprise ; 25 enseignants ont saisi leurs indisponibilités ; 10 soutenances déjà placées, toutes valides.

## Les fonctionnalités

| | Qui | Où |
|---|---|---|
| **F1** Recueillir les disponibilités : session (semaine, salles, liens, fermeture du jeudi), entreprises, tuteurs, enseignants, élèves, comptes ; les enseignants cochent les demi-journées où ils ne sont **pas** disponibles ; vue « qui a répondu » | admin, enseignant | `/admin/session`, `/admin/entreprises`, `/admin/enseignants`, `/admin/eleves`, `/admin/comptes`, `/admin/disponibilites`, `/enseignant` |
| **F2** Placement manuel avec vérification : grille jour par jour (créneaux × salles), élèves restant à placer, vérification en direct de toutes les règles, déplacement, suppression | admin | `/admin/placement` |
| **F3** Afficher le planning à chacun | élève, enseignant, admin | `/eleve`, `/enseignant`, `/admin/tuteurs` |

Les règles vérifiées à chaque placement et à chaque déplacement :

| # | Règle | Effet |
|---|---|---|
| 1 | Un enseignant du jury est déjà dans une autre soutenance à ce créneau | bloque |
| 2 | Un enseignant du jury est indisponible cette demi-journée | avertit (« Placer quand même ») |
| 3 | La salle est déjà occupée à ce créneau | bloque |
| 4 | La salle est fermée (jeudi après-midi) | bloque |
| 5 | Un enseignant dépasserait 6 soutenances dans la journée | avertit (« Placer quand même ») |
| 6 | Le tuteur entreprise est déjà dans une autre soutenance à ce créneau | bloque |
| 7 | Règle de la même entreprise : le second enseignant est le tuteur académique d'un autre élève de la même entreprise | bloque |
| 8 | Le second enseignant est le tuteur académique de l'élève | bloque |
| 9 | L'élève a déjà une soutenance | bloque |

Le jury : le tuteur académique de l'élève, un second enseignant choisi par la scolarité, le tuteur entreprise de l'élève.

## Les tests

Ni base de données ni Docker ne sont nécessaires pour `npm test`.

```sh
cd api
npm install
npm test            # tests unitaires et HTTP, Prisma simulé

cd ../web
npm install
npm test            # tests des composants et des pages, API simulée
```

Deux autres vérifications, en plus :

```sh
cd api
npm run test:e2e    # le parcours complet sur une vraie base SQLite jetable (api/e2e.db), sans Docker

cd ..
npm run check       # démarre toute la pile avec Docker et vérifie ce que voit un utilisateur
```

## Développer sans Docker

Node 26 est nécessaire.

```sh
cd api
cp .env.example .env
npm install
npx prisma migrate deploy
npm run db:seed
npm run start:dev   # http://localhost:3000

cd ../web
npm install
npm run dev         # http://localhost:5173
```

## Organisation du dépôt

```
compose.yaml        migrate (migrations + seed, puis s'arrête) → api (healthcheck sur /health) → web (nginx)
check.mjs           npm run check : vérifie toute la pile démarrée par compose
api/                NestJS + Prisma
  prisma/           schéma, migrations, seed
  src/defenses/     conflicts.ts : la vérification des 9 règles, une fonction pure
  test/             npm test
  test-e2e/         npm run test:e2e
web/                React + Vite, servi par nginx dans l'image
```

## Dépannage

| Problème | Solution |
|---|---|
| `Cannot connect to the Docker daemon` | Lancer Docker Desktop |
| `port is already allocated` | Un autre programme utilise le port 3000 ou 8080 : l'arrêter. Changer le port de l'API demande aussi de changer `VITE_API_URL` et `WEB_ORIGIN` dans `compose.yaml` |
| `docker compose ps` montre `migrate` en `Exited (1)` | `docker compose logs migrate` donne la raison ; puis `docker compose down -v` et `docker compose up` |
| Repartir de données neuves | `docker compose down -v`, puis `docker compose up` |
