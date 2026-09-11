import { createServer } from "node:http";

const clients = new Set();

createServer((req, res) => {
  const send = (code, body) => {
    res.writeHead(code, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };
  if (!req.headers.authorization?.startsWith("Bearer ")) return send(401, { ok: false, error: "unauthorized" });

  const path = req.url.split("?")[0];
  if (req.method === "POST" && path === "/clients") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const name = JSON.parse(body || "{}").name;
      clients.add(name);
      send(200, { ok: true, name });
    });
  } else if (req.method === "GET") {
    const config = path.match(/^\/clients\/([a-zA-Z0-9_-]+)\/config$/);
    if (config) {
      if (!clients.has(config[1])) return send(404, { ok: false, error: "not found" });
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end(`[Interface]\nPrivateKey = mock\nAddress = 10.8.1.2/32\nDNS = 1.1.1.1\n[Peer]\nPublicKey = mock\nEndpoint = mock.example:51820\n`);
    } else if (path === "/status" || path === "/clients" || path === "/stats") {
      send(200, { ok: true, clients: { total: clients.size } });
    } else {
      send(404, { ok: false, error: "not found" });
    }
  } else if (req.method === "DELETE") {
    const client = path.match(/^\/clients\/([a-zA-Z0-9_-]+)$/);
    if (client) {
      clients.delete(client[1]);
      send(200, { ok: true });
    } else {
      send(404, { ok: false, error: "not found" });
    }
  } else {
    send(404, { ok: false, error: "not found" });
  }
}).listen(8080, () => console.log("mock awg on :8080"));
