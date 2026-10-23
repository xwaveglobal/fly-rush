/**
 * Raw DEFLATE decoder (RFC 1951), no dependencies — used by the native TikTok build, which ships
 * the 3D car GLB deflated + base64 inside game.js (the package has a 4 MB limit and the mini-game
 * runtime has no fetch for package files). Pure: runs in Node too (tests/inflate.test.ts).
 */
interface Tree {
  count: Uint16Array;
  symbol: Uint16Array;
}

function build(lengths: Uint8Array, off: number, n: number): Tree {
  const t: Tree = { count: new Uint16Array(16), symbol: new Uint16Array(n) };
  for (let i = 0; i < n; i++) t.count[lengths[off + i]]++;
  t.count[0] = 0;
  const offs = new Uint16Array(16);
  for (let i = 1; i < 16; i++) offs[i] = offs[i - 1] + t.count[i - 1];
  for (let i = 0; i < n; i++) if (lengths[off + i]) t.symbol[offs[lengths[off + i]]++] = i;
  return t;
}

const LBASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LEXT = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DBASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
const DEXT = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
const CLORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

let FIXED_L: Tree | null = null;
let FIXED_D: Tree | null = null;
function fixed() {
  if (!FIXED_L) {
    const l = new Uint8Array(288);
    for (let i = 0; i < 144; i++) l[i] = 8;
    for (let i = 144; i < 256; i++) l[i] = 9;
    for (let i = 256; i < 280; i++) l[i] = 7;
    for (let i = 280; i < 288; i++) l[i] = 8;
    FIXED_L = build(l, 0, 288);
    const d = new Uint8Array(30).fill(5);
    FIXED_D = build(d, 0, 30);
  }
  return [FIXED_L, FIXED_D!] as const;
}

/** decode raw DEFLATE data; `sizeHint` = expected output size (grows if needed) */
export function inflateRaw(src: Uint8Array, sizeHint = src.length * 4): Uint8Array {
  let out = new Uint8Array(Math.max(1024, sizeHint));
  let op = 0;
  let pos = 0,
    bit = 0,
    tag = 0;
  const ensure = (n: number) => {
    if (op + n <= out.length) return;
    const nb = new Uint8Array(Math.max(out.length * 2, op + n));
    nb.set(out);
    out = nb;
  };
  const getBit = () => {
    if (!bit) {
      if (pos >= src.length) throw new Error('inflate: unexpected end');
      tag = src[pos++];
      bit = 8;
    }
    const b = tag & 1;
    tag >>= 1;
    bit--;
    return b;
  };
  const bits = (n: number) => {
    let v = 0;
    for (let i = 0; i < n; i++) v |= getBit() << i;
    return v;
  };
  const sym = (t: Tree) => {
    let sum = 0,
      cur = 0,
      len = 0;
    do {
      cur = 2 * cur + getBit();
      len++;
      sum += t.count[len];
      cur -= t.count[len];
    } while (cur >= 0);
    return t.symbol[sum + cur];
  };
  for (;;) {
    const last = getBit();
    const type = bits(2);
    if (type === 0) {
      // stored block: skip to a byte boundary
      bit = 0;
      const len = src[pos] | (src[pos + 1] << 8);
      pos += 4;
      ensure(len);
      out.set(src.subarray(pos, pos + len), op);
      op += len;
      pos += len;
    } else {
      let lt: Tree, dt: Tree;
      if (type === 1) [lt, dt] = fixed();
      else if (type === 2) {
        const hlit = bits(5) + 257,
          hdist = bits(5) + 1,
          hclen = bits(4) + 4;
        const cl = new Uint8Array(19);
        for (let i = 0; i < hclen; i++) cl[CLORDER[i]] = bits(3);
        const ct = build(cl, 0, 19);
        const lens = new Uint8Array(hlit + hdist);
        for (let i = 0; i < hlit + hdist; ) {
          const s = sym(ct);
          if (s < 16) lens[i++] = s;
          else {
            let prev = 0,
              rep = 0;
            if (s === 16) {
              prev = lens[i - 1];
              rep = 3 + bits(2);
            } else if (s === 17) rep = 3 + bits(3);
            else rep = 11 + bits(7);
            while (rep--) lens[i++] = prev;
          }
        }
        lt = build(lens, 0, hlit);
        dt = build(lens, hlit, hdist);
      } else throw new Error('inflate: bad block type');
      for (;;) {
        const s = sym(lt);
        if (s === 256) break;
        if (s < 256) {
          ensure(1);
          out[op++] = s;
        } else {
          const li = s - 257;
          const len = LBASE[li] + bits(LEXT[li]);
          const di = sym(dt);
          const dist = DBASE[di] + bits(DEXT[di]);
          ensure(len);
          for (let k = 0; k < len; k++, op++) out[op] = out[op - dist];
        }
      }
    }
    if (last) break;
  }
  return out.subarray(0, op);
}
