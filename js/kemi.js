// Kemin i spelet: grundämnen, bindningsarmar och molekyler.
//
// Ren logik utan grafik, så att den går att testa i Node (test/kemi.test.mjs).
// Varje regel här ska stämma med verkligheten. Förenklingarna står i
// FORENKLINGAR.md och ska hållas uppdaterade.

/**
 * Grundämnena som finns i prototypen.
 * armar = valens, alltså hur många bindningar atomen brukar ha.
 * valensElektroner används bara för att räkna ut fria elektronpar,
 * som påverkar molekylens form (vatten är vinklat, inte rakt).
 * farg följer CPK, samma färger som skolans kulmodeller.
 */
export const GRUNDAMNEN = {
  H: { symbol: 'H', namn: 'Väte', armar: 1, valensElektroner: 1, grupp: 1, period: 1, farg: '#f2f2f2', radie: 0.16 },
  C: { symbol: 'C', namn: 'Kol', armar: 4, valensElektroner: 4, grupp: 14, period: 2, farg: '#3b3b3b', radie: 0.24 },
  N: { symbol: 'N', namn: 'Kväve', armar: 3, valensElektroner: 5, grupp: 15, period: 2, farg: '#3557e0', radie: 0.23 },
  O: { symbol: 'O', namn: 'Syre', armar: 2, valensElektroner: 6, grupp: 16, period: 2, farg: '#e0402a', radie: 0.23 },
}

/** Huvudgrupperna, som i ett förkortat periodiskt system. */
export const KOLUMNER = [1, 2, 13, 14, 15, 16, 17, 18]

/** Period 1 och 2. Rutor som inte finns i en period är null. */
export const TABELL = [
  ['H', null, null, null, null, null, null, 'He'],
  ['Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne'],
]

/** Grundämnen som går att hämta i prototypen. Resten visas som "?". */
export const UPPLASTA = ['H', 'C', 'O']

/** Fria elektronpar, till exempel två på syre. Påverkar bara formen. */
export function friaPar(el) {
  const g = GRUNDAMNEN[el]
  return (g.valensElektroner - g.armar) / 2
}

/** En molekyl är en lista atomer och en lista bindningar [a, b, ordning]. */
export function tom() {
  return { atomer: [], bindningar: [] }
}

export function atom(el) {
  return { atomer: [el], bindningar: [] }
}

function kopia(m) {
  return { atomer: [...m.atomer], bindningar: m.bindningar.map((b) => [...b]) }
}

export function anvandaArmar(m, i) {
  let s = 0
  for (const [a, b, o] of m.bindningar) if (a === i || b === i) s += o
  return s
}

export function lediga(m, i) {
  return GRUNDAMNEN[m.atomer[i]].armar - anvandaArmar(m, i)
}

export function totaltLediga(m) {
  let s = 0
  for (let i = 0; i < m.atomer.length; i++) s += lediga(m, i)
  return s
}

/** Klar = minst två atomer och inga lediga armar. */
export function arKlar(m) {
  return m.atomer.length > 1 && totaltLediga(m) === 0
}

/**
 * Lägg till en atom. Den binder med en arm till den atom som har flest lediga
 * armar (vid lika: den som lades först). Går inte om inga armar är lediga.
 */
export function fast(m, el) {
  if (m.atomer.length === 0) return { ok: true, mol: atom(el), till: null }
  let basta = -1
  let flest = 0
  for (let i = 0; i < m.atomer.length; i++) {
    const f = lediga(m, i)
    if (f > flest) {
      flest = f
      basta = i
    }
  }
  if (basta < 0) return { ok: false, orsak: 'full' }
  const ny = kopia(m)
  ny.atomer.push(el)
  ny.bindningar.push([basta, ny.atomer.length - 1, 1])
  return { ok: true, mol: ny, till: basta }
}

/**
 * Knäpp ihop två lediga armar på två atomer som redan sitter ihop.
 * Bindningen blir då dubbel (eller trippel). Så blir koldioxid O=C=O.
 */
export function knapp(m) {
  for (let k = 0; k < m.bindningar.length; k++) {
    const [a, b, o] = m.bindningar[k]
    if (o < 3 && lediga(m, a) > 0 && lediga(m, b) > 0) {
      const ny = kopia(m)
      ny.bindningar[k][2] = o + 1
      return { ok: true, mol: ny, par: [a, b], ordning: o + 1 }
    }
  }
  return { ok: false }
}

export function kanKnappa(m) {
  return knapp(m).ok
}

/** Antal av varje grundämne, till exempel { C: 1, O: 2 }. */
export function rakna(m) {
  const r = {}
  for (const el of m.atomer) r[el] = (r[el] || 0) + 1
  return r
}

/** Summaformel enligt Hill: kol först, sedan väte, sedan alfabetiskt. */
export function formel(m) {
  const r = rakna(m)
  const ordning = Object.keys(r).sort()
  let nycklar
  if (r.C) nycklar = ['C', ...(r.H ? ['H'] : []), ...ordning.filter((e) => e !== 'C' && e !== 'H')]
  else nycklar = ordning
  return nycklar.map((e) => e + (r[e] > 1 ? r[e] : '')).join('')
}

const SANKT = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' }

/** "CO2" → "CO₂" */
export function snyggFormel(f) {
  return f.replace(/\d/g, (d) => SANKT[d])
}

/**
 * Namn på molekyler som bara kan byggas på ett sätt med armreglerna.
 * Formler med flera möjliga molekyler (till exempel C2H6O) får inget namn.
 */
export const NAMN = {
  H2: 'vätgas',
  O2: 'syrgas',
  H2O: 'vatten',
  H2O2: 'väteperoxid',
  CH4: 'metan',
  CO2: 'koldioxid',
  CH2O: 'formaldehyd',
  CH4O: 'metanol',
  C2H6: 'etan',
  C2H4: 'eten',
  C2H2: 'etyn',
}

export function namnPa(m) {
  return NAMN[formel(m)] || null
}

/** Bygg en molekyl ur en lista steg: grundämnen eller 'knapp'. */
export function bygg(steg) {
  let m = tom()
  for (const s of steg) {
    const r = s === 'knapp' ? knapp(m) : fast(m, s)
    if (!r.ok) throw new Error(`Steget ${s} gick inte i ${steg.join(',')}`)
    m = r.mol
  }
  return m
}

/**
 * Prototypens tre beställningar. Stödet minskar för varje steg:
 * bild → formel → bara namnet.
 */
export const BESTALLNINGAR = [
  {
    formel: 'H2O',
    visar: 'bild',
    vem: 'Odlingen behöver vatten till plantorna.',
    tips: 'Hämta atomer på hyllan och lägg dem på bindningsbänken, en i taget.',
    bygg: ['O', 'H', 'H'],
    varfor: 'Syret har två armar och varje väte har en. Två väten fyller syrets armar.',
  },
  {
    formel: 'CH4',
    visar: 'formel',
    vem: 'Biogasbussen tankar metan.',
    tips: 'Siffran efter en bokstav säger hur många. Ingen siffra betyder en.',
    bygg: ['C', 'H', 'H', 'H', 'H'],
    varfor: 'Kolet har fyra armar. Det behövs fyra väten för att fylla dem.',
  },
  {
    formel: 'CO2',
    visar: 'namn',
    vem: 'Växthuset vill ha koldioxid. Växterna gör socker av den i fotosyntesen.',
    tips: '',
    bygg: ['C', 'O', 'O', 'knapp', 'knapp'],
    varfor: 'Kolets fyra armar räcker till två syren, men bara om bindningarna blir dubbla: O=C=O.',
  },
]
