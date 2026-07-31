#!/usr/bin/env python3
"""Static server and same-origin Netdata API bridge for Netdata Mobile."""

from __future__ import annotations

import http.client
import mimetypes
import os
import posixpath
import json
import shutil
import ssl
import subprocess
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit


BIND = os.environ.get("NETDATA_MOBILE_BIND", "0.0.0.0")
PORT = int(os.environ.get("NETDATA_MOBILE_PORT", "19998"))
NETDATA_HOST = os.environ.get("NETDATA_HOST", "127.0.0.1")
NETDATA_PORT = int(os.environ.get("NETDATA_PORT", "19999"))
WEB_ROOT = Path(os.environ.get("NETDATA_MOBILE_WEB_ROOT", "/opt/netdata-mobile/web")).resolve()
TLS_CERT = os.environ.get("NETDATA_MOBILE_TLS_CERT", "")
TLS_KEY = os.environ.get("NETDATA_MOBILE_TLS_KEY", "")

HOP_BY_HOP = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
}


class NetdataMobileHandler(BaseHTTPRequestHandler):
    server_version = "netdata-mobile/1.0"

    def do_GET(self) -> None:  # noqa: N802
        self._dispatch(send_body=True)

    def do_HEAD(self) -> None:  # noqa: N802
        self._dispatch(send_body=False)

    def _dispatch(self, send_body: bool) -> None:
        request = urlsplit(self.path)
        if request.path == "/_health":
            self._send_bytes(HTTPStatus.OK, b'{"status":"ok"}\n', "application/json", send_body)
            return
        if request.path == "/_zfs":
            body = json.dumps(collect_zfs_inventory(), separators=(",", ":")).encode()
            self._send_bytes(HTTPStatus.OK, body, "application/json", send_body)
            return
        if request.path.startswith("/netdata/"):
            self._proxy_netdata(request.path.removeprefix("/netdata"), request.query, send_body)
            return
        self._serve_app(request.path, send_body)

    def _proxy_netdata(self, path: str, query: str, send_body: bool) -> None:
        target = path or "/"
        if query:
            target = f"{target}?{query}"
        headers = {
            "Accept": self.headers.get("Accept", "application/json"),
            "Accept-Encoding": self.headers.get("Accept-Encoding", "identity"),
            "User-Agent": self.headers.get("User-Agent", "netdata-mobile"),
            "X-Forwarded-For": self.client_address[0],
            "X-Forwarded-Proto": "https" if TLS_CERT and TLS_KEY else "http",
        }
        connection = http.client.HTTPConnection(NETDATA_HOST, NETDATA_PORT, timeout=30)
        try:
            connection.request(self.command, target, headers=headers)
            response = connection.getresponse()
            body = response.read() if send_body else b""
            self.send_response(response.status, response.reason)
            for name, value in response.getheaders():
                if name.lower() not in HOP_BY_HOP and name.lower() != "content-length":
                    self.send_header(name, value)
            self.send_header("Content-Length", str(len(body) if send_body else int(response.getheader("Content-Length") or 0)))
            self.end_headers()
            if send_body:
                self.wfile.write(body)
        except (ConnectionError, TimeoutError, OSError, http.client.HTTPException) as error:
            message = f'Netdata agent unavailable at {NETDATA_HOST}:{NETDATA_PORT}: {error}\n'.encode()
            self._send_bytes(HTTPStatus.BAD_GATEWAY, message, "text/plain; charset=utf-8", send_body)
        finally:
            connection.close()

    def _serve_app(self, raw_path: str, send_body: bool) -> None:
        decoded = unquote(raw_path)
        normalized = posixpath.normpath(decoded).lstrip("/")
        requested = (WEB_ROOT / normalized).resolve()
        if WEB_ROOT not in requested.parents and requested != WEB_ROOT:
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        if requested.is_dir():
            requested = requested / "index.html"
        if not requested.is_file():
            requested = WEB_ROOT / "index.html"
        try:
            body = requested.read_bytes() if send_body else b""
            size = requested.stat().st_size
        except OSError:
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        mime_type = mimetypes.guess_type(requested.name)[0] or "application/octet-stream"
        if mime_type.startswith("text/") or mime_type in {"application/javascript", "application/json", "image/svg+xml"}:
            mime_type = f"{mime_type}; charset=utf-8"
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", mime_type)
        self.send_header("Content-Length", str(size))
        if requested.name in {"index.html", "sw.js", "manifest.webmanifest"}:
            self.send_header("Cache-Control", "no-cache")
        elif "/assets/" in requested.as_posix():
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        else:
            self.send_header("Cache-Control", "public, max-age=3600")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "same-origin")
        self.end_headers()
        if send_body:
            self.wfile.write(body)

    def _send_bytes(self, status: HTTPStatus, body: bytes, content_type: str, send_body: bool) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if send_body:
            self.wfile.write(body)

    def log_message(self, fmt: str, *args: object) -> None:
        print(f"{self.address_string()} - {fmt % args}", flush=True)


def _number(value: str) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _percentage(value: str) -> float | None:
    try:
        return float(value.removesuffix("%"))
    except (AttributeError, ValueError):
        return None


def parse_zpool_list(output: str) -> list[dict[str, object]]:
    pools: list[dict[str, object]] = []
    for line in output.splitlines():
        fields = line.split("\t")
        if len(fields) != 7:
            continue
        name, size, allocated, free, fragmentation, capacity, health = fields
        pools.append({
            "name": name,
            "size": _number(size),
            "allocated": _number(allocated),
            "free": _number(free),
            "fragmentation": _percentage(fragmentation),
            "capacity": _percentage(capacity) or 0,
            "health": health,
        })
    return pools


def parse_zfs_list(output: str) -> list[dict[str, object]]:
    datasets: list[dict[str, object]] = []
    for line in output.splitlines():
        fields = line.split("\t")
        if len(fields) != 11:
            continue
        name, kind, mountpoint, used, available, referenced, quota, snapshots, dataset, children, _refreservation = fields
        parent = name.rsplit("/", 1)[0] if "/" in name else None
        datasets.append({
            "name": name,
            "pool": name.split("/", 1)[0],
            "parent": parent,
            "depth": name.count("/"),
            "type": kind,
            "mountpoint": mountpoint,
            "used": _number(used),
            "available": _number(available),
            "referenced": _number(referenced),
            "quota": None if quota in {"-", "none", "0"} else _number(quota),
            "usedBySnapshots": _number(snapshots),
            "usedByDataset": _number(dataset),
            "usedByChildren": _number(children),
        })
    return datasets


def _run_zfs(command: list[str]) -> str:
    environment = {**os.environ, "LC_ALL": "C"}
    result = subprocess.run(command, capture_output=True, check=True, text=True, timeout=10, env=environment)
    return result.stdout


def collect_zfs_inventory() -> dict[str, object]:
    zpool = shutil.which("zpool")
    zfs = shutil.which("zfs")
    if not zpool or not zfs:
        return {"available": False, "source": "unavailable", "pools": [], "datasets": [], "error": "zfs tools are not installed"}
    try:
        pools = parse_zpool_list(_run_zfs([zpool, "list", "-Hp", "-o", "name,size,alloc,free,frag,cap,health"]))
        datasets = parse_zfs_list(_run_zfs([
            zfs, "list", "-Hp", "-t", "filesystem,volume", "-o",
            "name,type,mountpoint,used,available,referenced,quota,usedbysnapshots,usedbydataset,usedbychildren,usedbyrefreservation",
        ]))
        return {"available": True, "source": "local-zfs", "pools": pools, "datasets": datasets}
    except (OSError, subprocess.SubprocessError) as error:
        return {"available": False, "source": "unavailable", "pools": [], "datasets": [], "error": str(error)}


def main() -> None:
    if not (WEB_ROOT / "index.html").is_file():
        raise SystemExit(f"Missing web application at {WEB_ROOT}")
    server = ThreadingHTTPServer((BIND, PORT), NetdataMobileHandler)
    if TLS_CERT and TLS_KEY:
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(TLS_CERT, TLS_KEY)
        server.socket = context.wrap_socket(server.socket, server_side=True)
    scheme = "https" if TLS_CERT and TLS_KEY else "http"
    print(f"Netdata Mobile listening on {scheme}://{BIND}:{PORT}; agent API {NETDATA_HOST}:{NETDATA_PORT}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
