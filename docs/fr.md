# Plex

L’intégration publie un appareil virtuel **Plex server** dans la Découverte Gladys. Ajoutez cet appareil pour utiliser sa fonctionnalité **Playback state** dans une scène : la valeur vaut `1` si Plex lit un média et `0` s’il est en pause, arrêté ou sans session. La fonctionnalité **Stop playback** arrête la session Plex active.

## Connexion au serveur Plex

Saisissez l’adresse réseau du Plex Media Server, par exemple `http://192.168.1.20:32400`, ainsi que votre `X-Plex-Token`. N’utilisez pas `localhost` : l’intégration est exécutée dans un conteneur distinct. Si Plex fonctionne dans le même réseau Docker que Gladys, utilisez le nom du service Docker, par exemple `http://plex:32400`.

L’action **Tester la connexion Plex** vérifie l’endpoint Plex `/identity`. Une fois la configuration enregistrée, ouvrez l’onglet Découverte de Gladys et ajoutez l’appareil `Plex server`.

## État de lecture et scènes

L’intégration vérifie les sessions via l’API officielle Plex toutes les 60 secondes. Les scènes Gladys peuvent employer la valeur numérique de **Playback state** ; par exemple, déclenchez une ambiance cinéma lorsque la valeur devient `1` et restaurez l’ambiance lorsque sa valeur devient `0`.

## Webhooks temps réel

Les webhooks Plex nécessitent Plex Pass. Utilisez l’action **Afficher l’URL webhook Plex**, puis collez l’URL obtenue dans **Plex Web → Compte → Webhooks**. Les événements `media.play`, `media.resume`, `media.pause` et `media.stop` mettent immédiatement à jour l’état de lecture dans Gladys. Le polling de 60 secondes demeure un secours si le relais webhook n’est pas disponible.

## Dépannage

Une erreur de connexion refusée indique que l’URL ou le port Plex ne sont pas accessibles depuis l’hôte Gladys. Vérifiez que le port 32400 est ouvert, que l’adresse est l’adresse LAN de la machine Plex, puis relancez l’action de test. Si aucun événement temps réel n’arrive, vérifiez le Plex Pass, l’URL enregistrée dans Plex Web et la disponibilité du relais webhook Gladys.

Consultez la [documentation officielle Plex Media Server](https://developer.plex.tv/pms/) et la [documentation officielle des webhooks Plex](https://support.plex.tv/articles/115002267687-webhooks/) pour les détails de l’API.
