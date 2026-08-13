# Intégration Plex

L’intégration crée un appareil `Plex server` et un appareil par lecteur Plex connu. Configurez l’adresse LAN du Plex Media Server, par exemple `http://192.168.1.20:32400`, et non `localhost`, qui désigne le conteneur de l’intégration. La découverte appelle `/clients`, donc les lecteurs peuvent apparaître même si aucune lecture n’est active. Chaque appareil expose un état de lecture binaire, un statut texte, le titre courant et les commandes Play, Pause et Stop.

L’état de lecture vaut `1` pendant une lecture et `0` dans les autres cas. Il est directement exploitable dans une scène Gladys pour déclencher, par exemple, une ambiance cinéma.

## Webhooks temps réel

Plex peut envoyer les événements `media.play`, `media.resume`, `media.pause` et `media.stop` au webhook `plex_events`. Cette fonction nécessite Plex Pass. Dans Gladys, associez Gladys Plus et renseignez la clé Open API, puis utilisez l’action **Afficher l’URL webhook Plex**. Copiez l’URL affichée dans **Plex Web > Compte > Webhooks**.

Lorsque le relais webhook est disponible, l’intégration retire automatiquement le polling des appareils et publie les changements d’état dès la réception des événements Plex. Si Plex Pass, Gladys Plus ou le webhook ne sont pas disponibles, l’intégration utilise le polling configuré comme mécanisme de secours.
