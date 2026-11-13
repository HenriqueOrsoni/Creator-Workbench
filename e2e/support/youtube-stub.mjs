// YouTube falso para o E2E (nunca chama a API real). Escuta em :3027 (STUB_PORT).
// O backend sobe com YOUTUBE_BASE_URL=http://127.0.0.1:3027 e YOUTUBE_API_KEY=stub-key e chama
//   GET /videos?part=statistics,snippet&id=a,b&fields=...   com o cabecalho X-Goog-Api-Key.
//
// Respostas de GET /videos:
//   - ids conhecidos: qualquer id com 11 caracteres [A-Za-z0-9_-] que nao seja "zzzzzzzzzzz" (esse volta sem itens,
//     o que o backend traduz em "video nao encontrado").
//   - viewCount cresce 100 a cada chamada que inclui o id (likes +10, comentarios +1), para a tendencia mudar.
//   - titulo: "Video de teste <id>".
// Controle (HTTP, so para os testes):
//   GET  /__state                 -> { mode, calls, key, counters }
//   POST /__mode  {"mode":"ok"|"quota"|"error"}   quota = 403 quotaExceeded, error = 500
//   POST /__reset                 -> zera contadores e volta ao modo ok
//   POST /__counter {"id":"abc","views":5000}     -> fixa o proximo viewCount do id
import http from "node:http";

const PORT = Number(process.env.STUB_PORT ?? 3027);
const NOT_FOUND_ID = "zzzzzzzzzzz";
let mode = "ok";
let calls = 0;
let lastKey = null;
const counters = new Map();

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    if (req.method === "GET" && url.pathname === "/__state") return json(res, 200, { mode, calls, key: lastKey, counters: Object.fromEntries(counters) });
    if (req.method === "POST" && url.pathname === "/__mode") {
      const b = await readBody(req);
      mode = ["ok", "quota", "error"].includes(b.mode) ? b.mode : "ok";
      return json(res, 200, { mode });
    }
    if (req.method === "POST" && url.pathname === "/__reset") {
      mode = "ok";
      calls = 0;
      counters.clear();
      return json(res, 200, { mode });
    }
    if (req.method === "POST" && url.pathname === "/__counter") {
      const b = await readBody(req);
      if (typeof b.id === "string") counters.set(b.id, Number(b.views) || 0);
      return json(res, 200, { ok: true });
    }
    if (req.method === "GET" && url.pathname === "/videos") {
      calls++;
      lastKey = req.headers["x-goog-api-key"] ?? null;
      if (!lastKey) return json(res, 403, { error: { code: 403, message: "missing key" } });
      if (mode === "quota") return json(res, 403, { error: { code: 403, message: "quota", errors: [{ reason: "quotaExceeded" }] } });
      if (mode === "error") return json(res, 500, { error: { code: 500, message: "boom" } });
      const ids = (url.searchParams.get("id") ?? "").split(",").filter(Boolean);
      const items = [];
      for (const id of ids) {
        if (id === NOT_FOUND_ID || !/^[A-Za-z0-9_-]{11}$/.test(id)) continue;
        const n = (counters.get(id) ?? 1000) + 100;
        counters.set(id, n);
        items.push({
          id,
          snippet: { title: `Vídeo de teste ${id}`, publishedAt: "2026-10-01T12:00:00Z" },
          statistics: { viewCount: String(n), likeCount: String(Math.floor(n / 10)), commentCount: String(Math.floor(n / 100)) },
        });
      }
      return json(res, 200, { items });
    }
    json(res, 404, { error: "not found" });
  })
  .listen(PORT, "127.0.0.1", () => console.log(`youtube-stub em http://127.0.0.1:${PORT}`));
