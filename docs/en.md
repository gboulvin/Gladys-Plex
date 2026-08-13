# Plex integration

Configure the Plex Media Server URL, an `X-Plex-Token`, a stable client identifier and an optional player filter. The integration creates one `Plex playback` device in Gladys.

The device polls `GET /status/sessions` and publishes the current playback state and title. The state is available to Gladys scenes, so a scene can react when playback starts or stops. Play, Pause and Stop features send commands to the active Plex player returned by the session.

The official Plex API documentation is available at https://developer.plex.tv/pms/. The Plex player must expose a network address reachable from the Gladys integration container for remote commands to work.
