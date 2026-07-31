/* eslint-disable @typescript-eslint/no-require-imports */
// Entry point para hospedagem Node.js (ex.: Hostinger compartilhado).
// Sobe o servidor de produção do Next.js. Roda: node server.js
const { createServer } = require("http");
const next = require("next");

const port = parseInt(process.env.PORT || "3000", 10);
const hostname = process.env.HOST || "0.0.0.0";
const dev = process.env.NODE_ENV === "development";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer((req, res) => {
      handle(req, res);
    }).listen(port, hostname, () => {
      console.log(`> Ready on http://${hostname}:${port} (${dev ? "development" : "production"})`);
    });
  })
  .catch((err) => {
    console.error("> Falha ao iniciar o servidor:", err);
    process.exit(1);
  });
