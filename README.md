# sito-risorse
sito risorse per astrofili

Struttura delle cartelle/file
# Struttura delle cartelle e dei file

```text
├── index.html            -- pagina benvenuto con widget per osservazione --- HOMEPAGE
├── allskycam.html        -- pagina per mappa allskycam
├── astrofili.html        -- pagina per mappa associazioni astrofili
├── biblioteca.html       -- pagina con link a testi/cataloghi
├── galleria.html         -- pagina con galleria per immagini significative
├── lavori.html           -- pagina per lavori in corso
├── missioni.html         -- pagina per missioni di esplorazione spaziale
├── mobile.html           -- pagina con app per mobile
├── oggetti.html          -- pagina con elenco oggetti astronomici con coordinate e visibilità
├── oggetti_mio.html      -- pagina con elenco oggetti astronomici con coordinate e visibilità - PERSONALE pagina non pubblicata
├── osservazione.html     -- pagina "Stasera si osserva?": condizioni di osservazione (buio, Luna, meteo, attività solare)
├── satelliti.html        -- pagina con grafici satelliti in orbita
├── siti.html             -- pagina con siti 
├── software.html         -- pagina con programmi per pc
├── youtube.html          -- pagina con canali youtube
│
├── css/                  -- foglio di stile per tutto il sito
│   └── style.css
│
├── js/
│   ├── allskycam.js      -- javascript per la gestione della pagina delle allskycam
│   ├── astrofili.js      -- javascript per la gestione della pagina delle associazioni astrofili
│   ├── astronomy.browser.min.js -- libreria Astronomy Engine (MIT): calcolo alt/az con precessione e rifrazione
│   ├── gallery.js        -- javascript per la gestione della pagina galleria
│   ├── links.js          -- javascript per la gestione delle pagine biblioteca, software, mobile, youtube
│   ├── luoghi.js         -- javascript per la gestione dei luoghi di osservazione nella pagina degli oggetti
│   ├── menu.js           -- javascript per gestione menu del sito
│   ├── missioni.js       -- javascript per la gestione della pagina delle missioni
│   ├── oggetti.js        -- javascript per la gestione della pagina degli oggetti
│   ├── oggetti_mio.js    -- javascript per la gestione della pagina degli oggetti PERSONALI
│   ├── osservazione.js   -- javascript per la gestione della pagina delle condizioni di osservazione
│   └── satellites.js     -- javascript per la gestione della pagina dei satelliti
│
├── data/
│   ├── allskycam.json    -- json contenente i dati presentati nella pagina allskycam
│   ├── eventi.json       -- json contenente gli eventi astronomici in arrivo (pagina osservazione, aggiornamento manuale)
│   ├── astrofili.json    -- json contenente i dati presentati nella pagina associazioni astrofili
│   ├── biblioteca.json   -- json contenente i dati presentati nella pagina biblioteca
│   ├── gallery.json      -- json contenente i dati presentati nella pagina galleria
│   ├── luoghi.json       -- json contenente i luoghi di osservazione presentati nella pagina oggetti
│   ├── missioni.json     -- json contenente i dati presentati nella pagina missioni
│   ├── mobile.json       -- json contenente i dati presentati nella pagina app mobile
│   ├── oggetti.json      -- json contenente i dati degli oggetti astronomici presentati nella pagina oggetti
│   ├── oggetti_mio.json  -- json contenente i dati degli oggetti astronomici presentati nella pagina oggetti PERSONALI
│   ├── siti.json         -- json contenente i dati presentati nella pagina siti web
│   ├── software.json     -- json contenente i dati presentati nella pagina software
│   └── youtube.json      -- json contenente i dati presentati nella pagina youtube
│
├── img/
│   ├── camera-marker.png -- simbolo utilizzato sulle mappe
│   ├── galleria/         -- directory che contiene le due sottodirectory per la pagina galleria
│   │   ├── thumb/        -- immagini in bassa risoluzione per la pagina galleria
│   │   └── hires/        -- immagini in alta risoluzione per la pagina galleria
│   └── missioni/         -- immagini per pagina missioni.html
│
├── files/                -- documenti presentati dalla pagina biblioteca memorizzati in locale
│   └── backup/           -- copia di sicurezza dei documenti presentati dalla pagina biblioteca, anche di quelli attualmente reperibili in rete
│
└── README.txt            -- questo file
```

---

## Collegamento tra file

| Pagina HTML | Script JavaScript collegati | File di Dati (JSON) associati |
| :--- | :--- | :--- |
| **index.html** | `menu.js` | *Nessuno* |
| **astrofili.html** | `astrofili.js`, `menu.js` | `astrofili.json` |
| **allskycam.html** | `allskycam.js`, `menu.js` | `allskycam.json` |
| **mobile.html** | `menu.js`, `links.js` | `mobile.json` |
| **software.html** | `menu.js`, `links.js` | `software.json` |
| **biblioteca.html** | `menu.js`, `links.js` | `biblioteca.json` |
| **missioni.html** | `menu.js`, `missioni.js` | `missioni.json` |
| **satelliti.html** | `menu.js`, `satellites.js` | *Nessuno* |
| **siti.html** | `menu.js`, `link.js` | `siti.json` |
| **youtube.html** | `menu.js`, `link.js` | `youtube.json` |
| **galleria.html** | `menu.js`, `gallery.js` | `gallery.json` |
| **oggetti.html** | `menu.js`, `astronomy.browser.min.js`, `luoghi.js`, `oggetti.js` | `luoghi.json`, `oggetti.json` |
| **oggetti_mio.html** | `menu.js`, `astronomy.browser.min.js`, `luoghi.js`, `oggetti_mio.js` | `luoghi.json`, `oggetti_mio.json` |
| **osservazione.html** | `menu.js`, `astronomy.browser.min.js`, `satellite.js` (CDN), `osservazione.js` | `luoghi.json`, `eventi.json` |

---

## Note sulla pagina osservazione.html

La pagina "Stasera si osserva?" recupera i dati da servizi esterni direttamente dal browser dell'utente:

- **Open-Meteo** (`https://api.open-meteo.com`) — previsioni orarie serali: nuvolosità, probabilità di pioggia, umidità, vento, visibilità. Servizio gratuito, senza chiave API.
- **NOAA SWPC** (`https://services.swpc.noaa.gov`) — indice geomagnetico Kp, regioni attive del Sole, numero di macchie solari ed eventi di brillamento (classi C/M/X).

Data e luogo osservazione sono valorizzati di default (luogo: primo elemento di `data/luoghi.json`, data: giorno corrente in ora italiana) e modificabili dall'utente.

In fondo alla pagina altre tre sezioni:

- **Eventi dei prossimi 30 giorni** — letti da `data/eventi.json`, aggiornato manualmente; vengono mostrati solo gli eventi con data compresa tra oggi e i prossimi 30 giorni.
- **Fasi lunari dei prossimi 30 giorni** — calcolate localmente con Astronomy Engine (Luna nuova, Primo quarto, Luna piena, Ultimo quarto, con data e ora esatta).
- **Passaggi ISS dei prossimi 5 giorni** — calcolati nel browser con `satellite.js` (CDN) a partire dal TLE corrente della ISS (CelesTrak, con fallback su tle.ivanstanojevic.me); vengono mostrati solo i passaggi visibili: elevazione massima sopra 10°, ISS illuminata dal Sole (fuori dall'ombra della Terra) e cielo buio all'osservatore (Sole sotto -6°).
