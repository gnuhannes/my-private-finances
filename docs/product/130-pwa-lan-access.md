# 130 — PWA + LAN Mobile Access

## Status: Mid-term 💡

## Goal

Use the full app on an Android phone without any native packaging. Two parts: make the web app installable as a PWA, and let the desktop app optionally expose the API on the local network.

## Part 1: Progressive Web App

Add to the React app:

- **`public/manifest.json`** — app name, icons, theme colour, `display: standalone`
- **Service worker** (Workbox) — caches the app shell so the UI loads instantly even when the server is slow; read-only offline mode when the backend is unreachable

The Vite PWA plugin (`vite-plugin-pwa`) handles both with minimal configuration.

After this, visiting the app URL in Chrome on Android and tapping "Add to Home Screen" installs it as a proper icon with no browser chrome.

## Part 2: LAN Mode

The Tauri desktop app (110) adds a setting: **"Allow access from local network"** (default: off).

When enabled:
- The FastAPI sidecar binds to `0.0.0.0:5179` instead of `127.0.0.1:5179`
- The system tray shows the LAN IP address for easy access
- Basic auth or a one-time PIN is shown in the tray (prevents other devices on the same network from accessing the data without the PIN)

Mobile workflow:
1. Enable LAN mode on desktop
2. Phone opens `http://192.168.1.x:5179` in Chrome
3. Install as PWA
4. Use the full app — reads and writes go directly to the desktop's SQLite

## Limitations

- Requires both devices on the same WiFi network
- If the desktop is off or asleep, the phone has no data access (PWA shell loads but all queries fail)
- Read-only offline mode only (cached views from last session)
- Not suitable for use away from home → see 140 (Syncthing) for that

## Security Considerations

- LAN mode is opt-in and disabled by default
- PIN/token shown in desktop tray must be entered on first mobile access
- The FastAPI API has no authentication today — this is acceptable for `127.0.0.1` but must be addressed before exposing to LAN
- HTTPS via self-signed cert (Tauri can generate one at first LAN-mode enable) prevents passive sniffing on the LAN
