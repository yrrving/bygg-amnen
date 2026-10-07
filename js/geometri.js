// Molekylens form i 3D, utan three.js så att den går att testa i Node.
//
// Förenklad VSEPR: varje atom har lika många "riktningar" som den har grannar,
// lediga armar och fria elektronpar. Riktningarna sprids så långt isär som
// möjligt: två ger en rak linje, tre en plan triangel och fyra en tetraeder.
// Det gör koldioxid rak, metan till en tetraeder och vatten vinklat
// (109,5° här, 104,5° i verkligheten, se FORENKLINGAR.md).

import { GRUNDAMNEN, friaPar, lediga } from './kemi.js'

export const BINDNINGSLANGD = 0.52

const s3 = Math.sqrt(3)
const BAS = {
  1: [[0, 1, 0]],
  2: [[0, 1, 0], [0, -1, 0]],
  3: [[0, 1, 0], [s3 / 2, -0.5, 0], [-s3 / 2, -0.5, 0]],
  4: [
    [1, 1, 1],
    [1, -1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
  ].map(norm),
}

function norm(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}
function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}
function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}
function mul(a, s) {
  return [a[0] * s, a[1] * s, a[2] * s]
}
function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

/** Rotation (Rodrigues) som vrider enhetsvektorn a till b, tillämpad på v. */
function vrid(a, b, v) {
  const c = dot(a, b)
  if (c > 0.999999) return v
  if (c < -0.999999) {
    // Motsatt riktning: vrid 180° runt valfri axel vinkelrät mot a.
    let ax = cross(a, [1, 0, 0])
    if (Math.hypot(...ax) < 1e-6) ax = cross(a, [0, 0, 1])
    ax = norm(ax)
    return sub(mul(ax, 2 * dot(ax, v)), v)
  }
  const k = norm(cross(a, b))
  const s = Math.sqrt(1 - c * c)
  return add(add(mul(v, c), mul(cross(k, v), s)), mul(k, dot(k, v) * (1 - c)))
}

function grannar(m, i) {
  const g = []
  for (const [a, b] of m.bindningar) {
    if (a === i) g.push(b)
    else if (b === i) g.push(a)
  }
  return g
}

/** Antal riktningar runt en atom. */
export function riktningar(m, i) {
  return Math.min(4, grannar(m, i).length + lediga(m, i) + friaPar(m.atomer[i]))
}

/**
 * Positioner för varje atom och riktningar för varje ledig arm.
 * Molekylen är alltid ett träd (bänken bygger inga ringar).
 */
export function layout(m) {
  const n = m.atomer.length
  const pos = new Array(n)
  const armar = Array.from({ length: n }, () => [])
  if (n === 0) return { pos: [], armar: [] }
  pos[0] = [0, 0, 0]
  const besokt = new Set([0])
  const ko = [[0, null]]
  while (ko.length) {
    const [i, foralder] = ko.shift()
    const antal = Math.max(1, riktningar(m, i))
    let dirs = BAS[antal]
    const barn = grannar(m, i).filter((g) => !besokt.has(g))
    if (foralder !== null) {
      const u = norm(sub(pos[foralder], pos[i]))
      dirs = dirs.map((d) => vrid(dirs[0], u, d))
      dirs = dirs.slice(1)
    }
    let k = 0
    for (const c of barn) {
      const d = dirs[k++]
      pos[c] = add(pos[i], mul(d, BINDNINGSLANGD))
      besokt.add(c)
      ko.push([c, i])
    }
    for (let f = 0; f < lediga(m, i); f++) armar[i].push(dirs[k++])
  }
  // Centrera kring tyngdpunkten.
  const mitt = mul(pos.reduce(add, [0, 0, 0]), 1 / n)
  return { pos: pos.map((p) => sub(p, mitt)), armar }
}

/** Vinkeln a–mitt–b i grader. */
export function vinkel(pos, a, mitt, b) {
  const u = norm(sub(pos[a], pos[mitt]))
  const v = norm(sub(pos[b], pos[mitt]))
  return (Math.acos(Math.max(-1, Math.min(1, dot(u, v)))) * 180) / Math.PI
}

export function radie(el) {
  return GRUNDAMNEN[el].radie
}
