// Labbet: scen, spelare, ytor och interaktioner.
// Kemin bor i kemi.js och formen i geometri.js. Här finns bara spelet.

import * as THREE from '../vendor/three.module.js'
import * as K from './kemi.js'
import { layout } from './geometri.js'

const REDUCERAD = matchMedia('(prefers-reduced-motion: reduce)').matches
const FART = 4.2
const SPELARRADIE = 0.33

// ---------------------------------------------------------------- Scen

const duk = document.getElementById('duk')
const renderer = new THREE.WebGLRenderer({ canvas: duk, antialias: true, preserveDrawingBuffer: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

const scen = new THREE.Scene()
scen.background = new THREE.Color('#bfe3ef')

const kamera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
kamera.position.set(0, 14.5, 10.5)
kamera.lookAt(0, 0, 0.4)

function anpassa() {
  const w = innerWidth
  const h = innerHeight
  renderer.setSize(w, h, false)
  kamera.aspect = w / h
  // Hela rummet (16 enheter brett) ska synas även i smala fönster.
  const behov = (2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(29)) / kamera.aspect) * 180) / Math.PI
  kamera.fov = Math.min(75, Math.max(38, behov))
  // I breda fönster skjuts bilden ned så att beställningskortet får plats
  // ovanför bakväggen och inte täcker periodiska systemet.
  if (kamera.aspect > 1.2) kamera.setViewOffset(w, h, 0, -Math.round(h * 0.13), w, h)
  else kamera.clearViewOffset()
  kamera.updateProjectionMatrix()
}
addEventListener('resize', anpassa)
anpassa()

scen.add(new THREE.HemisphereLight('#ffffff', '#8a9bb0', 1.7))
const sol = new THREE.DirectionalLight('#ffffff', 2.3)
sol.position.set(5, 12, 7)
sol.castShadow = true
sol.shadow.mapSize.set(2048, 2048)
Object.assign(sol.shadow.camera, { left: -11, right: 11, top: 8, bottom: -8, near: 1, far: 40 })
sol.shadow.bias = -0.0005
scen.add(sol)

const materialer = new Map()
function mat(farg, extra = {}) {
  const nyckel = farg + JSON.stringify(extra)
  if (!materialer.has(nyckel)) materialer.set(nyckel, new THREE.MeshStandardMaterial({ color: farg, roughness: 0.65, ...extra }))
  return materialer.get(nyckel)
}

function lada(b, h, d, farg) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(b, h, d), mat(farg))
  m.castShadow = true
  m.receiveShadow = true
  return m
}

// ---------------------------------------------------------------- Text

function rundRekt(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function textTextur(text, { b = 512, h = 128, bg = '#ffffff', fg = '#17202b', storlek = 64, vikt = 700 } = {}) {
  const c = document.createElement('canvas')
  c.width = b
  c.height = h
  const ctx = c.getContext('2d')
  if (bg) {
    ctx.fillStyle = bg
    rundRekt(ctx, 4, 4, b - 8, h - 8, h * 0.3)
    ctx.fill()
  }
  ctx.fillStyle = fg
  ctx.font = `${vikt} ${storlek}px system-ui, -apple-system, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, b / 2, h / 2 + 2)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

function etikett(text, bredd, opts) {
  const t = textTextur(text, opts)
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false }))
  s.scale.set(bredd, bredd * (t.image.height / t.image.width), 1)
  return s
}

function vid(obj, x, y, z) {
  obj.position.set(x, y, z)
  return obj
}

// ---------------------------------------------------------------- Rummet

const RUM = { minX: -8, maxX: 8, minZ: -5, maxZ: 5 }

{
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#f3efe6'
  ctx.fillRect(0, 0, 128, 128)
  ctx.fillStyle = '#e2dccf'
  ctx.fillRect(0, 0, 64, 64)
  ctx.fillRect(64, 64, 64, 64)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(8, 5)
  t.magFilter = THREE.NearestFilter
  const golv = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }))
  golv.rotation.x = -Math.PI / 2
  golv.receiveShadow = true
  scen.add(golv)

  const bakvagg = lada(16.6, 2.7, 0.3, '#d6e6ec')
  bakvagg.position.set(0, 1.35, -5.15)
  scen.add(bakvagg)
  for (const x of [-8.15, 8.15]) {
    const v = lada(0.3, 0.8, 10.3, '#c9dbe2')
    v.position.set(x, 0.4, 0)
    scen.add(v)
  }
}

// ---------------------------------------------------------------- Ytor

const hinder = []
const ytor = []

const YTFARG = {
  disk: ['#9aa7b5', '#eef1f4'],
  hylla: ['#5f86a6', '#e3edf5'],
  bank: ['#7a64b8', '#ece6fa'],
  leverans: ['#3f8f60', '#e0f3e8'],
  atervinning: ['#4d8f3f', '#e4f2df'],
}

function yta(typ, x, z, extra = {}) {
  const grupp = new THREE.Group()
  grupp.position.set(x, 0, z)
  const [bas, topp] = YTFARG[typ]
  if (typ === 'atervinning') {
    const tunna = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.86, 24), mat(bas))
    tunna.position.y = 0.43
    tunna.castShadow = true
    grupp.add(tunna)
    const kant = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 8, 24), mat('#2f5f27'))
    kant.rotation.x = Math.PI / 2
    kant.position.y = 0.86
    grupp.add(kant)
  } else {
    const kropp = lada(0.96, 0.86, 0.96, bas)
    kropp.position.y = 0.43
    grupp.add(kropp)
    const skiva = lada(1, 0.08, 1, topp)
    skiva.position.y = 0.9
    grupp.add(skiva)
  }
  scen.add(grupp)
  hinder.push({ minX: x - 0.5, maxX: x + 0.5, minZ: z - 0.5, maxZ: z + 0.5 })
  const y = { typ, x, z, grupp, item: null, ...extra }
  ytor.push(y)
  return y
}

// Hyllan: periodiska systemets huvudgrupper längs bakväggen till vänster.
const hyllor = K.KOLUMNER.map((grupp, i) => {
  const x = -7.5 + i
  const el = K.TABELL.map((rad) => rad[i]).find((s) => s && K.UPPLASTA.includes(s)) || null
  const h = yta('hylla', x, -4.5, { el, kolumn: grupp })
  // Skylt på framsidan.
  const skylt = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.5),
    new THREE.MeshBasicMaterial({
      map: el
        ? textTextur(el, { b: 256, h: 160, bg: K.GRUNDAMNEN[el].farg, fg: el === 'H' ? '#17202b' : '#ffffff', storlek: 110, vikt: 800 })
        : textTextur('?', { b: 256, h: 160, bg: '#c4ccd4', fg: '#4a5866', storlek: 110, vikt: 800 }),
    }),
  )
  skylt.position.set(0, 0.5, 0.485)
  h.grupp.add(skylt)
  // En liten hög atomer ovanpå visar vad som finns.
  if (el) {
    const g = K.GRUNDAMNEN[el]
    for (const [dx, dz, dy] of [[-0.18, 0.1, 0], [0.18, 0.08, 0], [0, -0.15, 0], [0, 0, 0.22]]) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(g.radie * 0.9, 20, 14), mat(g.farg))
      s.position.set(dx, 0.94 + g.radie * 0.9 + dy, dz)
      s.castShadow = true
      h.grupp.add(s)
    }
  }
  return h
})

// Tavlan över hyllan visar hela den förkortade tabellen.
const tavlaCanvas = document.createElement('canvas')
tavlaCanvas.width = 1600
tavlaCanvas.height = 300
const tavlaTextur = new THREE.CanvasTexture(tavlaCanvas)
tavlaTextur.colorSpace = THREE.SRGBColorSpace
{
  const tavla = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.5), new THREE.MeshBasicMaterial({ map: tavlaTextur }))
  tavla.position.set(-4, 1.8, -4.99)
  scen.add(tavla)
}
function ritaTavla() {
  const ctx = tavlaCanvas.getContext('2d')
  const B = 200
  ctx.fillStyle = '#20313f'
  ctx.fillRect(0, 0, 1600, 300)
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 34px system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('Periodiska systemet · huvudgrupperna', 20, 28)
  K.TABELL.forEach((rad, r) => {
    rad.forEach((sym, k) => {
      if (!sym) return
      const x = k * B + 10
      const y = 60 + r * 118
      const kand = K.UPPLASTA.includes(sym)
      ctx.fillStyle = kand ? K.GRUNDAMNEN[sym].farg : '#3a4d5d'
      rundRekt(ctx, x, y, B - 20, 108, 14)
      ctx.fill()
      ctx.textAlign = 'center'
      ctx.fillStyle = kand && sym === 'H' ? '#17202b' : '#ffffff'
      ctx.font = '800 58px system-ui, sans-serif'
      ctx.fillText(kand ? sym : '?', x + (B - 20) / 2, y + 44)
      if (kand) {
        ctx.font = '600 26px system-ui, sans-serif'
        ctx.fillText(K.GRUNDAMNEN[sym].namn, x + (B - 20) / 2, y + 88)
      }
    })
  })
  tavlaTextur.needsUpdate = true
}
ritaTavla()

// Mittdisken delar labbet. Man kan gå runt den längst fram, men det är
// närmare att räcka över saker.
for (let z = -4.5; z <= 1.5; z++) yta('disk', 0.5, z)

yta('disk', -7.5, -2.5)
yta('atervinning', -7.5, 3.5)

function framskylt(y, text, bredd = 0.94) {
  const t = textTextur(text, { b: 512, h: 128, bg: '#ffffff', storlek: 58 })
  const s = new THREE.Mesh(new THREE.PlaneGeometry(bredd, bredd / 4), new THREE.MeshBasicMaterial({ map: t }))
  s.position.set(0, 0.55, 0.485)
  y.grupp.add(s)
  return s
}

const bank = yta('bank', 4.5, -4.5)
framskylt(bank, 'Bindningsbänk')
yta('disk', 3.5, -4.5)
yta('disk', 5.5, -4.5)

const leverans = yta('leverans', 7.5, 0.5)
{
  const vag = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.06, 28), mat('#c9d3dc', { metalness: 0.4 }))
  vag.position.y = 0.97
  leverans.grupp.add(vag)
  const skylt = framskylt(leverans, 'Leverans')
  skylt.position.set(-0.485, 0.55, 0)
  skylt.rotation.y = -Math.PI / 2
}
const vagCanvas = document.createElement('canvas')
vagCanvas.width = 512
vagCanvas.height = 160
const vagTextur = new THREE.CanvasTexture(vagCanvas)
vagTextur.colorSpace = THREE.SRGBColorSpace
{
  const skarm = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), new THREE.MeshBasicMaterial({ map: vagTextur }))
  skarm.position.set(-0.35, 1.6, 0)
  // Parallell med skärmen, så att texten alltid ligger rakt.
  skarm.quaternion.copy(kamera.quaternion)
  leverans.grupp.add(skarm)
}
function visaVag(text) {
  const ctx = vagCanvas.getContext('2d')
  ctx.fillStyle = '#17202b'
  rundRekt(ctx, 0, 0, 512, 160, 30)
  ctx.fill()
  ctx.fillStyle = '#7ef0a8'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '600 30px system-ui, sans-serif'
  ctx.fillText('Vågen räknar', 256, 42)
  ctx.font = '800 50px system-ui, sans-serif'
  ctx.fillText(text, 256, 108)
  vagTextur.needsUpdate = true
}
visaVag('–')

yta('atervinning', 7.5, 3.5)

// ---------------------------------------------------------------- Molekyler i 3D

const ATOMGEO = {}
const ETIKETTMAT = {}
for (const [el, g] of Object.entries(K.GRUNDAMNEN)) {
  ATOMGEO[el] = new THREE.SphereGeometry(g.radie, 28, 20)
  ETIKETTMAT[el] = new THREE.SpriteMaterial({
    map: textTextur(el, { b: 128, h: 128, bg: null, fg: el === 'H' ? '#17202b' : '#ffffff', storlek: 96, vikt: 800 }),
    depthWrite: false,
  })
}
const PINNE = new THREE.CylinderGeometry(0.035, 0.035, 1, 10)
const ARM = new THREE.CylinderGeometry(0.03, 0.03, 1, 8)
const HAND = new THREE.SphereGeometry(0.065, 12, 10)
const UPP = new THREE.Vector3(0, 1, 0)

function molekylMesh(m) {
  const grupp = new THREE.Group()
  const { pos, armar } = layout(m)
  let v = pos.map((p) => new THREE.Vector3(...p))
  // Lägg molekylen ned: de två atomer som är längst ifrån varandra hamnar
  // längs x-axeln. Det ändrar inte formen, bara hur den ligger.
  let langst = null
  let ld = 0
  for (let a = 0; a < v.length; a++) for (let b = a + 1; b < v.length; b++) {
    const d = v[a].distanceToSquared(v[b])
    if (d > ld + 1e-6) { ld = d; langst = v[b].clone().sub(v[a]).normalize() }
  }
  const lagg = langst ? new THREE.Quaternion().setFromUnitVectors(langst, new THREE.Vector3(1, 0, 0)) : new THREE.Quaternion()
  v = v.map((p) => p.applyQuaternion(lagg))
  const armDir = armar.map((lista) => lista.map((d) => new THREE.Vector3(...d).applyQuaternion(lagg)))
  grupp.userData.armar = []
  grupp.userData.etiketter = []

  m.atomer.forEach((el, i) => {
    const s = new THREE.Mesh(ATOMGEO[el], mat(K.GRUNDAMNEN[el].farg))
    s.position.copy(v[i])
    s.castShadow = true
    grupp.add(s)
    const e = new THREE.Sprite(ETIKETTMAT[el])
    const r = K.GRUNDAMNEN[el].radie
    e.scale.setScalar(r * 1.9)
    grupp.add(e)
    grupp.userData.etiketter.push({ e, mitt: v[i], r })

    armDir[i].forEach((riktning, k) => {
      const a = new THREE.Group()
      a.position.copy(v[i])
      const bas = new THREE.Quaternion().setFromUnitVectors(UPP, riktning)
      a.quaternion.copy(bas)
      const langd = r + 0.26
      const pinne = new THREE.Mesh(ARM, mat('#e8b100'))
      pinne.scale.y = langd
      pinne.position.y = langd / 2
      const hand = new THREE.Mesh(HAND, mat('#ffcf3a', { emissive: '#7a5a00', emissiveIntensity: 0.4 }))
      hand.position.y = langd
      a.add(pinne, hand)
      grupp.add(a)
      grupp.userData.armar.push({ a, bas, fas: i * 1.7 + k * 2.3 })
    })
  })

  for (const [a, b, o] of m.bindningar) {
    const mitt = v[a].clone().add(v[b]).multiplyScalar(0.5)
    const dir = v[b].clone().sub(v[a])
    const langd = dir.length()
    dir.normalize()
    let vinkelratt = new THREE.Vector3().crossVectors(dir, kamera.position.clone().normalize())
    if (vinkelratt.lengthSq() < 1e-4) vinkelratt = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(1, 0, 0))
    vinkelratt.normalize()
    const forskjut = o === 1 ? [0] : o === 2 ? [-0.055, 0.055] : [-0.075, 0, 0.075]
    for (const f of forskjut) {
      const p = new THREE.Mesh(PINNE, mat('#d4d8dd'))
      p.scale.y = langd
      p.position.copy(mitt).addScaledVector(vinkelratt, f)
      p.quaternion.setFromUnitVectors(UPP, dir)
      grupp.add(p)
    }
  }
  return grupp
}

// Varje hållare (spelare eller yta) har högst ett föremål, och dess mesh
// byggs om bara när molekylen ändras.
const visade = new Map()
function synka(hallare, mol, placera) {
  let v = visade.get(hallare)
  const nyckel = mol ? JSON.stringify(mol) : null
  if (!v || v.nyckel !== nyckel) {
    if (v?.mesh) scen.remove(v.mesh)
    v = { nyckel, mesh: mol ? molekylMesh(mol) : null }
    if (v.mesh) scen.add(v.mesh)
    visade.set(hallare, v)
  }
  if (v.mesh) placera(v.mesh)
}

const tmpQ = new THREE.Quaternion()
const tmpV = new THREE.Vector3()
function uppdateraMolekyl(mesh, t) {
  const amp = REDUCERAD ? 0.1 : 0.42
  const frekvens = REDUCERAD ? 2 : 7
  for (const { a, bas, fas } of mesh.userData.armar) {
    tmpQ.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.sin(t * frekvens + fas) * amp)
    a.quaternion.copy(bas).multiply(tmpQ)
  }
  // Symbolen ligger alltid på den sida av atomen som vetter mot kameran.
  mesh.getWorldQuaternion(tmpQ).invert()
  const mot = tmpV.copy(kamera.position).sub(mesh.position).normalize().applyQuaternion(tmpQ)
  for (const { e, mitt, r } of mesh.userData.etiketter) e.position.copy(mitt).addScaledVector(mot, r * 1.45)
}

// ---------------------------------------------------------------- Spelare

function skapaSpelare(nr, farg, x, z) {
  const grupp = new THREE.Group()
  const kropp = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.74, 20), mat('#fbfbfb'))
  kropp.position.y = 0.55
  const huvud = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 18), mat('#f1c9a5'))
  huvud.position.y = 1.13
  const har = new THREE.Mesh(new THREE.SphereGeometry(0.25, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(nr === 1 ? '#4a3426' : '#2b2b2b'))
  har.position.y = 1.16
  har.rotation.x = -0.25
  const glas = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.12), mat(farg, { roughness: 0.2 }))
  glas.position.set(0, 1.15, 0.2)
  const krage = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 8, 20), mat(farg))
  krage.rotation.x = Math.PI / 2
  krage.position.y = 0.9
  for (const del of [kropp, huvud, har, glas, krage]) {
    del.castShadow = true
    grupp.add(del)
  }
  const bricka = etikett(String(nr), 0.42, { b: 128, h: 128, bg: farg, fg: '#ffffff', storlek: 84, vikt: 800 })
  bricka.position.y = 1.75
  grupp.add(bricka)
  grupp.position.set(x, 0, z)
  scen.add(grupp)

  const pil = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 14), mat(farg, { emissive: farg, emissiveIntensity: 0.35 }))
  pil.rotation.x = Math.PI
  pil.visible = false
  scen.add(pil)

  return { nr, farg, grupp, kropp, start: [x, z], x, z, vx: 0, vz: 0, fx: 0, fz: 1, vinkel: 0, held: null, mal: null, pil, pad: null, padA: false, padY: false }
}

const spelare = [skapaSpelare(1, '#1f6fd1', -4, 0), skapaSpelare(2, '#c2410c', 4, 0)]

// ---------------------------------------------------------------- Inmatning

const nere = new Set()
const TANGENTER = [
  { upp: 'KeyW', ner: 'KeyS', vanster: 'KeyA', hoger: 'KeyD', anvand: ['KeyE'] },
  { upp: 'ArrowUp', ner: 'ArrowDown', vanster: 'ArrowLeft', hoger: 'ArrowRight', anvand: ['Enter', 'NumpadEnter'] },
]

addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault()
  nere.add(e.code)
  if (e.repeat) return
  if (e.code === 'KeyB') return vaxlaHandbok()
  if (e.code === 'Escape' && !handbok.hidden) return vaxlaHandbok(false)
  if (lage !== 'spel') {
    // Enter och mellanslag på en fokuserad knapp sköts av knappen själv.
    if (document.activeElement?.tagName === 'BUTTON' && ['Enter', 'NumpadEnter', 'Space'].includes(e.code)) return
    if (['KeyE', 'Enter', 'NumpadEnter', 'Space'].includes(e.code)) {
      if (lage === 'start') borja()
      else if (lage === 'klar') omstart()
    }
    return
  }
  if (!handbok.hidden) return
  TANGENTER.forEach((t, i) => {
    if (t.anvand.includes(e.code)) anvand(spelare[i])
  })
})
addEventListener('keyup', (e) => nere.delete(e.code))
addEventListener('blur', () => nere.clear())

function riktningFor(i) {
  const t = TANGENTER[i]
  let x = (nere.has(t.hoger) ? 1 : 0) - (nere.has(t.vanster) ? 1 : 0)
  let z = (nere.has(t.ner) ? 1 : 0) - (nere.has(t.upp) ? 1 : 0)
  const p = spelare[i].pad
  if (p && (p.x || p.z)) {
    x = p.x
    z = p.z
  }
  return [x, z]
}

function lasHandkontroller() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : []
  for (let i = 0; i < 2; i++) {
    const p = pads[i]
    const sp = spelare[i]
    if (!p) {
      sp.pad = null
      continue
    }
    const dz = (v) => (Math.abs(v) > 0.25 ? v : 0)
    const knapp = (n) => !!p.buttons[n]?.pressed
    let x = dz(p.axes[0] || 0)
    let z = dz(p.axes[1] || 0)
    if (knapp(14)) x = -1
    if (knapp(15)) x = 1
    if (knapp(12)) z = -1
    if (knapp(13)) z = 1
    sp.pad = { x, z }
    const a = knapp(0)
    if (a && !sp.padA) {
      if (lage === 'start') borja()
      else if (lage === 'klar') omstart()
      else if (handbok.hidden) anvand(sp)
    }
    sp.padA = a
    const y = knapp(3)
    if (y && !sp.padY) vaxlaHandbok()
    sp.padY = y
  }
}

// ---------------------------------------------------------------- Rörelse

function krock(sp) {
  for (let varv = 0; varv < 2; varv++) {
    for (const h of hinder) {
      const nx = Math.max(h.minX, Math.min(sp.x, h.maxX))
      const nz = Math.max(h.minZ, Math.min(sp.z, h.maxZ))
      const dx = sp.x - nx
      const dz = sp.z - nz
      const d2 = dx * dx + dz * dz
      if (d2 < SPELARRADIE * SPELARRADIE) {
        const d = Math.sqrt(d2) || 1e-4
        sp.x = nx + (dx / d) * SPELARRADIE
        sp.z = nz + (dz / d) * SPELARRADIE
      }
    }
    sp.x = Math.max(RUM.minX + SPELARRADIE, Math.min(RUM.maxX - SPELARRADIE, sp.x))
    sp.z = Math.max(RUM.minZ + SPELARRADIE, Math.min(RUM.maxZ - SPELARRADIE, sp.z))
  }
}

function flytta(sp, i, dt) {
  let [ix, iz] = riktningFor(i)
  const l = Math.hypot(ix, iz)
  if (l > 1) {
    ix /= l
    iz /= l
  }
  const k = 1 - Math.exp(-dt * 14)
  sp.vx += (ix * FART - sp.vx) * k
  sp.vz += (iz * FART - sp.vz) * k
  sp.x += sp.vx * dt
  sp.z += sp.vz * dt
  if (l > 0.1) {
    const n = Math.hypot(ix, iz)
    sp.fx = ix / n
    sp.fz = iz / n
  }
  krock(sp)
}

function knuffas(a, b) {
  const dx = b.x - a.x
  const dz = b.z - a.z
  const d = Math.hypot(dx, dz)
  const min = SPELARRADIE * 2
  if (d > 0 && d < min) {
    const f = (min - d) / 2
    a.x -= (dx / d) * f
    a.z -= (dz / d) * f
    b.x += (dx / d) * f
    b.z += (dz / d) * f
    krock(a)
    krock(b)
  }
}

function hittaMal(sp) {
  let bast = null
  let poang = Infinity
  for (const y of ytor) {
    const dx = y.x - sp.x
    const dz = y.z - sp.z
    const d = Math.hypot(dx, dz)
    if (d > 1.3) continue
    const rikt = (dx * sp.fx + dz * sp.fz) / d
    if (rikt < 0.3) continue
    const p = d - rikt * 0.5
    if (p < poang) {
      poang = p
      bast = y
    }
  }
  return bast
}

// ---------------------------------------------------------------- Spelregler

let lage = 'start'
let nummer = 0
let vantar = false
const sett = new Set()

function forsta(nyckel, text) {
  if (sett.has(nyckel)) return
  sett.add(nyckel)
  meddela(text)
}

function namnOchSymbol(el) {
  return `${K.GRUNDAMNEN[el].namn.toLowerCase()} (${el})`
}

function beskrivning(m) {
  const n = K.namnPa(m)
  const f = K.snyggFormel(K.formel(m))
  return n ? `${n} (${f})` : f
}

function anvand(sp) {
  const y = sp.mal
  if (!y || vantar) return
  const h = sp.held
  const vem = `Spelare ${sp.nr}`
  switch (y.typ) {
    case 'hylla':
      if (!y.el) return meddela('Den här rutan är inte upptäckt än. Fler grundämnen dyker upp senare.')
      if (h) return meddela(`${vem}: händerna är fulla. Lägg ifrån dig först.`)
      sp.held = K.atom(y.el)
      forsta('hamta', 'Lägg atomen på bindningsbänken. Mittdisken går att räcka saker över.')
      return
    case 'disk':
      if (h && !y.item) {
        y.item = h
        sp.held = null
      } else if (!h && y.item) {
        sp.held = y.item
        y.item = null
      } else if (h && y.item) meddela('Det ligger redan något här.')
      return
    case 'bank':
      return anvandBank(sp, y)
    case 'leverans':
      return leverera(sp)
    case 'atervinning':
      if (!h) return
      sp.held = null
      forsta('atervinn', 'Atomerna går tillbaka till hyllan. Ingenting försvinner.')
      return
  }
}

function anvandBank(sp, y) {
  const h = sp.held
  if (h) {
    if (h.atomer.length > 1) {
      if (y.item) return meddela('Lägg bara en atom i taget på bänken.')
      y.item = h
      sp.held = null
      return
    }
    const el = h.atomer[0]
    const r = K.fast(y.item || K.tom(), el)
    if (!r.ok) {
      return meddela('Alla armar är redan upptagna, så atomen har inget att hålla i. Ta molekylen eller återvinn den.')
    }
    y.item = r.mol
    sp.held = null
    if (r.till !== null) {
      const till = r.mol.atomer[r.till]
      meddela(`${K.GRUNDAMNEN[el].namn} tog tag i ${namnOchSymbol(till)} med en arm.`)
      forsta('lediga', 'Gula armar är lediga. När alla armar håller i något är molekylen klar.')
    }
    if (K.arKlar(r.mol)) meddela(`Klar! Alla armar håller i något. Det blev ${beskrivning(r.mol)}.`, 'lyckad')
    return
  }
  if (!y.item) return meddela('Bänken är tom. Hämta en atom på hyllan.')
  const k = K.knapp(y.item)
  if (k.ok) {
    y.item = k.mol
    const [a, b] = k.par.map((i) => K.GRUNDAMNEN[k.mol.atomer[i]].namn.toLowerCase())
    meddela(`Två lediga armar knäpptes ihop. Nu sitter ${a} och ${b} ihop med en ${k.ordning === 2 ? 'dubbel' : 'trippel'}bindning.`)
    if (K.arKlar(k.mol)) meddela(`Klar! Det blev ${beskrivning(k.mol)}.`, 'lyckad')
    return
  }
  sp.held = y.item
  y.item = null
}

/** "2 H · 1 O", i samma ordning som formeln. */
function vagText(m) {
  return [...K.formel(m).matchAll(/([A-Z][a-z]?)(\d*)/g)].map(([, el, n]) => `${n || 1} ${el}`).join(' · ')
}

function leverera(sp) {
  const h = sp.held
  const b = K.BESTALLNINGAR[nummer]
  if (!h) return meddela(`Vågen väntar på ${b.visar === 'namn' ? K.NAMN[b.formel] : 'beställningen'}.`)
  visaVag(vagText(h))
  if (h.atomer.length === 1) return meddela('En ensam atom är ingen molekyl. Bygg ihop den på bänken.')
  if (!K.arKlar(h)) return meddela('Molekylen har lediga armar (de gula som vickar). Den är inte klar än.')
  if (K.formel(h) !== b.formel) {
    return meddela(`Vågen räknar ${vagText(h)}. Det är ${beskrivning(h)}, men beställningen var något annat. Titta på beställningen igen.`)
  }
  sp.held = null
  firaLeverans(h)
  meddela(`Rätt! ${K.NAMN[b.formel].replace(/^./, (c) => c.toUpperCase())}, ${K.snyggFormel(b.formel)}. ${b.varfor}`, 'lyckad')
  vantar = true
  kort.classList.add('lyckad')
  setTimeout(() => {
    vantar = false
    kort.classList.remove('lyckad')
    nummer++
    if (nummer >= K.BESTALLNINGAR.length) avsluta()
    else visaBestallning()
  }, 2600)
}

// ---------------------------------------------------------------- Effekter

const effekter = []

function firaLeverans(m) {
  const mesh = molekylMesh(m)
  mesh.position.set(leverans.x, 1.3, leverans.z)
  mesh.scale.setScalar(0.8)
  scen.add(mesh)
  effekter.push({ tid: 0, langd: 1.2, steg: (t) => {
    mesh.position.y = 1.3 + t * 1.2
    mesh.scale.setScalar(0.8 * (1 - t))
    mesh.rotation.y += 0.1
    uppdateraMolekyl(mesh, performance.now() / 1000)
  }, klar: () => scen.remove(mesh) })
  if (REDUCERAD) return
  const farger = ['#ffcf3a', '#2f9e5b', '#1f6fd1', '#e0402a', '#7a64b8']
  for (let i = 0; i < 36; i++) {
    const bit = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.02), mat(farger[i % farger.length]))
    bit.position.set(leverans.x - 0.3, 1.4, leverans.z)
    const v = new THREE.Vector3((Math.random() - 0.9) * 4, 3 + Math.random() * 3, (Math.random() - 0.5) * 4)
    scen.add(bit)
    effekter.push({ tid: 0, langd: 1.6, steg: (t, dt) => {
      v.y -= 9 * dt
      bit.position.addScaledVector(v, dt)
      bit.rotation.x += dt * 8
      bit.rotation.z += dt * 6
    }, klar: () => scen.remove(bit) })
  }
}

// ---------------------------------------------------------------- Gränssnitt

const kort = document.getElementById('bestallning')
const bNr = document.getElementById('bNr')
const bVem = document.getElementById('bVem')
const bVisa = document.getElementById('bVisa')
const bTips = document.getElementById('bTips')
const startPanel = document.getElementById('start')
const klarPanel = document.getElementById('klar')
const handbok = document.getElementById('handbok')
const handbokKnapp = document.getElementById('handbokKnapp')
const listaMeddelanden = document.getElementById('meddelanden')
const prompts = [document.getElementById('prompt1'), document.getElementById('prompt2')]

function meddela(text, typ) {
  const sista = listaMeddelanden.lastElementChild
  if (sista && sista.textContent === text && !sista.classList.contains('ut')) {
    clearTimeout(sista._ut)
    clearTimeout(sista._bort)
    sista._ut = setTimeout(() => sista.classList.add('ut'), 6000)
    sista._bort = setTimeout(() => sista.remove(), 6700)
    return
  }
  const li = document.createElement('li')
  li.textContent = text
  if (typ) li.className = typ
  listaMeddelanden.append(li)
  while (listaMeddelanden.children.length > 3) listaMeddelanden.firstElementChild.remove()
  li._ut = setTimeout(() => li.classList.add('ut'), 6000)
  li._bort = setTimeout(() => li.remove(), 6700)
}

const SVG = 'http://www.w3.org/2000/svg'
function svgEl(namn, attr) {
  const e = document.createElementNS(SVG, namn)
  for (const [k, v] of Object.entries(attr)) e.setAttribute(k, v)
  return e
}

/** Kulmodell i 2D, projicerad på de två axlar där molekylen är bredast. */
function bildAv(m) {
  const { pos } = layout(m)
  const spridning = [0, 1, 2].map((ax) => pos.reduce((s, p) => s + p[ax] * p[ax], 0))
  const axlar = [0, 1, 2].sort((a, b) => spridning[b] - spridning[a]).slice(0, 2)
  const p2 = pos.map((p) => [p[axlar[0]] * 110 + 75, -p[axlar[1]] * 110 + 48])
  const svg = svgEl('svg', { viewBox: '0 0 150 96', role: 'img', 'aria-label': `Kulmodell med ${vagText(m)}` })
  for (const [a, b, o] of m.bindningar) {
    const [x1, y1] = p2[a]
    const [x2, y2] = p2[b]
    const l = Math.hypot(x2 - x1, y2 - y1) || 1
    const nx = -(y2 - y1) / l
    const ny = (x2 - x1) / l
    const f = o === 1 ? [0] : o === 2 ? [-3.5, 3.5] : [-5, 0, 5]
    for (const d of f) {
      svg.append(svgEl('line', { x1: x1 + nx * d, y1: y1 + ny * d, x2: x2 + nx * d, y2: y2 + ny * d, stroke: '#7d8794', 'stroke-width': 4, 'stroke-linecap': 'round' }))
    }
  }
  m.atomer.forEach((el, i) => {
    const r = K.GRUNDAMNEN[el].radie * 80
    const [x, y] = p2[i]
    svg.append(svgEl('circle', { cx: x, cy: y, r, fill: K.GRUNDAMNEN[el].farg, stroke: '#17202b', 'stroke-width': 2 }))
    const t = svgEl('text', { x, y: y + 1, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-size': r * 1.15, 'font-weight': 800, fill: el === 'H' ? '#17202b' : '#ffffff', 'font-family': 'system-ui, sans-serif' })
    t.textContent = el
    svg.append(t)
  })
  return svg
}

function visaBestallning() {
  const b = K.BESTALLNINGAR[nummer]
  bNr.textContent = `Beställning ${nummer + 1} av ${K.BESTALLNINGAR.length}`
  bVem.textContent = b.vem
  bVisa.replaceChildren()
  if (b.visar === 'bild') bVisa.append(bildAv(K.bygg(b.bygg)))
  else {
    const s = document.createElement('span')
    s.className = b.visar === 'formel' ? 'formel' : 'namn'
    s.textContent = b.visar === 'formel' ? K.snyggFormel(b.formel) : K.NAMN[b.formel]
    bVisa.append(s)
  }
  bTips.textContent = b.tips
  visaVag('–')
}

function prompt(sp) {
  const y = sp.mal
  if (!y) return ''
  const h = sp.held
  const tangent = sp.pad ? 'A' : sp.nr === 1 ? 'E' : 'Enter'
  const g = (t) => `Spelare ${sp.nr} · [${tangent}] ${t}`
  switch (y.typ) {
    case 'hylla':
      if (!y.el) return `Spelare ${sp.nr} · Tom ruta, inte upptäckt än`
      return h ? `Spelare ${sp.nr} · Händerna är fulla` : g(`Ta ${namnOchSymbol(y.el)}`)
    case 'disk':
      if (h && !y.item) return g('Lägg ner')
      if (!h && y.item) return g('Ta upp')
      return ''
    case 'bank':
      if (h) {
        if (h.atomer.length > 1) return y.item ? `Spelare ${sp.nr} · En atom i taget` : g('Lägg på bänken')
        return g(`Sätt fast ${namnOchSymbol(h.atomer[0])}`)
      }
      if (!y.item) return `Spelare ${sp.nr} · Bindningsbänk`
      return K.kanKnappa(y.item) ? g('Knäpp ihop lediga armar') : g('Ta molekylen')
    case 'leverans':
      return h ? g('Lämna på vågen') : `Spelare ${sp.nr} · Leverans`
    case 'atervinning':
      return h ? g('Återvinn') : `Spelare ${sp.nr} · Återvinning`
  }
  return ''
}

function vaxlaHandbok(visa) {
  if (lage !== 'spel') return
  const ska = visa ?? handbok.hidden
  handbok.hidden = !ska
  if (ska) document.getElementById('stangHandbok').focus()
  else duk.focus?.()
}

function borja() {
  if (lage !== 'start') return
  lage = 'spel'
  startPanel.hidden = true
  kort.hidden = false
  handbokKnapp.hidden = false
  visaBestallning()
}

function avsluta() {
  lage = 'klar'
  kort.hidden = true
  listaMeddelanden.replaceChildren()
  klarPanel.hidden = false
  document.getElementById('igenKnapp').focus()
}

function omstart() {
  if (lage !== 'klar') return
  nummer = 0
  for (const y of ytor) y.item = null
  for (const sp of spelare) {
    sp.held = null
    ;[sp.x, sp.z] = sp.start
    sp.vx = sp.vz = 0
  }
  klarPanel.hidden = true
  kort.hidden = false
  lage = 'spel'
  visaBestallning()
}

document.getElementById('startKnapp').addEventListener('click', borja)
document.getElementById('igenKnapp').addEventListener('click', omstart)
document.getElementById('stangHandbok').addEventListener('click', () => vaxlaHandbok(false))
handbokKnapp.addEventListener('click', () => vaxlaHandbok())
document.getElementById('startKnapp').focus()

// ---------------------------------------------------------------- Loopen

const klocka = new THREE.Clock()

function ruta() {
  const dt = Math.min(0.05, klocka.getDelta())
  const t = klocka.elapsedTime
  lasHandkontroller()

  const igang = lage === 'spel' && handbok.hidden
  spelare.forEach((sp, i) => {
    if (igang) flytta(sp, i, dt)
    else {
      sp.vx = sp.vz = 0
    }
  })
  if (igang) knuffas(spelare[0], spelare[1])

  spelare.forEach((sp, i) => {
    const malVinkel = Math.atan2(sp.fx, sp.fz)
    let d = malVinkel - sp.vinkel
    d = Math.atan2(Math.sin(d), Math.cos(d))
    sp.vinkel += d * Math.min(1, dt * 14)
    sp.grupp.position.set(sp.x, 0, sp.z)
    sp.grupp.rotation.y = sp.vinkel
    const fart = Math.hypot(sp.vx, sp.vz) / FART
    sp.kropp.position.y = 0.55 + (REDUCERAD ? 0 : Math.abs(Math.sin(t * 14)) * 0.05 * fart)

    sp.mal = igang ? hittaMal(sp) : null
    sp.pil.visible = !!sp.mal
    if (sp.mal) sp.pil.position.set(sp.mal.x, 1.75 + (REDUCERAD ? 0 : Math.sin(t * 5) * 0.08) + (sp.mal.item ? 0.5 : 0), sp.mal.z)
    const text = igang ? prompt(sp) : ''
    if (prompts[i].textContent !== text) prompts[i].textContent = text

    synka(sp, sp.held, (m) => {
      m.position.set(sp.x + sp.fx * 0.45, 1.05, sp.z + sp.fz * 0.45)
      m.scale.setScalar(0.7)
      uppdateraMolekyl(m, t)
    })
  })

  for (const y of ytor) {
    synka(y, y.item, (m) => {
      if (y === bank) {
        m.position.set(y.x, 2.05, y.z)
        m.scale.setScalar(1.15)
        if (!REDUCERAD) m.rotation.y = t * 0.6
      } else {
        m.position.set(y.x, 1.25, y.z)
        m.scale.setScalar(0.7)
      }
      uppdateraMolekyl(m, t)
    })
  }

  for (let i = effekter.length - 1; i >= 0; i--) {
    const e = effekter[i]
    e.tid += dt
    const andel = Math.min(1, e.tid / e.langd)
    e.steg(andel, dt)
    if (andel >= 1) {
      e.klar()
      effekter.splice(i, 1)
    }
  }

  renderer.render(scen, kamera)
  requestAnimationFrame(ruta)
}
requestAnimationFrame(ruta)

// För automatiska tester: läsbart läge utan att röra spelet.
window.__labb = { get lage() { return lage }, get nummer() { return nummer }, spelare, ytor, K, anvand }
