# Intégration Plex pour Gladys

Cette intégration externe relie un Plex Media Server local à Gladys. Elle publie un unique appareil virtuel, **Plex server**, dont la valeur **Playback state** est directement exploitable dans les scènes : `1` lorsqu’une session est en lecture et `0` dans les autres cas. La commande **Stop playback** termine côté serveur la session active sélectionnée.

| Fonction                        | Voie principale                                                                         | Repli et comportement                                            |
| ------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| État de lecture pour les scènes | Socket de notifications Plex, suivi d’une lecture immédiate de `/status/sessions`       | Rafraîchissement configurable, toutes les 10 secondes par défaut |
| Webhooks Plex                   | Événements `media.play`, `media.resume`, `media.pause`, `media.stop` relayés par Gladys | Optionnel ; le socket local ne nécessite pas Gladys Plus         |
| Arrêt de lecture                | `POST /status/sessions/terminate`                                                       | Délai limité à 2,5 secondes pour ne pas bloquer Gladys           |

> Gladys conserve la création d’appareils comme geste utilisateur. L’intégration publie `Plex server` dans l’écran Découverte ; ajoutez-le ensuite pour utiliser ses features.

## Synchronisation rapide et fiabilité

La synchronisation prioritaire utilise le WebSocket Plex documenté `/:/websocket/notifications`. À chaque événement `playing`, elle coalesce les signaux reçus pendant 250 ms puis relit `/status/sessions`, qui reste la source de vérité. Ainsi, un changement de lecture se répercute normalement sans attendre le cycle de secours. La connexion WebSocket se reconnecte avec un délai exponentiel plafonné à une minute ; pendant toute indisponibilité, le rafraîchissement périodique continue.

L’intervalle **Fallback refresh interval** est réglable entre 2 et 60 secondes, avec une valeur par défaut de 10 secondes. Les états identiques sont dédupliqués : le polling n’encombre donc ni Gladys ni l’historique tant que l’état n’a pas changé. Les requêtes de lecture expirent après 5 secondes et une connexion n’est considérée perdue qu’après trois échecs consécutifs, ce qui évite les statuts instables lors d’un incident réseau ponctuel.

## Configuration

Renseignez l’URL réseau du Plex Media Server, par exemple `http://192.168.1.20:32400`, et un `X-Plex-Token`. N’utilisez pas `localhost` : l’intégration s’exécute dans son propre conteneur. Si Plex et Gladys partagent un réseau Docker, employez le nom DNS du service Plex, par exemple `http://plex:32400`.

L’action **Tester la connexion Plex** appelle `/identity`. Une fois la connexion validée, ouvrez l’écran Découverte Gladys et ajoutez l’appareil `Plex server`. Dans une scène, utilisez **Playback state = 1** pour déclencher une ambiance cinéma et **Playback state = 0** pour la restaurer.

## Webhooks Plex facultatifs

Les webhooks Plex sont une fonctionnalité Plex Pass. Utilisez l’action **Afficher l’URL webhook Plex**, puis copiez l’URL dans **Plex Web → Compte → Webhooks**. Le webhook met immédiatement à jour la valeur binaire, puis une vérification de sessions est programmée pour conserver une valeur autoritative.

| Événement Plex                 | État Gladys |
| ------------------------------ | ----------- |
| `media.play` ou `media.resume` | `1`         |
| `media.pause` ou `media.stop`  | `0`         |

## Qualité et références

Les tests vérifient les contrats Gladys d’appareils et d’états, les délais réseau, la déduplication, la concurrence entre WebSocket et polling, les payloads webhooks et la reconnexion du canal temps réel.

```bash
npm ci
npm run format:check
npm run lint
npm test
npx github:GladysAssistant/integration-store .
```

Consultez la [documentation officielle Plex Media Server](https://developer.plex.tv/pms/) et la [documentation officielle des webhooks Plex](https://support.plex.tv/articles/115002267687-webhooks/).
