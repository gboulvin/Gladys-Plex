# Sources externes vérifiées — Plex

## Plex Media Server API

Source : https://developer.plex.tv/pms/

- L’API peut répondre en JSON lorsque le client envoie `Accept: application/json`.
- Les headers usuels incluent `X-Plex-Client-Identifier` et `X-Plex-Token` ; le token est requis pour la plupart des endpoints.
- L’endpoint officiel `GET /status/sessions` liste les lectures en cours.
- L’endpoint officiel `POST /status/sessions/terminate` termine une session de lecture ; il requiert le paramètre `sessionId`.
- L’endpoint `GET /identity` fournit l’identité du serveur et est utilisé par l’action de test de connexion.

## Plex Webhooks

Source : https://support.plex.tv/articles/115002267687-webhooks/

- Les webhooks nécessitent Plex Pass et se configurent dans Plex Web, dans les réglages du compte.
- Plex envoie notamment les événements `media.play`, `media.resume`, `media.pause` et `media.stop`.
- Le payload est transmis par POST. Les événements avec illustration peuvent être multipart ; le JSON de l’événement est le payload utile.
- Le payload contient notamment `event`, `Player` et `Metadata`, qui suffisent à mettre à jour l’état de lecture agrégé exposé à Gladys.
