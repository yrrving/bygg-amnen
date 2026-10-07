// Automatisk genomspelning i en osynlig webbläsare (Playwright, Chromium).
// Spelar alla tre beställningarna, provar fel och ofärdiga leveranser,
// räcker en atom över mittdisken, tar skärmbilder och rapporterar fel i
// konsolen samt externa nätverksanrop. Inga fönster öppnas.
//
// Kör:  node test/genomspelning.mjs [adress]
//   adress: standard http://127.0.0.1:8765/ (starta.command måste vara igång),
//           eller https://yrrving.github.io/bygg-amnen/
// Kräver Playwright. Sätt PLAYWRIGHT till sökvägen till index.mjs om paketet
// inte är installerat här.
// Skärmbilderna hamnar i test-results/bilder/ (ignoreras av git).

const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright')
const ADRESS = process.argv[2] || 'http://127.0.0.1:8765/'
const URSPRUNG = new URL(ADRESS).origin

const UT = new URL('../test-results/bilder', import.meta.url).pathname
import { mkdirSync } from 'node:fs'
mkdirSync(UT, { recursive: true })

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const fel = []
const natverk = []
page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !m.text().includes('GPU stall')) fel.push(`${m.type()}: ${m.text()}`) })
page.on('pageerror', (e) => fel.push('pageerror: ' + e.message))
page.on('request', (r) => { if (!r.url().startsWith(URSPRUNG)) natverk.push(r.url()) })

await page.goto(ADRESS)
await page.waitForTimeout(1500)
await page.screenshot({ path: `${UT}/01_start.png` })

await page.keyboard.press('KeyE')
await page.waitForTimeout(400)
console.log('läge efter E:', await page.evaluate(() => __labb.lage))

// Rörelse med tangentbord
const fore = await page.evaluate(() => [__labb.spelare[0].z, __labb.spelare[1].x])
await page.keyboard.down('KeyW'); await page.keyboard.down('ArrowRight')
await page.waitForTimeout(400)
await page.keyboard.up('KeyW'); await page.keyboard.up('ArrowRight')
const efter = await page.evaluate(() => [__labb.spelare[0].z, __labb.spelare[1].x])
console.log('P1 z', fore[0].toFixed(2), '->', efter[0].toFixed(2), ' P2 x', fore[1].toFixed(2), '->', efter[1].toFixed(2))
await page.screenshot({ path: `${UT}/02_spel.png` })

async function stall(i, x, z, fx, fz) {
  await page.evaluate(([i, x, z, fx, fz]) => {
    const s = __labb.spelare[i]; s.x = x; s.z = z; s.fx = fx; s.fz = fz; s.vinkel = Math.atan2(fx, fz)
  }, [i, x, z, fx, fz])
  await page.waitForTimeout(120)
}
async function tryck(i) {
  await page.keyboard.press(i === 0 ? 'KeyE' : 'Enter')
  await page.waitForTimeout(120)
}
const HYLLA = { H: -7.5, C: -4.5, O: -2.5 }
async function hamta(el) { await stall(0, HYLLA[el], -3.65, 0, -1); await tryck(0) }
async function tillBank() { await stall(0, 4.5, -3.65, 0, -1); await tryck(0) }
async function leverera() { await stall(0, 6.65, 0.5, 1, 0); await tryck(0) }
const status = () => page.evaluate(() => ({ nr: __labb.nummer, held: __labb.spelare[0].held && __labb.K.formel(__labb.spelare[0].held), bank: (() => { const b = __labb.ytor.find((y) => y.typ === 'bank'); return b.item && __labb.K.formel(b.item) })(), msg: [...document.querySelectorAll('#meddelanden li')].map((l) => l.textContent) }))

// Samarbete över mittdisken: P1 lägger väte på disken, P2 tar det.
await hamta('H')
await stall(0, -0.45, -1.5, 1, 0); await tryck(0)
await stall(1, 1.45, -1.5, -1, 0); await tryck(1)
console.log('P2 håller efter räckning:', await page.evaluate(() => __labb.spelare[1].held && __labb.spelare[1].held.atomer[0]))
await stall(1, 7.5, 2.65, 0, 1); await tryck(1) // återvinn

// Beställning 1: vatten
for (const el of ['O', 'H']) { await hamta(el); await tillBank() }
await page.waitForTimeout(300)
await page.screenshot({ path: `${UT}/03_bank_halvfardig.png` })
// Försök leverera ofärdig
await stall(0, 4.5, -3.65, 0, -1); await tryck(0)
await leverera()
console.log('ofärdig leverans:', await status())
await stall(0, 4.5, -3.65, 0, -1); await tryck(0) // lägg tillbaka på bänken
await hamta('H'); await tillBank()
await stall(0, 4.5, -3.65, 0, -1); await tryck(0) // ta molekylen
await leverera()
console.log('efter vatten:', await status())
await page.waitForTimeout(500)
await page.screenshot({ path: `${UT}/04_vatten_levererat.png` })
await page.waitForTimeout(2600)
await page.screenshot({ path: `${UT}/05_bestallning2.png` })

// Fel molekyl först: vatten när metan beställs
for (const el of ['O', 'H', 'H']) { await hamta(el); await tillBank() }
await stall(0, 4.5, -3.65, 0, -1); await tryck(0); await leverera()
console.log('fel molekyl:', await status())
await stall(0, 7.5, 2.65, 0, 1); await tryck(0)

for (const el of ['C', 'H', 'H', 'H', 'H']) { await hamta(el); await tillBank() }
await page.waitForTimeout(300)
await page.screenshot({ path: `${UT}/06_metan_pa_bank.png` })
await stall(0, 4.5, -3.65, 0, -1); await tryck(0); await leverera()
console.log('efter metan:', await status())
await page.waitForTimeout(3000)

// Beställning 3: koldioxid
for (const el of ['C', 'O', 'O']) { await hamta(el); await tillBank() }
await page.waitForTimeout(300)
await page.screenshot({ path: `${UT}/07_co2_enkelbindningar.png` })
await stall(0, 4.5, -3.65, 0, -1); await tryck(0); await tryck(0)
await page.waitForTimeout(300)
await page.screenshot({ path: `${UT}/08_co2_klar.png` })
await tryck(0); await leverera()
console.log('efter koldioxid:', await status())
await page.waitForTimeout(3000)
console.log('läge:', await page.evaluate(() => __labb.lage))
await page.screenshot({ path: `${UT}/09_klar.png` })

// Handboken
await page.keyboard.press('Enter'); await page.waitForTimeout(300)
console.log('läge efter omstart:', await page.evaluate(() => __labb.lage))
await page.keyboard.press('KeyB'); await page.waitForTimeout(300)
await page.screenshot({ path: `${UT}/10_handbok.png` })

// Smal skärm (iPad stående)
await page.setViewportSize({ width: 820, height: 1180 }); await page.keyboard.press('KeyB'); await page.waitForTimeout(500)
await page.screenshot({ path: `${UT}/11_ipad_staende.png` })

console.log('FEL:', fel.length ? fel : 'inga')
console.log('EXTERNA ANROP:', natverk.length ? natverk : 'inga')
await browser.close()
