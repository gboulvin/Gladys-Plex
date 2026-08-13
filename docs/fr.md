# Intégration Plex

Configurez l’URL du Plex Media Server, un `X-Plex-Token`, un identifiant client stable et, si nécessaire, un filtre de lecteur. L’intégration crée un appareil `Plex playback` dans Gladys.

L’appareil interroge `GET /status/sessions` et publie l’état de lecture ainsi que le titre courant. Cet état est disponible dans les scènes Gladys, qui peuvent donc réagir au démarrage, à la pause ou à l’arrêt d’une lecture. Les features Play, Pause et Stop envoient les commandes au lecteur Plex actif renvoyé par la session.

La documentation officielle de l’API Plex est disponible à l’adresse https://developer.plex.tv/pms/. Le lecteur Plex doit exposer une adresse réseau joignable depuis le conteneur de l’intégration Gladys pour que les commandes distantes fonctionnent.
