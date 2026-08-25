# Plex

The integration publishes one virtual **Plex server** device in Gladys Discovery. After adding it, use **Playback state** in a scene: `1` means that a Plex session is playing and `0` means it is paused, stopped, or absent. **Stop playback** terminates the active session server-side.

## Near-real-time updates

The integration opens a local Plex Media Server WebSocket. Playback notifications trigger a `/status/sessions` read after a short coalescing delay, so the authoritative state is usually published without waiting for fallback polling. If the socket cannot connect or closes, it reconnects with capped exponential backoff while polling remains active.

The **Fallback refresh interval** controls this polling between 2 and 60 seconds, with a default of 10 seconds. Unchanged values are deduplicated. Reads time out after 5 seconds, and the integration reports a lost connection only after three consecutive failures, avoiding connection status flapping during a transient network issue.

## Connect to Plex

Enter the Plex Media Server LAN URL, for example `http://192.168.1.20:32400`, and your `X-Plex-Token`. Do not use `localhost`, which points to the integration container. If Plex and Gladys share a Docker network, use the Plex service name instead, for example `http://plex:32400`.

The **Test Plex connection** action calls `/identity`. Then open Gladys Discovery and add the `Plex server` device.

## Optional Plex webhooks

Plex webhooks are optional because the local socket already provides the primary real-time path. With Plex Pass, use **Show Plex webhook URL** and paste it in **Plex Web → Account → Webhooks**. The `media.play`, `media.resume`, `media.pause`, and `media.stop` events update the state immediately, followed by a session refresh to confirm it.

See the official [Plex Media Server documentation](https://developer.plex.tv/pms/) and [Plex webhook documentation](https://support.plex.tv/articles/115002267687-webhooks/) for API details.
