# Intégration Plex pour Gladys

Cette intégration externe relie un Plex Media Server local à Gladys. Elle publie un unique appareil virtuel, **Plex server**, qui représente **la session Plex active sélectionnée** : une lecture en cours est prioritaire ; sinon, la première session active est retenue.

| Fonction                    | Feature Gladys                  | Comportement                                                        |
| --------------------------- | ------------------------------- | ------------------------------------------------------------------- |
| Démarrer et mettre en pause | `Play`, `Pause`                 | Commande envoyée au lecteur de la session active                    |
| Navigation de file          | `Previous`, `Next`              | Passe à l’élément précédent ou suivant lorsque le lecteur le permet |
| Arrêt                       | `Stop`                          | Termine la session active côté serveur                              |
| Volume                      | `Volume`                        | Valeur de `0` à `100`, lue lorsqu’elle est fournie par Plex         |
| Retours                     | `Playback state`, `Now playing` | État binaire pour les scènes et titre courant                       |

> Les commandes Play, Pause, Previous, Next et Volume ciblent le `X-Plex-Target-Client-Identifier` du lecteur attaché à la session active. Elles constituent une interface de test : leur disponibilité dépend de la capacité du client Plex (TV, navigateur, mobile, Plexamp…) à accepter le contrôle à distance. Stop reste disponible dès qu’une session active peut être terminée côté serveur.

## Synchronisation rapide et fiabilité

La synchronisation prioritaire utilise le WebSocket Plex documenté `/:/websocket/notifications`. À chaque événement `playing`, elle coalesce les signaux pendant 250 ms puis relit `/status/sessions`, qui reste la source de vérité. La connexion se reconnecte avec un délai exponentiel plafonné à une minute ; un polling configurable de 2 à 60 secondes, réglé à 10 secondes par défaut, reste actif en secours.

Les états et titres inchangés sont dédupliqués. Les requêtes de lecture expirent après 5 secondes, les commandes après 2,5 secondes, et la connexion est considérée perdue seulement après trois échecs consécutifs afin d’éviter des changements de statut lors d’une microcoupure.

## Configuration et découverte

Renseignez l’URL réseau du Plex Media Server, par exemple `http://192.168.1.20:32400`, et un `X-Plex-Token`. N’utilisez pas `localhost`, qui désigne le conteneur de l’intégration. Si Plex et Gladys partagent un réseau Docker, utilisez le nom DNS du service Plex, par exemple `http://plex:32400`.

L’action **Tester la connexion Plex** appelle `/identity`. Une fois la connexion validée, ouvrez la Découverte Gladys et ajoutez l’appareil `Plex server`. Pour tester les boutons multimédia, démarrez d’abord une lecture Plex puis utilisez les commandes sur l’appareil ajouté.

## Webhooks Plex facultatifs

Les webhooks Plex sont facultatifs car le socket local constitue la voie temps réel principale. Avec Plex Pass, utilisez **Afficher l’URL webhook Plex**, puis copiez l’URL dans **Plex Web → Compte → Webhooks**. Les événements `media.play`, `media.resume`, `media.pause` et `media.stop` mettent immédiatement à jour l’état et le titre, avant une vérification par `/status/sessions`.

## Qualité et références

Les tests couvrent les contrats d’appareils Gladys, les types de features, les bornes, les valeurs texte et numériques, le routage des commandes, le volume, les délais réseau, la déduplication et la concurrence entre WebSocket et polling.

```bash
npm ci
npm run format:check
npm run lint
npm test
npx github:GladysAssistant/integration-store .
```

Consultez la [documentation officielle Plex Media Server](https://developer.plex.tv/pms/), la [documentation officielle des webhooks Plex](https://support.plex.tv/articles/115002267687-webhooks/) et le code de référence de contrôle client [guim31/gladys-plex](https://github.com/guim31/gladys-plex).
