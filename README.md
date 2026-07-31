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
- Selectable 5-minute through 7-day chart windows
- Compact metric-family filtering with no horizontal scrolling
- Metric details with dimensions and min/current/max values
- Active and historical Netdata alerts
- ZFS pool aggregates, health, capacity, fragmentation, and full dataset hierarchy
- Per-dataset used/free space with quota, refquota, unlimited, high-quota, and zvol-size distinctions
- Honest zvol accounting: physical allocation, logical blocks, disk size, snapshots, reservation, and thin/thick provisioning
- Configurable refresh interval and API endpoint
- PWA manifest, offline application shell, and responsive phone navigation
- Built-in static server and Netdata API bridge using Python's standard library

## Development

Requires Node.js 24+ and npm for development and installation builds.

```bash
npm ci
NETDATA_URL=http://127.0.0.1:19999 npm run dev
```

Open `http://localhost:5173`. If the agent is not available, switch to **Demo data** in Settings.

## Checks

```bash
npm run check
npm test
npm run test:server
npm run test:e2e
npm run build
```

The one-line installer clones the current source, runs `npm ci` and `npm run build`, and installs the resulting web UI. It does not install Node.js, npm, or Python for you; those tools must already be available on the host.
