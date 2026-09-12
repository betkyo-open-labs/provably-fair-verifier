#!/usr/bin/env node
// Betkyo provably-fair verifier — recomputes a round from the revealed server
// seed, your client seed, the nonce and the cursor, using the same
// constructions the site's browser verifier uses (HMAC-SHA256 over
// "clientSeed-nonce-cursor", first 8 bytes → uniform number in [0,1) with ONE
// rounding). No dependencies beyond Node's crypto.
//
//   node verify.mjs commit  <serverSeed>                       → SHA-256 fingerprint (compare with the commitment you were shown)
//   node verify.mjs u       <serverSeed> <clientSeed> <nonce> [cursor=0]   → the uniform number
//   node verify.mjs limbo   <serverSeed> <clientSeed> <nonce>  → outcome ×(hundredths)
//   node verify.mjs roulette <serverSeed> <clientSeed> <nonce> → pocket 0..36
//   node verify.mjs sicbo   <serverSeed> <clientSeed> <nonce>  → three dice
//   node verify.mjs koban   <serverSeed> <clientSeed> <nonce> <flips> → faces (0 = omote, 1 = ura)
//   node verify.mjs dice6   <serverSeed> <clientSeed> <nonce> [cursor] → a 1..6 die at that cursor
import { createHmac, createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const sha256Hex = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
export const hmac = (serverSeed, clientSeed, nonce, cursor) =>
    createHmac('sha256', Buffer.from(serverSeed, 'utf8')).update(`${clientSeed}-${nonce}-${cursor}`, 'utf8').digest();

// first 8 bytes → [0,1): hi/2^32 + lo/2^64, both exact, so the single IEEE
// addition is the only rounding — matching a server-side ULong→Double cast.
export function u64(d) {
    let hi = 0; for (let i = 0; i < 4; i++) hi = hi * 256 + d[i];
    let lo = 0; for (let i = 4; i < 8; i++) lo = lo * 256 + d[i];
    return hi / 2 ** 32 + lo / 2 ** 64;
}
export const uAt = (s, c, n, cur = 0) => u64(hmac(s, c, n, cur));
export const curve100 = (u) => Math.min(1_000_000, Math.max(100, Math.floor((0.99 / (1 - u)) * 100)));

export const games = {
    limbo: (s, c, n) => curve100(uAt(s, c, n, 0)),
    roulette: (s, c, n) => Math.min(Math.floor(uAt(s, c, n, 0) * 37), 36),
    sicbo: (s, c, n) => [0, 1, 2].map((i) => Math.min(Math.floor(uAt(s, c, n, i) * 6), 5) + 1),
    koban: (s, c, n, flips = 1) => Array.from({ length: +flips }, (_, i) => (uAt(s, c, n, i) < 0.5 ? 0 : 1)),
    dice6: (s, c, n, cur = 0) => Math.min(Math.floor(uAt(s, c, n, +cur) * 6), 5) + 1,
};

const isMain = (() => { try { return process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; } })();
if (isMain) {
    const [cmd, ...a] = process.argv.slice(2);
    if (cmd === 'commit') console.log(sha256Hex(a[0]));
    else if (cmd === 'u') console.log(uAt(a[0], a[1], +a[2], +(a[3] ?? 0)));
    else if (games[cmd]) console.log(JSON.stringify(games[cmd](a[0], a[1], +a[2], a[3])));
    else { console.error('usage: see header of verify.mjs'); process.exit(2); }
}
