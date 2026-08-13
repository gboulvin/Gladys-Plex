# Intégration Plex pour Gladys

Cette intégration externe relie un Plex Media Server local à Gladys. Elle publie un unique appareil virtuel, **Plex server**, dont l’état de lecture est immédiatement utilisable dans les scènes Gladys. La valeur est `1` lorsqu’au moins une session Plex est en lecture et `0` dans les autres cas. La commande **Stop playback** termine la session active sélectionnée par le serveur.

| Fonction                        | Mécanisme                                                                 | Limite volontaire                                                       |
| ------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| État de lecture pour les scènes | `GET /status/sessions`, toutes les 60 secondes                            | Une seule valeur agrégée pour le serveur                                |
| Mise à jour temps réel          | Webhooks Plex `media.play`, `media.resume`, `media.pause` et `media.stop` | Nécessite Plex Pass et le relais webhook Gladys                         |
| Arrêt de lecture                | `POST /status/sessions/terminate`                                         | Arrête la première session en lecture, sinon la première session active |

> L’intégration ne crée pas les appareils automatiquement. Elle les **publie** à l’écran Découverte de Gladys, puis l’utilisateur décide de les ajouter, conformément au modèle des intégrations externes Gladys.

## Configuration

Renseignez l’URL réseau du Plex Media Server, par exemple `http://192.168.1.20:32400`, et un `X-Plex-Token`. N’utilisez pas `localhost` : l’intégration tourne dans son propre conteneur, où cette adresse ne correspond pas à la machine Plex. Si Plex et Gladys partagent un réseau Docker, utilisez le nom DNS du service Plex, par exemple `http://plex:32400`.

L’action **Tester la connexion Plex** interroge `GET /identity`. Une fois l’intégration démarrée, lancez la Découverte dans Gladys et ajoutez l’appareil `Plex server`. Le polling de secours est fixé à 60 secondes, une valeur admise par Gladys ; il reste utile si les webhooks ne sont pas disponibles.

## Webhooks Plex

Les webhooks Plex sont une fonctionnalité Plex Pass. Dans Gladys, utilisez l’action **Afficher l’URL webhook Plex**, puis copiez l’URL fournie dans **Plex Web → Compte → Webhooks**. Plex transmet les événements de lecture dans une requête `POST`, potentiellement multipart : l’intégration analyse le payload et met immédiatement à jour l’état binaire de lecture.

| Événement Plex                 | État publié par Gladys |
| ------------------------------ | ---------------------- |
| `media.play` ou `media.resume` | `1`                    |
| `media.pause` ou `media.stop`  | `0`                    |

La stratégie se limite volontairement à l’état binaire nécessaire aux scènes. Elle n’expose ni titre texte ni appareils par lecteur, afin d’éviter les incompatibilités de type, de bornes ou de format d’état qui empêcheraient Gladys d’enregistrer l’appareil.

## Contrats et contrôles

L’implémentation s’appuie sur l’API Plex officielle : les réponses JSON sont demandées avec `Accept: application/json`, l’authentification utilise les headers `X-Plex-Client-Identifier` et `X-Plex-Token`, les sessions sont lues via `/status/sessions`, et l’arrêt utilise `/status/sessions/terminate`. Les tests du dépôt vérifient en plus les règles Gladys critiques : préfixes des IDs externes, catégories et types connus, bornes `min`/`max`, fréquence de polling autorisée, et états exclusivement numériques.

```bash
npm ci
npm run format:check
npm run lint
npm test
npx github:GladysAssistant/integration-store .
```

## Références

[Documentation Plex Media Server](https://developer.plex.tv/pms/) et [documentation Plex Webhooks](https://support.plex.tv/articles/115002267687-webhooks/).
