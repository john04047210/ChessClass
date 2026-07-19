import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(root, "node_modules", "stockfish");
const target = join(root, "public", "stockfish");

await mkdir(target, { recursive: true });
await Promise.all([
  "bin/stockfish-18-lite-single.js",
  "bin/stockfish-18-lite-single.wasm",
  "Copying.txt",
].map(async (file) => {
  const name = file.includes("/") ? file.split("/").at(-1) : file;
  await copyFile(join(source, file), join(target, name));
}));
