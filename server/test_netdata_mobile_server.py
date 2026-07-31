from __future__ import annotations

import json
import tempfile
import threading
import unittest
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from server import netdata_mobile_server as app


class FakeNetdataHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802
        body = json.dumps({"path": self.path, "hostname": "test-node"}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, _format: str, *_args: object) -> None:
        return


class ServerTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        root = Path(self.temp.name)
        (root / "index.html").write_text("<h1>Netdata Mobile</h1>", encoding="utf-8")
        app.WEB_ROOT = root

        self.agent = ThreadingHTTPServer(("127.0.0.1", 0), FakeNetdataHandler)
        app.NETDATA_HOST = "127.0.0.1"
        app.NETDATA_PORT = self.agent.server_port
        self.agent_thread = threading.Thread(target=self.agent.serve_forever, daemon=True)
        self.agent_thread.start()

        self.web = ThreadingHTTPServer(("127.0.0.1", 0), app.NetdataMobileHandler)
        self.web_thread = threading.Thread(target=self.web.serve_forever, daemon=True)
        self.web_thread.start()
        self.base = f"http://127.0.0.1:{self.web.server_port}"

    def tearDown(self) -> None:
        self.web.shutdown()
        self.agent.shutdown()
        self.web.server_close()
        self.agent.server_close()
        self.temp.cleanup()

    def test_serves_spa_fallback(self) -> None:
        with urllib.request.urlopen(f"{self.base}/metrics") as response:
            self.assertEqual(response.status, 200)
            self.assertIn(b"Netdata Mobile", response.read())

    def test_proxies_netdata_api_with_query(self) -> None:
        with urllib.request.urlopen(f"{self.base}/netdata/api/v1/info?all=true") as response:
            payload = json.load(response)
            self.assertEqual(payload["hostname"], "test-node")
            self.assertEqual(payload["path"], "/api/v1/info?all=true")

    def test_health_endpoint(self) -> None:
        with urllib.request.urlopen(f"{self.base}/_health") as response:
            self.assertEqual(json.load(response), {"status": "ok"})

    def test_parses_zfs_pool_and_dataset_hierarchy(self) -> None:
        pools = app.parse_zpool_list("pool12\t13194139533312\t7696581394432\t5497558138880\t11\t58\tONLINE\n")
        datasets = app.parse_zfs_list(
            "pool12\tfilesystem\t/pool12\t7696581394432\t5497558138880\t262144\t0\t0\t-\tnone\t7696581394432\t262144\t118111600640\t262144\t7578469531648\t0\n"
            "pool12/media\tfilesystem\t/pool12/media\t734439407616\t365072220160\t708669603840\t0\t1099511627776\t-\tnone\t734439407616\t708669603840\t25769803776\t708669603840\t0\t0\n"
            "pool12/vm-200-disk-0\tvolume\t-\t37580963840\t1082331758592\t21474836480\t0\t0\t34359738368\t35433480192\t25769803776\t24696061952\t1073741824\t21474836480\t0\t13958643712\n"
            "pool12/vm-201-disk-0\tvolume\t-\t37580963840\t1082331758592\t21474836480\t0\t0\t34359738368\tauto\t25769803776\t24696061952\t1073741824\t21474836480\t0\t13958643712\n"
        )
        self.assertEqual(pools[0]["name"], "pool12")
        self.assertEqual(pools[0]["health"], "ONLINE")
        self.assertEqual(datasets[1]["parent"], "pool12")
        self.assertEqual(datasets[1]["depth"], 1)
        self.assertIsNone(datasets[1]["quota"])
        self.assertEqual(datasets[1]["refQuota"], 1099511627776)
        self.assertEqual(datasets[2]["volumeSize"], 34359738368)
        self.assertEqual(datasets[2]["refReservation"], 35433480192)
        self.assertEqual(datasets[2]["logicalReferenced"], 24696061952)
        self.assertEqual(datasets[2]["usedByRefReservation"], 13958643712)
        self.assertTrue(datasets[3]["refReservationAuto"])
        self.assertIsNone(datasets[3]["refReservation"])


if __name__ == "__main__":
    unittest.main()
