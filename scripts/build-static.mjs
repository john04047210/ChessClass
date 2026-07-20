import {spawnSync} from "node:child_process";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";

const target=process.argv[2];
if(target!=="server"&&target!=="pages"){
  console.error("Usage: node scripts/build-static.mjs <server|pages>");
  process.exit(2);
}

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const nextCli=join(root,"node_modules","next","dist","bin","next");
const basePath=target==="pages"?"/ChessClass":"";
console.log(`Building ${target} static export (basePath: ${basePath||"/"})`);
const result=spawnSync(process.execPath,[nextCli,"build","--webpack"],{cwd:root,stdio:"inherit",env:{...process.env,NEXT_PUBLIC_BASE_PATH:basePath,DEPLOY_TARGET:target}});
if(result.error)throw result.error;
process.exit(result.status??1);
