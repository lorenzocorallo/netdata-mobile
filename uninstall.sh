#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run with sudo." >&2
  exit 1
fi

systemctl disable --now netdata-mobile.service 2>/dev/null || true
rm -f /etc/systemd/system/netdata-mobile.service /etc/default/netdata-mobile
rm -rf /opt/netdata-mobile
if id -u netdata-mobile >/dev/null 2>&1; then
  userdel netdata-mobile
fi
systemctl daemon-reload
echo "Netdata Mobile has been removed. Netdata on port 19999 was not changed."
