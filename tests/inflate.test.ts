/** native build: the deflated 3D car GLB must come back byte-for-byte (src/core/inflate.ts). */
declare const process: { exit(code: number): never };
// @ts-expect-error node built-in (no @types/node in this repo)
import { deflateRawSync } from 'node:zlib';
// @ts-expect-error node built-in
import { readFileSync } from 'node:fs';
import { inflateRaw } from '../src/core/inflate.ts';

let fails = 0;
const check = (ok: boolean, msg: string) => {
  if (!ok) fails++;
  console.log(`  ${ok ? '✓' : '✗'} ${msg}`);
};
const same = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((v, i) => v === b[i]);
const cases: [string, Uint8Array][] = [
  ['X1 GLB', new Uint8Array(readFileSync(new URL('../src/assets/models/xwave-x1.glb', import.meta.url)))],
  ['random bytes', Uint8Array.from({ length: 70000 }, () => Math.floor(Math.random() * 256))],
  ['text', new TextEncoder().encode('Sky Roadster '.repeat(5000))],
  ['empty', new Uint8Array(0)],
];
for (const [name, data] of cases)
  for (const level of [0, 1, 9]) {
    const z = new Uint8Array(deflateRawSync(data, { level }));
    const t0 = performance.now();
    const back = inflateRaw(z, data.length);
    check(same(back, data), `${name} (level ${level}): ${data.length} → ${z.length} bytes → back in ${(performance.now() - t0).toFixed(0)} ms`);
  }
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
if (fails) process.exit(1);
