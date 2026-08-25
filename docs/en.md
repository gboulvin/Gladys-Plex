# Plex

The integration publishes one virtual **Plex server** device in Gladys Discovery. It represents the active Plex session: a playing session takes priority; otherwise the first active session is selected.

| Feature                             | Behaviour                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| `Play`, `Pause`, `Previous`, `Next` | Controls the player attached to the active session                             |
| `Stop`                              | Terminates the active session server-side                                      |
| `Volume`                            | Sets volume between `0` and `100`, and publishes it when Plex provides a value |
| `Playback state`                    | `1` while playing, otherwise `0`; usable in scenes                             |
| `Now playing`                       | Current media title                                                            |

## Command testing

Start Plex playback, then add `Plex server` from Gladys Discovery. Play, Pause, Previous, Next, and Volume target that session’s player through its Plex identifier. Availability depends on the client: some Plex players do not accept remote control. Stop does not need direct player control because it terminates the session server-side.

## Near-real-time updates

The integration opens a local Plex Media Server WebSocket. Playback notifications trigger a `/status/sessions` read after a short coalescing delay. If the socket closes, it reconnects with capped exponential backoff while fallback polling continues. **Fallback refresh interval** controls polling between 2 and 60 seconds, with a default of 10 seconds.

Unchanged values are deduplicated. Reads time out after 5 seconds, commands after 2.5 seconds, and the integration reports a lost connection only after three consecutive failures.

## Connect to Plex and webhooks

Enter the Plex Media Server LAN URL, for example `http://192.168.1.20:32400`, and your `X-Plex-Token`. Do not use `localhost`, which points to the integration container. If Plex and Gladys share a Docker network, use the Plex service name instead, for example `http://plex:32400`.

Webhooks are optional because the local socket is the primary real-time route. With Plex Pass, use **Show Plex webhook URL** and paste it in **Plex Web → Account → Webhooks**. The `media.play`, `media.resume`, `media.pause`, and `media.stop` events immediately update playback state and title.

See the official [Plex Media Server documentation](https://developer.plex.tv/pms/) and [Plex webhook documentation](https://support.plex.tv/articles/115002267687-webhooks/) for API details.
