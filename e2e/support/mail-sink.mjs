// Captura de e-mail para o E2E: SMTP minimo em :3025 (o backend envia para ca) e API HTTP em :3026.
//   GET  http://localhost:3026/messages?to=<email>   -> [{ to, subject, text, at }]  (mais recentes por ultimo)
//   POST http://localhost:3026/clear
// Uso: node e2e/support/mail-sink.mjs   (backend com MAIL_HOST=localhost MAIL_PORT=3025 e qualquer MAIL_USERNAME/MAIL_PASSWORD)
import net from "node:net";
import http from "node:http";

const SMTP_PORT = Number(process.env.SMTP_PORT ?? 3025);
const HTTP_PORT = Number(process.env.SINK_HTTP_PORT ?? 3026);
const messages = [];

/** quoted-printable (UTF-8) -> texto */
function qp(text) {
  const clean = text.replace(/=\r?\n/g, "");
  const bytes = [];
  for (let i = 0; i < clean.length; i++) {
    const hex = clean.slice(i + 1, i + 3);
    if (clean[i] === "=" && /^[0-9A-F]{2}$/i.test(hex)) {
      bytes.push(parseInt(hex, 16));
      i += 2;
    } else {
      bytes.push(...Buffer.from(clean[i], "utf8"));
    }
  }
  return Buffer.from(bytes).toString("utf8");
}

function splitPart(raw) {
  const i = raw.search(/\r?\n\r?\n/);
  if (i < 0) return { head: raw, body: "" };
  return { head: raw.slice(0, i), body: raw.slice(i).replace(/^\r?\n\r?\n/, "") };
}

function decodePart(raw) {
  const { head, body } = splitPart(raw);
  if (/content-transfer-encoding:\s*base64/i.test(head)) {
    return { head, body: Buffer.from(body.replace(/\s+/g, ""), "base64").toString("utf8") };
  }
  if (/content-transfer-encoding:\s*quoted-printable/i.test(head)) return { head, body: qp(body) };
  return { head, body };
}

function parseMail(data, to) {
  const { head, body } = decodePart(data);
  let text = body;
  const boundary = /boundary="?([^"\r\n;]+)"?/i.exec(head)?.[1];
  if (boundary) {
    text = body
      .split("--" + boundary)
      .map((p) => decodePart(p.replace(/^\r?\n/, "")).body)
      .join("\n");
  }
  // cabecalho Subject pode ter dobras; aceita palavra codificada (RFC 2047) ou QP solto
  const folded = /^subject:[ \t]*(.*(?:\r?\n[ \t].*)*)/im.exec(head)?.[1] ?? "";
  let subject = folded.replace(/\r?\n[ \t]+/g, "");
  subject = subject.replace(/=\?utf-8\?([bq])\?([^?]*)\?=/gi, (_, k, v) =>
    k.toLowerCase() === "b" ? Buffer.from(v, "base64").toString("utf8") : qp(v.replace(/_/g, " ")),
  );
  if (/=[0-9A-F]{2}/i.test(subject)) subject = qp(subject);
  return { to, subject, text, at: Date.now() };
}

net
  .createServer((sock) => {
    let rcpt = [];
    let data = null;
    let buf = "";
    sock.write("220 sink ESMTP\r\n");
    sock.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      for (;;) {
        if (data !== null) {
          const i = buf.indexOf("\r\n.\r\n");
          if (i < 0) return;
          data += buf.slice(0, i);
          buf = buf.slice(i + 5);
          for (const r of rcpt) messages.push(parseMail(data, r));
          data = null;
          rcpt = [];
          sock.write("250 OK\r\n");
          continue;
        }
        const nl = buf.indexOf("\r\n");
        if (nl < 0) return;
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 2);
        const cmd = line.slice(0, 4).toUpperCase();
        if (cmd === "EHLO") sock.write("250-sink\r\n250 8BITMIME\r\n");
        else if (cmd === "HELO") sock.write("250 sink\r\n");
        else if (cmd === "RCPT") {
          rcpt.push((/<([^>]+)>/.exec(line)?.[1] ?? "").toLowerCase());
          sock.write("250 OK\r\n");
        } else if (cmd === "DATA") {
          data = "";
          sock.write("354 go\r\n");
        } else if (cmd === "QUIT") {
          sock.write("221 bye\r\n");
          sock.end();
        } else sock.write("250 OK\r\n");
      }
    });
    sock.on("error", () => {});
  })
  .listen(SMTP_PORT, () => console.log(`SMTP sink :${SMTP_PORT}`));

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    if (req.method === "POST" && url.pathname === "/clear") {
      messages.length = 0;
      return res.end("{}");
    }
    const to = url.searchParams.get("to")?.toLowerCase();
    res.end(JSON.stringify(messages.filter((m) => !to || m.to === to)));
  })
  .listen(HTTP_PORT, () => console.log(`Sink HTTP :${HTTP_PORT}`));
