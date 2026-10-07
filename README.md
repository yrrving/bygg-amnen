# Bygg ämnen tillsammans (arbetsprototyp)

Ett samarbetsspel för 2 spelare där man bygger molekyler av atomer i ett labb. Hyllan är det periodiska systemet. Det finns ingen tid och ingen stress.

**Prova direkt:** https://yrrving.github.io/bygg-amnen/

Kemins förenklingar, och var de slutar gälla, finns i [`FORENKLINGAR.md`](FORENKLINGAR.md).

## Starta lokalt

**Dubbelklicka på `starta.command`.** Webbläsaren öppnas på `http://127.0.0.1:8765/`. Stäng terminalfönstret när du är klar.

Första gången kan macOS fråga om filen får öppnas. Högerklicka då och välj **Öppna**.

Från terminalen fungerar det också:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Öppna sedan `http://127.0.0.1:8765/`.

(Webbläsare kör inte JavaScript-moduler direkt från disken, och därför behövs den lilla lokala servern. Den syns bara på den här datorn.)

## Styra

|  | Gå | Använd |
|---|---|---|
| Spelare 1 | W A S D | E |
| Spelare 2 | Piltangenterna | Enter |
| Handkontroll (upp till 2) | Vänster spak eller styrkors | A |

**B** öppnar handboken, **Esc** stänger den.

## Hur det går till

1. Hämta en atom på **hyllan** till vänster.
2. Räck den över **mittdisken** till den andra spelaren, eller gå runt längst fram.
3. Lägg atomerna på **bindningsbänken**, en i taget. De tar tag i varandra med sina armar.
4. Räcker inte armarna? Använd bänken med tomma händer, så **knäpps två lediga armar ihop**.
5. Lämna den färdiga molekylen på **vågen** vid leveransen.

Tre beställningar där stödet minskar för varje steg: **vatten** visas som bild, **metan** som formel och **koldioxid** bara som namn.

## Tester

```bash
npm test
```

Testerna kontrollerar kemin utan webbläsare: armarna, formlerna, namnen, att varje beställning går att bygga och att formerna stämmer (koldioxid rak, metan som tetraeder, vatten vinklat). Inga beroenden behöver installeras.

## Filer

| Fil | Innehåll |
|---|---|
| `js/kemi.js` | Grundämnen, armregeln, formler, namn och beställningar. Ren logik. |
| `js/geometri.js` | Molekylernas form i 3D (förenklad VSEPR). Ren logik. |
| `js/main.js` | Spelet: scen, spelare, ytor och interaktioner. |
| `vendor/three.module.js` | three.js r160 (MIT-licens, licenstexten finns i filhuvudet). |
| `test/kemi.test.mjs` | Kemitestet. |

Ingenting hämtas från internet. Sidans säkerhetsregler (CSP) stoppar alla externa anrop.
