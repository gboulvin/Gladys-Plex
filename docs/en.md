# Plex integration

The integration creates one `Plex server` device and one device for every known Plex player. It queries `/clients` during discovery, so a player can be created even when nothing is playing. Each device provides a binary playback state, detailed status, current title, and Play, Pause and Stop controls.

The playback state is `1` while media is playing and `0` otherwise. It can be used directly as a condition in a Gladys scene.

## Real-time webhooks

Plex can send `media.play`, `media.resume`, `media.pause` and `media.stop` events to the `plex_events` webhook. This Plex capability requires Plex Pass. In Gladys, link Gladys Plus and enter its Open API key, then run **Show Plex webhook URL**. Copy the returned URL to **Plex Web > Account > Webhooks**.

When the public webhook relay is available, the integration automatically removes polling from its devices and publishes Plex playback changes as soon as they arrive. If Plex Pass, Gladys Plus or the configured webhook are unavailable, the configured polling interval remains active as a fallback.
