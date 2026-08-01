#!/usr/bin/env bash
set -Eeuo pipefail

readonly REPOSITORY="lorenzocorallo/netdata-mobile"
readonly SOURCE_REF="${NETDATA_MOBILE_REF:-main}"
readonly INSTALL_DIR="/opt/netdata-mobile"
readonly ENV_FILE="/etc/default/netdata-mobile"
readonly UNIT_FILE="/etc/systemd/system/netdata-mobile.service"
readonly UI_PORT="${NETDATA_MOBILE_PORT:-19998}"
readonly AGENT_PORT="${NETDATA_AGENT_PORT:-19999}"
readonly BIND_ADDRESS="${NETDATA_MOBILE_BIND:-0.0.0.0}"

log() { printf '\033[1;32m[netdata-mobile]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[netdata-mobile]\033[0m %s\n' "$*" >&2; exit 1; }

if [[ "${EUID}" -ne 0 ]]; then
  fail "Run as root: curl -fsSL https://raw.githubusercontent.com/${REPOSITORY}/main/install.sh | sudo bash"
fi

for command in curl git node npm install python3 systemctl useradd; do
  command -v "${command}" >/dev/null 2>&1 || fail "Required command not found: ${command}. Install it before running this installer."
done

if ! node_version="$(node --version)"; then
  fail "The installed Node.js command is not usable. Node.js 24 or newer is required."
fi
if [[ ! "${node_version}" =~ ^v([0-9]+)\. ]]; then
  fail "Could not determine the installed Node.js version. Node.js 24 or newer is required."
fi
node_major="${BASH_REMATCH[1]}"
if (( node_major < 24 )); then
  fail "Node.js 24 or newer is required; found ${node_version}."
fi
if ! npm_version="$(npm --version)"; then
  fail "The installed npm command is not usable."
fi

if ! curl -fsS --max-time 5 "http://127.0.0.1:${AGENT_PORT}/api/v1/info" >/dev/null; then
  fail "Netdata is not responding at http://127.0.0.1:${AGENT_PORT}. Start the agent, then run this installer again."
fi

if command -v ss >/dev/null 2>&1 && ss -H -ltn "sport = :${UI_PORT}" | grep -q .; then
  if ! systemctl is-active --quiet netdata-mobile.service 2>/dev/null; then
    fail "Port ${UI_PORT} is already in use by another process."
  fi
fi

work_dir="$(mktemp -d)"
trap 'rm -rf "${work_dir}"' EXIT

log "Cloning ${REPOSITORY} (${SOURCE_REF})"
git clone --depth 1 --single-branch --branch "${SOURCE_REF}" "https://github.com/${REPOSITORY}.git" "${work_dir}/source" \
  || fail "Could not clone ${REPOSITORY} at ref ${SOURCE_REF}."
source_dir="${work_dir}/source"
[[ -f "${source_dir}/package.json" && -f "${source_dir}/package-lock.json" ]] \
  || fail "The cloned source does not contain the Node.js project files."

log "Building web UI with Node.js ${node_version} and npm ${npm_version}"
if ! (cd "${source_dir}" && npm ci --no-audit --no-fund && npm run build); then
  fail "The web UI build failed. Check the Node.js/npm versions and network access, then try again."
fi
[[ -f "${source_dir}/dist/index.html" ]] || fail "The web UI build completed without producing dist/index.html."

log "Installing application files"
if ! id -u netdata-mobile >/dev/null 2>&1; then
  useradd --system --home-dir /nonexistent --shell /usr/sbin/nologin netdata-mobile
fi
install -d -m 0755 "${INSTALL_DIR}/web"
find "${INSTALL_DIR}/web" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
cp -a "${source_dir}/dist/." "${INSTALL_DIR}/web/"
install -m 0755 "${source_dir}/server/netdata_mobile_server.py" "${INSTALL_DIR}/server.py"
install -m 0644 "${source_dir}/deploy/netdata-mobile.service" "${UNIT_FILE}"

cat >"${ENV_FILE}" <<EOF
NETDATA_MOBILE_BIND=${BIND_ADDRESS}
NETDATA_MOBILE_PORT=${UI_PORT}
NETDATA_HOST=127.0.0.1
NETDATA_PORT=${AGENT_PORT}
NETDATA_MOBILE_WEB_ROOT=${INSTALL_DIR}/web
EOF
chmod 0644 "${ENV_FILE}"

log "Starting netdata-mobile.service"
systemctl daemon-reload
systemctl enable netdata-mobile.service
systemctl restart netdata-mobile.service

for _ in {1..20}; do
  if curl -fsS --max-time 2 "http://127.0.0.1:${UI_PORT}/_health" >/dev/null; then
    break
  fi
  sleep 0.25
done

if ! curl -fsS --max-time 2 "http://127.0.0.1:${UI_PORT}/_health" >/dev/null; then
  systemctl status --no-pager netdata-mobile.service >&2 || true
  fail "The service did not become healthy. Inspect it with: journalctl -u netdata-mobile -n 100"
fi

host_ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
[[ -n "${host_ip}" ]] || host_ip="PROXMOX_IP"

log "Installation complete"
printf '\n  Open: http://%s:%s\n' "${host_ip}" "${UI_PORT}"
printf '  Agent API: http://127.0.0.1:%s (unchanged)\n\n' "${AGENT_PORT}"
printf 'Update later by running the same curl command again.\n'
