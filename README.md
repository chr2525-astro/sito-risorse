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

## Note specifiche delle pagine

### index.html (homepage)

Pagina di benvenuto con l'elenco delle sezioni del sito e del loro stato di completamento ("abbozzato" / completo). Contiene solo il menu di navigazione; nessun dato dinamico.

### allskycam.html

Mappa Leaflet delle All Sky Cam italiane. I dati (coordinate e URL delle webcam) sono in `data/allskycam.json`; ogni camera è un marker cliccabile con link all'immagine live. Icona marker: `img/camera-marker.png`.

### astrofili.html

Mappa Leaflet delle associazioni astrofili italiane. Dati in `data/astrofili.json` (nome, coordinate, sito web). Stessa struttura di allskycam.

### biblioteca.html

Elenco di documenti (manuali, cataloghi astronomici) organizzati per categoria, generato da `js/links.js` a partire da `data/biblioteca.json`. Ogni voce ha tipo (pdf/xls/doc → icona), titolo, descrizione e URL. Alcuni documenti sono ospitati in locale nella cartella `files/`, altri sono link a fonti esterne.

### galleria.html

Galleria di immagini divise per categoria, con filtro, paginazione (12 immagini per pagina) e lightbox. Dati in `data/gallery.json` (miniatura in `img/galleria/thumb/`, originale in `img/galleria/hires/`). Il lightbox supporta **zoom e pan**: rotella del mouse (1×–8×), doppio clic (1× ↔ 2,5×), pulsanti +/-/1:1, trascinamento col mouse e pinch/trascinamento su touch. Lo zoom si azzera a ogni apertura e chiusura.

### lavori.html

Pagina statica "Lavori in corso" con barra di avanzamento. Nessuno script, nessun dato.

### missioni.html

Elenco delle missioni di esplorazione del Sistema Solare con filtri per agenzia, destinazione e categoria e scheda di dettaglio (modale). Dati in `data/missioni.json`; immagini in `img/missioni/`.

### mobile.html

Elenco di app astronomiche per smartphone divise per categoria, generato da `js/links.js` da `data/mobile.json`.

### not_found.html

Pagina di errore 404 con link alla home. Per l'errore personalizzato: su GitHub Pages il file deve chiamarsi `404.html`; su Altervista serve una regola in `.htaccess`.

### oggetti.html

Catalogo interattivo degli oggetti del cielo profondo (NGC, Messier, IC, Collinder, Melotte, Caldwell) con filtri per catalogo, tipo, magnitudine fotografica e dimensioni; ordinamento per colonna; riga cliccabile con sparkline SVG dell'altezza nelle 12 ore successive con etichette di azimut. **Altezza e azimut** sono calcolati nel browser con Astronomy Engine (`js/astronomy.browser.min.js`) per il luogo (da `data/luoghi.json`) e la data/ora scelti. **L'ora di osservazione è in ora locale** (input etichettato "Ora osservazione (ora locale)"). Tutti gli orari indicati sono rappresentati nel formato `ora locale (UTC + spostamento rispetto a UTC)`.

### oggetti_mio.html

Versione personale della pagina oggetti, con la colonna aggiuntiva "Osservato" per tracciare gli oggetti già visti. Stesso funzionamento di `oggetti.html`, dati in `data/oggetti_mio.json`. Pagina con `noindex, nofollow` e non collegata dal menu: raggiungibile solo via URL diretto. Il file è escluso dalle nuove modifiche tramite `.gitignore` ma resta presente nella cronologia del repository.

### osservazione.html

Dashboard "Stasera si osserva?". In cima: data (default: oggi, ora locale) e luogo (default: primo elemento di `data/luoghi.json`, Roma), modificabili. Tutti gli orari della pagina sono espressi in ora locale nel formato: `ora locale (UTC + spostamento rispetto a UTC)`.

Card principali:

- **Verdetto della serata** — punteggio 0-100: base = 100 meno nuvolosità media serale; penalità per la Luna (illuminazione × presenza nel buio), umidità alta (>80%) e vento forte (>15 km/h). Soglie: ≥75 ottima, ≥55 buona, ≥35 discreta, sotto scarsa.
- **Cielo e Luna** — tramonto del Sole, inizio/fine buio astronomico, alba, ore di buio vero, sorgere/tramonto e **fase della Luna** (Luna nuova, crescente, Primo quarto, Gibbosa crescente, Luna piena, Gibbosa calante, Ultimo quarto, calante), percentuale di illuminazione e presenza della Luna nel buio con altezza massima. Calcoli con Astronomy Engine.
- **Meteo serale (18:00-03:00)** — da **Open-Meteo** (`https://api.open-meteo.com`, gratuito, senza chiave): nuvolosità oraria con barre, probabilità di pioggia, umidità, vento, visibilità.
- **Attività solare** — da **NOAA SWPC** (`https://services.swpc.noaa.gov`): indice Kp (con storico delle ultime 24 letture), regioni attive, macchie solari totali, brillamenti C/M/X. I quattro riquadri sono **cliccabili** e aprono un popup con i dati di dettaglio (chiusura con ×, clic fuori o tasto Esc).

In fondo alla pagina altre tre sezioni:

- **Eventi dei prossimi 30 giorni** — letti da `data/eventi.json`, aggiornato manualmente; vengono mostrati solo gli eventi con data compresa tra oggi e i prossimi 30 giorni.
- **Fasi lunari dei prossimi 30 giorni** — calcolate localmente con Astronomy Engine (Luna nuova, Primo quarto, Luna piena, Ultimo quarto, con data e ora esatta).
- **Passaggi ISS dei prossimi 5 giorni** — calcolati nel browser con `satellite.js` (CDN) a partire dal TLE corrente della ISS (CelesTrak, con fallback su tle.ivanstanojevic.me); vengono mostrati solo i passaggi visibili: elevazione massima sopra 10°, ISS illuminata dal Sole (fuori dall'ombra della Terra) e cielo buio all'osservatore (Sole sotto -6°).

Tutti gli orari della pagina sono in ora locale nel formato: `ora locale (UTC + spostamento rispetto a UTC)`.

### satelliti.html

Statistiche sui satelliti artificiali: lanci per anno (grafico a linea), manufatti in orbita per tipologia (grafico a torta) e distribuzione per tipo di orbita (LEO/MEO/GEO/HEO). Grafici realizzati con Chart.js (CDN), dati e configurazione in `js/satellites.js`. Fonte dei dati: `https://planet4589.org/`.

### siti.html

Elenco di siti web astronomici divisi per categoria, generato da `js/links.js` da `data/siti.json`.

### software.html

Raccolta di programmi astronomici per desktop divisi per categoria (planetari virtuali, pianificazione osservazioni, startrail, acquisizione immagini, suite astronomiche), generato da `js/links.js` da `data/software.json`.

### youtube.html

Elenco di canali YouTube di astronomia, generato da `js/links.js` da `data/youtube.json`.

### Servizi esterni utilizzati

| Servizio | Uso | Chiave API |
| :--- | :--- | :--- |
| Open-Meteo | meteo serale (osservazione.html) | non richiesta |
| NOAA SWPC | attività solare (osservazione.html) | non richiesta |
| CelesTrak / tle.ivanstanojevic.me | TLE della ISS (osservazione.html) | non richiesta |
| Chart.js, Leaflet, satellite.js, Font Awesome | librerie via CDN | — |
