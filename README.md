# Intégration externe Plex pour Gladys

Cette intégration, construite à partir du [template officiel JavaScript de Gladys](https://github.com/GladysAssistant/integration-template-js), connecte Gladys à un **Plex Media Server** et crée un appareil `Plex server` ainsi qu’un appareil pour chaque lecteur Plex connu. Les lecteurs sont découverts via l’endpoint Plex `/clients`, même lorsqu’aucun média n’est en cours de lecture.

Chaque appareil publie un état binaire de lecture, un statut détaillé et le titre courant. L’état binaire vaut `1` pendant une lecture et `0` en pause, arrêté ou sans lecture ; il peut être utilisé directement comme condition dans les scènes Gladys. Les appareils offrent aussi les commandes Play, Pause et Stop lorsque le lecteur est joignable par le conteneur Gladys.

## Configuration de base

Renseignez l’URL du Plex Media Server, par exemple `http://192.168.1.20:32400`, et le `X-Plex-Token`. Le token est envoyé avec un identifiant client stable. Le filtre de lecteur est facultatif : il cible le titre ou l’identifiant machine d’un lecteur pour l’appareil agrégé `Plex server`.

Le polling configuré par défaut à 30 secondes constitue un **secours**. Il est automatiquement retiré des appareils dès que le relais webhook Gladys est disponible.

## Webhooks Plex en temps réel

Plex envoie les événements `media.play`, `media.resume`, `media.pause` et `media.stop` sous la forme d’une requête `POST` multipart contenant un champ JSON `payload`. Cette intégration les accepte via le webhook `plex_events` et met aussitôt à jour le lecteur concerné ainsi que l’appareil `Plex server`. La documentation Plex précise que cette fonctionnalité requiert un abonnement **Plex Pass** et se configure dans **Plex Web > Account > Webhooks**. [1]

Dans Gladys, associez Gladys Plus et renseignez la clé Open API demandée par la section webhooks de l’intégration. Cliquez ensuite sur **Afficher l’URL webhook Plex**, puis copiez l’URL retournée dans **Plex Web > Account > Webhooks**. Dès que le relais public est disponible, les appareils sont republiés sans fréquence de polling.

> Sans Plex Pass, sans Gladys Plus, ou tant que l’URL n’est pas ajoutée dans Plex, l’intégration reste pleinement opérationnelle grâce au polling de secours.

## API et structure

L’intégration utilise `GET /clients` pour créer les lecteurs, `GET /status/sessions` pour les réconcilier avec l’état de lecture et les headers `X-Plex-Token` / `X-Plex-Client-Identifier` pour l’authentification. [2]

| Fichier                             | Rôle                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------- |
| `src/plex.js`                       | Client HTTP Plex : identité, clients et sessions.                          |
| `src/devices/plexPlayer.js`         | Découverte persistante, publication d’états, commandes et parsing webhook. |
| `index.js`                          | Connexion Gladys, scan, fallback de polling et relayage `plex_events`.     |
| `gladys-assistant-integration.json` | Manifeste, webhooks et actions de configuration.                           |
| `test/players.test.js`              | Tests de découverte sans lecture active et de payloads multipart Plex.     |

## Développement local

```bash
npm install
npm run format:check
npm run lint
npm test
```

## Références

[1] [Plex Support — Webhooks](https://support.plex.tv/articles/115002267687-webhooks/)

[2] [Plex Media Server API — documentation officielle](https://developer.plex.tv/pms/)

[3] [Template officiel d’intégration JavaScript Gladys](https://github.com/GladysAssistant/integration-template-js)

## Licence

Apache-2.0
