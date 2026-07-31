# Netdata Mobile

A focused, mobile-first web UI for a local Netdata agent, designed for Proxmox hosts and trusted LAN or WireGuard access.

## Install on Proxmox

```bash
curl -fsSL https://raw.githubusercontent.com/lorenzocorallo/netdata-mobile/main/install.sh | sudo bash
```

Then open `http://PROXMOX_IP:19998`. Netdata remains on its default port `19999`; the `netdata-mobile.service` forwards API requests internally without Nginx or another reverse proxy.

See [PROXMOX_DEPLOYMENT.md](./PROXMOX_DEPLOYMENT.md) for service commands, firewall guidance, optional TLS, updates, and uninstall instructions.

## Features

- Mobile overview for CPU, memory, disk, network, and host health
- Interactive TanStack time-series charts
- Searchable and favoritable metrics
- Metric details with dimensions and min/current/max values
- Active and historical Netdata alerts
- Configurable refresh interval and API endpoint
- PWA manifest, offline application shell, and responsive phone navigation
- Built-in static server and Netdata API bridge using Python's standard library

## Development

Requires Node.js 24+ and npm.

```bash
npm ci
NETDATA_URL=http://127.0.0.1:19999 npm run dev
```

Open `http://localhost:5173`. If the agent is not available, switch to **Demo data** in Settings.

## Checks

```bash
npm run lint
npm test
npm run test:server
npm run test:e2e
npm run build
```

The committed `dist/` directory is the production build consumed by the one-line installer.
