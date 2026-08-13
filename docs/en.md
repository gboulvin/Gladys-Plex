# Plex

The integration publishes one virtual **Plex server** device in Gladys Discovery. Add it to use its **Playback state** in a scene: the value is `1` while Plex is playing media and `0` while it is paused, stopped, or has no session. **Stop playback** terminates the active Plex session.

## Connect to Plex

Enter the Plex Media Server LAN URL, for example `http://192.168.1.20:32400`, and your `X-Plex-Token`. Do not use `localhost`: the integration runs in a separate container. If Plex shares a Docker network with Gladys, use the Plex service name instead, for example `http://plex:32400`.

The **Test Plex connection** action calls the Plex `/identity` endpoint. Once the configuration is saved, open Gladys Discovery and add the `Plex server` device.

## Playback state and scenes

The integration reads sessions from the official Plex API every 60 seconds. Gladys scenes can use the numeric **Playback state**; for example, start a cinema scene when it becomes `1` and restore the room state when it becomes `0`.

## Real-time webhooks

Plex webhooks require Plex Pass. Use **Show Plex webhook URL** and paste the returned URL in **Plex Web → Account → Webhooks**. The `media.play`, `media.resume`, `media.pause`, and `media.stop` events immediately update Gladys. The 60-second polling remains available as a fallback when the webhook relay is unavailable.

## Troubleshooting

A refused connection means the Plex URL or port cannot be reached from the Gladys host. Check that port 32400 is reachable and that the configured URL is the Plex machine LAN address, then run the test action again. If real-time events do not arrive, check Plex Pass, the webhook URL saved in Plex Web, and the Gladys webhook relay availability.

See the official [Plex Media Server documentation](https://developer.plex.tv/pms/) and [Plex webhook documentation](https://support.plex.tv/articles/115002267687-webhooks/) for API details.
