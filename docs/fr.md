# Plex

L’intégration publie un appareil virtuel **Plex server** dans la Découverte Gladys. Il représente la session Plex active : une session en lecture est choisie en priorité, sinon l’intégration retient la première session active.

| Feature                             | Utilisation                                                                             |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| `Play`, `Pause`, `Previous`, `Next` | Commande le lecteur attaché à la session active                                         |
| `Stop`                              | Termine la session active côté serveur                                                  |
| `Volume`                            | Règle le volume entre `0` et `100` et publie sa valeur lorsqu’elle est fournie par Plex |
| `Playback state`                    | `1` pendant la lecture, `0` autrement ; utilisable dans les scènes                      |
| `Now playing`                       | Titre de l’élément en cours                                                             |

## Tests de commandes

Démarrez une lecture Plex, puis ajoutez `Plex server` depuis la Découverte Gladys. Les boutons Play, Pause, Previous, Next et Volume ciblent le lecteur de cette session par son identifiant Plex. Leur disponibilité dépend du client : certains lecteurs Plex peuvent ne pas accepter le contrôle à distance. Stop fonctionne indépendamment du contrôle direct en terminant la session côté serveur.

## Mise à jour quasi immédiate

L’intégration ouvre une connexion WebSocket locale vers le Plex Media Server. Les notifications de lecture déclenchent une lecture de `/status/sessions` après une courte coalescence. Si le socket se coupe, il se reconnecte avec un délai exponentiel et le polling de secours continue. Le champ **Intervalle de secours** règle ce polling entre 2 et 60 secondes, avec 10 secondes par défaut.

Les valeurs inchangées sont dédupliquées. Les requêtes de lecture expirent après 5 secondes, les commandes après 2,5 secondes et l’intégration ne signale une perte de contact qu’après trois échecs consécutifs.

## Connexion Plex et webhooks

Saisissez l’adresse LAN du Plex Media Server, par exemple `http://192.168.1.20:32400`, ainsi que votre `X-Plex-Token`. N’utilisez pas `localhost`, qui désigne le conteneur de l’intégration. Si Plex et Gladys sont dans le même réseau Docker, utilisez le nom du service Plex, par exemple `http://plex:32400`.

Les webhooks sont facultatifs, le socket local étant la voie temps réel principale. Avec Plex Pass, utilisez **Afficher l’URL webhook Plex**, puis copiez l’URL dans **Plex Web → Compte → Webhooks**. Les événements `media.play`, `media.resume`, `media.pause` et `media.stop` actualisent immédiatement l’état et le titre.

Pour plus de détails, consultez la [documentation officielle Plex Media Server](https://developer.plex.tv/pms/) et la [documentation officielle des webhooks Plex](https://support.plex.tv/articles/115002267687-webhooks/).
