# Intégration externe Plex pour Gladys

Cette intégration, construite à partir du [template officiel JavaScript de Gladys](https://github.com/GladysAssistant/integration-template-js), connecte Gladys à un **Plex Media Server** et expose un appareil virtuel `Plex playback`.

L’appareil publie l’état de lecture courant (`playing`, `paused`, `buffering` ou absence de session), le titre en cours et des features de commande Play, Pause et Stop. Ces états peuvent donc être utilisés comme conditions de scènes Gladys.

## Configuration

Dans Gladys, renseignez l’URL du serveur Plex, par exemple `http://192.168.1.20:32400`, ainsi que le `X-Plex-Token`. Le token est envoyé dans les headers Plex avec un identifiant client stable. Le champ **Player filter** est facultatif : il accepte le titre ou l’identifiant machine du lecteur Plex. Lorsqu’il est vide, l’intégration sélectionne la première session active renvoyée par le serveur.

L’intervalle par défaut est de 30 secondes. Il peut être augmenté selon le besoin, mais un intervalle court est préférable si les scènes doivent réagir rapidement aux changements d’état.

## API utilisée

L’intégration utilise directement l’API officielle Plex Media Server. Les sessions actives sont lues avec `GET /status/sessions`. Plex documente la réponse JSON et l’authentification via `X-Plex-Token` et `X-Plex-Client-Identifier` dans sa [documentation officielle](https://developer.plex.tv/pms/).

Les commandes de lecture sont envoyées au lecteur actif via les routes de contrôle du lecteur Plex (`/player/playback/play`, `/player/playback/pause` et `/player/playback/stop`). L’API officielle documente également `POST /:/timeline`, qui sert à rapporter l’état et la position de lecture, ainsi que `POST /status/sessions/terminate` pour terminer une session côté serveur.

> Le contrôle dépend du fait que le lecteur Plex renvoie une adresse réseau joignable depuis le conteneur Gladys. La simple lecture des sessions fonctionne, elle, via l’adresse du Plex Media Server.

## Structure principale

| Fichier                             | Rôle                                                             |
| ----------------------------------- | ---------------------------------------------------------------- |
| `gladys-assistant-integration.json` | Manifeste, schéma de configuration et action de test.            |
| `src/plex.js`                       | Client HTTP Plex, parsing des sessions et fonctions de timeline. |
| `src/devices/plexPlayer.js`         | Blueprint Gladys : features, polling et commandes.               |
| `src/devices/index.js`              | Registre et routage des appareils.                               |
| `index.js`                          | Initialisation du SDK Gladys et branchement des handlers.        |
| `test/plex.test.js`                 | Tests de parsing des sessions Plex.                              |

## Développement local

```bash
npm install
npm run format:check
npm run lint
npm test
```

Pour lancer l’intégration dans un environnement Gladys local :

```bash
GLADYS_HOST_API_URL="http://localhost:1443" \
GLADYS_INTEGRATION_TOKEN="<token Gladys>" \
GLADYS_INTEGRATION_SELECTOR="plex" \
LOG_LEVEL=debug \
npm start
```

## Références

1. [Plex Media Server API — documentation officielle](https://developer.plex.tv/pms/)
2. [Template officiel d’intégration JavaScript Gladys](https://github.com/GladysAssistant/integration-template-js)
3. [node-plex-api — projet de référence secondaire](https://github.com/phillipj/node-plex-api)

## Licence

Apache-2.0
