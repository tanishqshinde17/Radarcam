// Downloads every speed camera mapped in OpenStreetMap and writes them as
// static tiles to public/cameras/, so the app can load only nearby tiles.
//
//   npm run fetch-cameras
//
// Data © OpenStreetMap contributors, ODbL 1.0.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TILE_DEG = 2; // must match TILE_DEG in src/services/cameraTiles.ts
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'cameras');

// Public Overpass instances; add more here if these are busy
const ENDPOINTS = [
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass-api.de/api/interpreter'
];
const MAX_ATTEMPTS = 24;

const wait = (ms) => new Promise(r => setTimeout(r, ms));

// A rare tag queried globally is cheaper for Overpass than many bounding boxes
const QUERIES = {
  // highway=speed_camera nodes
  nodes: '[out:json][timeout:900][maxsize:1073741824];node["highway"="speed_camera"];out body qt;',
  // Enforcement relations and their camera ("device") nodes
  relations: `[out:json][timeout:900][maxsize:1073741824];
rel["type"="enforcement"]["enforcement"~"^(maxspeed|traffic_signals|average_speed)$"]->.r;
.r out body qt;
node(r.r:"device");
out body qt;`
};

async function overpass(name, query) {
  const body = new URLSearchParams({ data: query });
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const url = ENDPOINTS[attempt % ENDPOINTS.length];
    try {
      const res = await fetch(url, {
        method: 'POST',
        body,
        headers: { 'User-Agent': 'Radarcam-data-builder/1.0', Accept: 'application/json' },
        signal: AbortSignal.timeout(950_000)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.remark?.match(/error|timed out|out of memory/i)) throw new Error(json.remark);
      console.log(`${name}: ${json.elements.length} elements from ${url}`);
      return json.elements;
    } catch (err) {
      // Exponential backoff, as the public Overpass servers ask when they are busy
      const delay = Math.min(30_000 * 2 ** Math.floor(attempt / ENDPOINTS.length), 600_000);
      console.warn(`${name}: ${url} failed (${err.message}), retrying in ${delay / 1000}s`);
      await wait(delay);
    }
  }
  throw new Error(`${name}: all ${MAX_ATTEMPTS} attempts failed`);
}

function cameraType(tags, enforcement) {
  if (enforcement === 'traffic_signals') return 'red_light';
  if (enforcement === 'average_speed' || tags['camera:type'] === 'average') return 'average_speed';
  if (tags['camera:mount'] === 'mobile' || tags['camera:type'] === 'mobile') return 'mobile';
  return 'fixed';
}

function parseMaxspeed(value) {
  if (!value) return 0;
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return 0;
  return /mph/i.test(value) ? Math.round(n * 1.609344) : n; // store km/h
}

const cameras = new Map(); // node id -> [lat, lng, type, speedLimitKmh, direction]

function ingest(elements) {
  // Devices of enforcement relations inherit the relation's kind and limit
  const fromRelation = new Map();
  for (const el of elements) {
    if (el.type !== 'relation') continue;
    for (const m of el.members ?? []) {
      if (m.type === 'node' && m.role === 'device') {
        fromRelation.set(m.ref, { enforcement: el.tags?.enforcement, maxspeed: el.tags?.maxspeed });
      }
    }
  }

  for (const node of elements) {
    if (node.type !== 'node') continue;
    const tags = node.tags ?? {};
    const rel = fromRelation.get(node.id);
    if (tags.highway !== 'speed_camera' && !rel) continue;
    const existing = cameras.get(node.id);
    const direction = parseInt(tags.direction ?? tags['camera:direction'] ?? '', 10);
    cameras.set(node.id, [
      Math.round(node.lat * 1e5) / 1e5,
      Math.round(node.lon * 1e5) / 1e5,
      rel ? cameraType(tags, rel.enforcement) : existing?.[2] ?? cameraType(tags),
      parseMaxspeed(tags.maxspeed ?? rel?.maxspeed) || (existing?.[3] ?? 0),
      Number.isNaN(direction) ? null : direction
    ]);
  }
}

ingest(await overpass('nodes', QUERIES.nodes));
ingest(await overpass('relations', QUERIES.relations));

// Write tiles: public/cameras/<latIndex>_<lngIndex>.json
const tiles = new Map();
for (const [id, cam] of cameras) {
  const key = `${Math.floor(cam[0] / TILE_DEG)}_${Math.floor(cam[1] / TILE_DEG)}`;
  if (!tiles.has(key)) tiles.set(key, []);
  tiles.get(key).push([id, ...cam]);
}

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });
for (const [key, list] of tiles) writeFileSync(join(OUT_DIR, `${key}.json`), JSON.stringify(list));
writeFileSync(join(OUT_DIR, 'index.json'), JSON.stringify({
  generated: new Date().toISOString(),
  tileDeg: TILE_DEG,
  count: cameras.size,
  tiles: [...tiles.keys()].sort()
}));

console.log(`Done: ${cameras.size} cameras in ${tiles.size} tiles -> ${OUT_DIR}`);
