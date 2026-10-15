// Genera iconos PNG placeholder para la extensión (sol sobre cielo y colina).
// ⚠ Sobrescribe los iconos definitivos de Codex. Solo como respaldo: node scripts/make-placeholder-icons.mjs
// Sin dependencias: codifica PNG a mano.
import { writeFileSync, mkdirSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t))

function sample(x, y) {
  // coordenadas 0..1 → [r,g,b,a]
  const r = 0.22, inside = (() => {
    const dx = Math.max(r - x, 0, x - (1 - r)), dy = Math.max(r - y, 0, y - (1 - r))
    return dx * dx + dy * dy <= r * r
  })()
  if (!inside) return [0, 0, 0, 0]
  const hill = y > 0.68 + 0.08 * Math.sin(x * 3.2 + 0.4)
  if (hill) return [...mix(hex('#9fcd6e'), hex('#4f8a34'), (y - 0.65) / 0.35), 255]
  const sun = (x - 0.5) ** 2 + (y - 0.45) ** 2 < 0.2 ** 2
  if (sun) return [...hex('#f8c94a'), 255]
  return [...mix(hex('#b7d4f1'), hex('#eef6fd'), y / 0.7), 255]
}

function png(size) {
  const ss = 4
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const acc = [0, 0, 0, 0]
      for (let sy = 0; sy < ss; sy++)
        for (let sx = 0; sx < ss; sx++) {
          const p = sample((x + (sx + 0.5) / ss) / size, (y + (sy + 0.5) / ss) / size)
          acc[0] += p[0] * p[3]; acc[1] += p[1] * p[3]; acc[2] += p[2] * p[3]; acc[3] += p[3]
        }
      const o = y * (size * 4 + 1) + 1 + x * 4
      const a = acc[3] / (ss * ss)
      raw[o] = a ? acc[0] / acc[3] : 0
      raw[o + 1] = a ? acc[1] / acc[3] : 0
      raw[o + 2] = a ? acc[2] / acc[3] : 0
      raw[o + 3] = Math.round(a)
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr.set([8, 6, 0, 0, 0], 8)
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

mkdirSync('extension/icons', { recursive: true })
for (const s of [16, 32, 48, 128]) writeFileSync(`extension/icons/icon-${s}.png`, png(s))
console.log('Iconos generados en extension/icons/')
