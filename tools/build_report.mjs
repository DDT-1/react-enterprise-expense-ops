import { gzipSync } from "node:zlib";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

const distDir = join(process.cwd(), "dist");
const assetsDir = join(distDir, "assets");
const trackedExtensions = new Set([".js", ".css"]);

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(2)} KB`;
}

async function getAssetRows() {
  const files = await readdir(assetsDir);
  const rows = [];

  for (const file of files) {
    if (!trackedExtensions.has(extname(file))) continue;

    const bytes = await readFile(join(assetsDir, file));
    rows.push({
      file,
      type: extname(file).slice(1),
      rawBytes: bytes.length,
      gzipBytes: gzipSync(bytes).length,
    });
  }

  return rows.sort((a, b) => b.gzipBytes - a.gzipBytes);
}

const assets = await getAssetRows();
const totals = assets.reduce(
  (record, asset) => ({
    rawBytes: record.rawBytes + asset.rawBytes,
    gzipBytes: record.gzipBytes + asset.gzipBytes,
  }),
  { rawBytes: 0, gzipBytes: 0 },
);

const report = {
  generatedAt: new Date().toISOString(),
  totals,
  assets,
};

await writeFile(join(distDir, "build-report.json"), `${JSON.stringify(report, null, 2)}\n`);

console.log("Build asset report");
console.table(
  assets.map((asset) => ({
    file: asset.file,
    type: asset.type,
    raw: formatKb(asset.rawBytes),
    gzip: formatKb(asset.gzipBytes),
  })),
);
console.log(`Total raw: ${formatKb(totals.rawBytes)}`);
console.log(`Total gzip: ${formatKb(totals.gzipBytes)}`);
