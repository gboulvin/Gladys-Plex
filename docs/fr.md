# Plex

L’intégration publie un appareil virtuel **Plex server** dans la Découverte Gladys. Après l’avoir ajouté, utilisez **Playback state** dans vos scènes : `1` signifie qu’une session Plex est en lecture et `0` signifie qu’elle est en pause, arrêtée ou absente. **Stop playback** termine la session active côté serveur.

## Mise à jour quasi immédiate

L’intégration ouvre une connexion WebSocket locale vers le Plex Media Server. Les notifications de lecture déclenchent une lecture de `/status/sessions` après une courte coalescence, afin de publier l’état réel sans attendre le rafraîchissement de secours. Si le socket est inaccessible ou se coupe, il se reconnecte avec un délai exponentiel ; le polling continue pendant ce temps.

Le champ **Intervalle de secours** règle ce polling entre 2 et 60 secondes, avec 10 secondes par défaut. Les valeurs inchangées ne sont pas republiées. Les requêtes de lecture expirent après 5 secondes et l’intégration ne signale une perte de contact qu’après trois échecs consécutifs, ce qui évite les changements de statut dus à une microcoupure.

## Connexion Plex

Saisissez l’adresse LAN du Plex Media Server, par exemple `http://192.168.1.20:32400`, ainsi que votre `X-Plex-Token`. N’utilisez pas `localhost`, qui désigne le conteneur de l’intégration. Si Plex et Gladys sont dans le même réseau Docker, utilisez le nom du service Plex, par exemple `http://plex:32400`.

L’action **Tester la connexion Plex** appelle `/identity`. Ensuite, ouvrez Découverte dans Gladys et ajoutez `Plex server`.

## Webhooks Plex

Les webhooks Plex sont facultatifs car le socket local fournit déjà la voie temps réel. Avec Plex Pass, utilisez **Afficher l’URL webhook Plex**, puis copiez l’URL dans **Plex Web → Compte → Webhooks**. Les événements `media.play`, `media.resume`, `media.pause` et `media.stop` mettent immédiatement à jour l’état, puis l’intégration vérifie les sessions pour confirmer la valeur.

Pour plus de détails, consultez la [documentation officielle Plex Media Server](https://developer.plex.tv/pms/) et la [documentation officielle des webhooks Plex](https://support.plex.tv/articles/115002267687-webhooks/).
