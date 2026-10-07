// Kemitestet: facit får aldrig vara fel.
// Kör med: npm test   (eller node --test test/)

import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as K from '../js/kemi.js'
import { layout, vinkel } from '../js/geometri.js'

test('armarna stämmer med verklig valens', () => {
  assert.equal(K.GRUNDAMNEN.H.armar, 1)
  assert.equal(K.GRUNDAMNEN.O.armar, 2)
  assert.equal(K.GRUNDAMNEN.N.armar, 3)
  assert.equal(K.GRUNDAMNEN.C.armar, 4)
})

test('fria elektronpar: syre 2, kväve 1, kol och väte 0', () => {
  assert.equal(K.friaPar('O'), 2)
  assert.equal(K.friaPar('N'), 1)
  assert.equal(K.friaPar('C'), 0)
  assert.equal(K.friaPar('H'), 0)
})

test('grundämnena står i rätt grupp och period', () => {
  for (const [el, g] of Object.entries(K.GRUNDAMNEN)) {
    const rad = K.TABELL[g.period - 1]
    assert.equal(rad[K.KOLUMNER.indexOf(g.grupp)], el, `${el} på fel plats`)
  }
})

test('vatten oavsett ordning', () => {
  for (const steg of [['H', 'O', 'H'], ['O', 'H', 'H']]) {
    const m = K.bygg(steg)
    assert.ok(K.arKlar(m))
    assert.equal(K.formel(m), 'H2O')
    assert.equal(K.namnPa(m), 'vatten')
  }
})

test('metan oavsett ordning', () => {
  for (const steg of [['C', 'H', 'H', 'H', 'H'], ['H', 'C', 'H', 'H', 'H']]) {
    const m = K.bygg(steg)
    assert.ok(K.arKlar(m))
    assert.equal(K.formel(m), 'CH4')
  }
})

test('koldioxid kräver två knäppningar (dubbelbindningar)', () => {
  let m = K.bygg(['C', 'O', 'O'])
  assert.equal(K.arKlar(m), false, 'O–C–O med enkelbindningar ska inte vara klar')
  assert.equal(K.totaltLediga(m), 4)
  m = K.bygg(['C', 'O', 'O', 'knapp'])
  assert.equal(K.arKlar(m), false)
  m = K.bygg(['C', 'O', 'O', 'knapp', 'knapp'])
  assert.ok(K.arKlar(m))
  assert.equal(K.formel(m), 'CO2')
  assert.deepEqual(m.bindningar.map((b) => b[2]), [2, 2])
  assert.equal(K.kanKnappa(m), false)
})

test('koldioxid går också att bygga med syre först', () => {
  const m = K.bygg(['O', 'C', 'O', 'knapp', 'knapp'])
  assert.ok(K.arKlar(m))
  assert.equal(K.formel(m), 'CO2')
})

test('en full molekyl tar inte emot fler atomer', () => {
  const h2 = K.bygg(['H', 'H'])
  assert.ok(K.arKlar(h2))
  assert.equal(K.formel(h2), 'H2')
  assert.equal(K.fast(h2, 'O').ok, false)
})

test('syrgas blir O=O', () => {
  const m = K.bygg(['O', 'O', 'knapp'])
  assert.ok(K.arKlar(m))
  assert.equal(K.namnPa(m), 'syrgas')
})

test('en ensam atom är ingen färdig molekyl', () => {
  assert.equal(K.arKlar(K.atom('H')), false)
  assert.equal(K.arKlar(K.atom('O')), false)
})

test('Hill-ordning i formeln', () => {
  assert.equal(K.formel(K.bygg(['O', 'H', 'C', 'H', 'H', 'H'])), 'CH4O')
  assert.equal(K.formel(K.bygg(['O', 'H', 'O', 'H'])), 'H2O2')
  assert.equal(K.snyggFormel('CO2'), 'CO₂')
})

test('varje namn i tabellen har en formel som går att bygga som ett träd', () => {
  for (const f of Object.keys(K.NAMN)) {
    const delar = [...f.matchAll(/([A-Z][a-z]?)(\d*)/g)]
    let n = 0
    let armar = 0
    for (const [, el, tal] of delar) {
      const c = tal ? Number(tal) : 1
      n += c
      armar += K.GRUNDAMNEN[el].armar * c
    }
    // Ett träd med n atomer har n-1 bindningar; varje bindning tar två armar.
    // Resten måste gå jämnt upp i dubbel- och trippelbindningar.
    assert.equal(armar % 2, 0, `${f}: udda antal armar`)
    assert.ok(armar >= 2 * (n - 1), `${f}: för få armar för att hålla ihop`)
  }
})

test('namn med flera möjliga molekyler finns inte i tabellen', () => {
  assert.equal(K.NAMN.C2H6O, undefined, 'etanol och dimetyleter har samma formel')
})

test('varje beställning går att bygga och ger rätt formel', () => {
  for (const b of K.BESTALLNINGAR) {
    const m = K.bygg(b.bygg)
    assert.ok(K.arKlar(m), `${b.formel} blev inte klar`)
    assert.equal(K.formel(m), b.formel)
    assert.ok(K.NAMN[b.formel], `${b.formel} saknar namn`)
  }
})

test('beställningarna använder bara upplåsta grundämnen', () => {
  for (const b of K.BESTALLNINGAR) {
    for (const s of b.bygg) if (s !== 'knapp') assert.ok(K.UPPLASTA.includes(s), `${s} är låst`)
  }
})

test('stödet minskar: bild → formel → namn', () => {
  assert.deepEqual(K.BESTALLNINGAR.map((b) => b.visar), ['bild', 'formel', 'namn'])
})

test('formen: koldioxid rak, metan tetraeder, vatten vinklat', () => {
  const co2 = K.bygg(['C', 'O', 'O', 'knapp', 'knapp'])
  assert.ok(Math.abs(vinkel(layout(co2).pos, 1, 0, 2) - 180) < 0.5)

  const ch4 = K.bygg(['C', 'H', 'H', 'H', 'H'])
  const p = layout(ch4).pos
  for (const [a, b] of [[1, 2], [1, 3], [2, 4], [3, 4]]) {
    assert.ok(Math.abs(vinkel(p, a, 0, b) - 109.47) < 0.5)
  }

  const h2o = K.bygg(['O', 'H', 'H'])
  const v = vinkel(layout(h2o).pos, 1, 0, 2)
  assert.ok(v > 100 && v < 115, `vatten ska vara vinklat, blev ${v.toFixed(1)}°`)
})

test('lediga armar får varsin riktning', () => {
  const m = K.bygg(['C', 'O'])
  const l = layout(m)
  assert.equal(l.armar[0].length, 3)
  assert.equal(l.armar[1].length, 1)
})
