# Install Netdata Mobile on Proxmox

Netdata Mobile runs as its own systemd service on port `19998`. Netdata stays unchanged on its default port `19999`.

```text
Phone ── WireGuard/LAN ──> Proxmox:19998 (Netdata Mobile)
                                      │
                                      └──> 127.0.0.1:19999 (Netdata API)
```

The bundled server provides the static PWA and forwards `/netdata/` requests to the local agent. Nginx, Caddy, and manual proxy configuration are not required. Node.js and npm are needed only while installing or updating, because the installer builds the UI from source; they are not needed to run the service afterward.

## One-line installation

Run this as a user with sudo access on the Proxmox host:

```bash
curl -fsSL https://raw.githubusercontent.com/lorenzocorallo/netdata-mobile/main/install.sh | sudo bash
```

Before running it, make sure the host already has Git, Node.js 24+, npm, Python 3, and systemd. The installer does not install missing system packages.

The installer:

- verifies that Netdata responds on `127.0.0.1:19999`;
- clones the current source from GitHub;
- runs `npm ci` and `npm run build` locally;
- installs it under `/opt/netdata-mobile`;
- installs and enables `netdata-mobile.service`;
- listens on `0.0.0.0:19998`;
- leaves the Netdata configuration and port unchanged.

The service also runs read-only `zpool list` and `zfs list` commands locally to expose pool totals and the complete dataset hierarchy. It never changes pool or dataset properties.

Run the same command again to update an existing installation.

## Open the web UI

On a phone connected to the LAN or WireGuard network, open:

```text
http://PROXMOX_IP:19998
```

New installations use the live agent automatically. The same-origin API base path is `/netdata` and the default refresh interval is 10 seconds.

## Service commands

```bash
sudo systemctl status netdata-mobile
sudo systemctl restart netdata-mobile
sudo journalctl -u netdata-mobile -f
```

The optional service settings are stored in `/etc/default/netdata-mobile`:

```ini
NETDATA_MOBILE_BIND=0.0.0.0
NETDATA_MOBILE_PORT=19998
NETDATA_HOST=127.0.0.1
NETDATA_PORT=19999
NETDATA_MOBILE_WEB_ROOT=/opt/netdata-mobile/web
```

After editing the file, restart the service.

## Firewall and WireGuard

The installer does not modify the Proxmox firewall. If the host firewall is enabled, permit TCP `19998` from the WireGuard subnet or trusted LAN only. Netdata Mobile does not provide authentication, so do not expose it to the public internet.

Example rule conceptually:

```text
ACCEPT tcp from YOUR_WIREGUARD_SUBNET to port 19998
DROP   tcp from all other sources to port 19998
```

Create the equivalent rule through the Proxmox firewall UI or your existing firewall tooling so it matches the rest of the host configuration.

## PWA installation note

The UI is built as a PWA and works normally over local HTTP. Browsers only enable service workers and home-screen PWA installation in a secure context, normally trusted HTTPS. Access over plain `http://PROXMOX_IP:19998` therefore works as a mobile web app but may not show an install prompt. This does not affect live monitoring.

The bundled server supports TLS without an external proxy. To use it, place a certificate and readable private key on the host and add these entries to `/etc/default/netdata-mobile`:

```ini
NETDATA_MOBILE_TLS_CERT=/path/to/fullchain.pem
NETDATA_MOBILE_TLS_KEY=/path/to/privkey.pem
```

Copy the certificate and key to a dedicated directory, make them readable by the service, restart it, and open `https://HOSTNAME:19998`:

```bash
sudo install -d -m 0750 -o root -g netdata-mobile /etc/netdata-mobile
sudo install -m 0640 -o root -g netdata-mobile /path/to/fullchain.pem /etc/netdata-mobile/tls.pem
sudo install -m 0640 -o root -g netdata-mobile /path/to/privkey.pem /etc/netdata-mobile/tls.key
```

Use `/etc/netdata-mobile/tls.pem` and `/etc/netdata-mobile/tls.key` in the environment entries. The certificate must be trusted by the phone for full PWA support.

## Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/lorenzocorallo/netdata-mobile/main/uninstall.sh | sudo bash
```

This removes only Netdata Mobile. It does not change or remove Netdata.

## Troubleshooting

- **Installer says Netdata is unavailable:** run `curl http://127.0.0.1:19999/api/v1/info` on the host and check `systemctl status netdata`.
- **The phone cannot connect:** verify `systemctl status netdata-mobile`, then allow TCP `19998` from the WireGuard or LAN subnet.
- **502 response:** the UI service is running but cannot reach the agent API on `127.0.0.1:19999`.
- **Blank or missing charts:** available charts depend on the collectors enabled in Netdata.
- **ZFS inventory unavailable:** verify `sudo -u netdata-mobile zpool list` and `sudo -u netdata-mobile zfs list` work. On a standard Proxmox ZFS installation, list access is available without root.
