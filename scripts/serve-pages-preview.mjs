import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const port = 4175;
const basePath = "/ChessClass";
const output = join(process.cwd(), "out");
const types = { ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8", ".json":"application/json", ".wasm":"application/wasm", ".txt":"text/plain; charset=utf-8" };

createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);
  if (url.pathname === basePath) { response.writeHead(302,{Location:`${basePath}/`}); response.end(); return; }
  if (!url.pathname.startsWith(`${basePath}/`)) { response.writeHead(404); response.end("Not found"); return; }
  const relative = normalize(decodeURIComponent(url.pathname.slice(basePath.length))).replace(/^[/\\]+/, "");
  let file = join(output, relative);
  try { if ((await stat(file)).isDirectory()) file = join(file,"index.html"); } catch { /* return 404 below */ }
  try {
    const content = await readFile(file);
    response.writeHead(200,{"Content-Type":types[extname(file)] || "application/octet-stream"}); response.end(content);
  } catch { response.writeHead(404); response.end("Not found"); }
}).listen(port,"127.0.0.1",()=>console.log(`Pages preview: http://127.0.0.1:${port}${basePath}/`));
