/* =====================================================
   OGGETTI.JS
   Tabella oggetti del cielo profondo con filtri,
   parametri di osservazione, calcolo altezza/azimut,
   ordinamento colonne e grafico sparkline (SVG)
   dell'altezza nelle prossime 12 ore, apribile
   con un click sulla riga. Il grafico mostra anche
   le etichette di azimut/quadrante ogni 2 ore.
   (il calcolo astronomico usa Astronomy Engine,
   https://github.com/cosinekitty/astronomy,
   caricata come js/astronomy.browser.min.js PRIMA
   di questo file)
===================================================== */

let skyObjects = [];
let places = [];

/* Stato dell'ordinamento:
   { key: "MAGFOTO" | "DIMMAX" | "ALTEZZA", dir: 1 (asc) | -1 (desc) }
   null = nessun ordinamento (ordine del JSON) */
let sortState = null;

/* Riga di dettaglio attualmente aperta (per chiusura al re-render) */
let openDetailId = null;

/* =====================================================
   VERIFICA DIPENDENZE
===================================================== */

function checkDependencies() {

    const problems = [];

    if (typeof Astronomy === "undefined" || typeof Astronomy.Horizon !== "function") {
        problems.push("astronomy.browser.min.js non caricato (manca Astronomy)");
    }

    if (problems.length > 0) {
        console.error("OGGETTI.JS - Dipendenze mancanti:", problems);
    }

    return problems;
}

/* =====================================================
   CALCOLO ASTRONOMICO (Astronomy Engine)
   https://github.com/cosinekitty/astronomy
   Libreria MIT: js/astronomy.browser.min.js

   Rispetto al vecchio coordcalc.js ora il calcolo
   include precessione/nutazione (coordinate J2000
   precesse all'equatore della data di osservazione)
   e la rifrazione atmosferica standard.
===================================================== */

/* "00:13:12.2" oppure "00 13 12.2" oppure "00h13m12s" -> gradi */
function parseRA(raString) {

    if (!raString) return null;

    const s = String(raString).trim().replace(/[hmsHMS]/g, ":").replace(/\s+/g, ":").replace(/:+/g, ":");

    const parts = s.split(":").map(Number);

    if (parts.some(isNaN)) return null;

    const h = parts[0] || 0;
    const m = parts[1] || 0;
    const sec = parts[2] || 0;

    return (h + m / 60 + sec / 3600) * 15;  // ore -> gradi
}

/* "+12:21:33.2" oppure "-12:21:33" oppure "12°21'33\"" -> gradi */
function parseDEC(decString) {

    if (!decString) return null;

    let s = String(decString).trim().replace(/[dmsDMS'"]/g, ":").replace(/\s+/g, ":").replace(/:+/g, ":");

    let sign = 1;

    if (s.startsWith("-")) sign = -1;
    if (s.startsWith("+") || s.startsWith("-")) {
        s = s.substring(1);
    }

    const parts = s.split(":").map(Number);

    if (parts.some(isNaN)) return null;

    const d = Math.abs(parts[0] || 0);
    const m = parts[1] || 0;
    const sec = parts[2] || 0;

    return sign * (d + m / 60 + sec / 3600);
}

/* =====================================================
   CALCOLO ALTEZZA E AZIMUT
   Restituisce { altezza: gradi, azimut: gradi, valido: bool }
   oppure { valido: false } se i dati sono insufficienti.
   Azimut: 0 = Nord, cresce verso Est.
   Rifrazione atmosferica standard inclusa.
===================================================== */

function computeAltAz(raString, decString, date, latitudeDeg, longitudeDeg) {

    const ra = parseRA(raString);
    const dec = parseDEC(decString);

    if (ra === null || dec === null) return { valido: false };
    if (date === null || isNaN(date.getTime())) return { valido: false };
    if (isNaN(latitudeDeg) || isNaN(longitudeDeg)) return { valido: false };

    const time = Astronomy.MakeTime(date);
    const observer = new Astronomy.Observer(latitudeDeg, longitudeDeg, 0);

    // Precessione delle coordinate J2000 all'equatore della data (EQD)
    const vec2000 = Astronomy.VectorFromSphere(
        { lat: dec, lon: ra, dist: 1 },
        time
    );

    const vecDate = Astronomy.RotateVector(
        Astronomy.Rotation_EQJ_EQD(time),
        vec2000
    );

    const sphereDate = Astronomy.SphereFromVector(vecDate);

    // Coordinate orizzontali (RA in ore siderali)
    const hor = Astronomy.Horizon(
        time,
        observer,
        sphereDate.lon / 15,
        sphereDate.lat,
        "normal"
    );

    let azNorm = ((hor.azimuth % 360) + 360) % 360;

    return {
        valido: true,
        altezza: hor.altitude,
        azimut: azNorm,
        sottoOrizzonte: hor.altitude < 0
    };
}

/* =====================================================
   FORMATTAZIONE
===================================================== */

function formatDegrees(value, decimals) {

    if (value === null || value === undefined || isNaN(value)) return "";

    return value.toFixed(decimals) + "°";
}

/* Direzione cardinale dall'azimut (N, NE, E, SE, S, SO, O, NO) */
function cardinalFromAzimuth(az) {

    const direzioni = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];

    const index = Math.round(((az % 360) + 360) % 360 / 45) % 8;

    return direzioni[index];
}

/* =====================================================
   CARICAMENTO JSON
===================================================== */

async function loadObjects() {

    try {

        const response = await fetch("data/oggetti.json");

        if (!response.ok) {
            throw new Error("Impossibile caricare oggetti.json (HTTP " + response.status + ")");
        }

        const data = await response.json();

        // Supporta sia la chiave "missioni" sia "oggetti"
        skyObjects = data.missioni || data.oggetti || [];

        console.log("OGGETTI.JS - Caricati " + skyObjects.length + " oggetti");

        populateTipoFilter();
        renderTable();
        initFilters();

    }
    catch (error) {

        console.error("OGGETTI.JS - Errore caricamento oggetti:", error);

        const tbody = document.querySelector("#objectTable tbody");
        if (tbody) {
            tbody.innerHTML =
                `<tr><td colspan="15" class="coord-na">Errore nel caricamento degli oggetti: ${error.message}</td></tr>`;
        }
    }
}

async function loadPlaces() {

    try {

        const response = await fetch("data/luoghi.json");

        if (!response.ok) {
            throw new Error("Impossibile caricare luoghi.json (HTTP " + response.status + ")");
        }

        const data = await response.json();

        places = data.luoghi || [];

        console.log("OGGETTI.JS - Caricati " + places.length + " luoghi");

        populatePlaceFilter();
        renderTable();

    }
    catch (error) {
        console.error("OGGETTI.JS - Errore caricamento luoghi:", error);
    }
}

/* =====================================================
   POPOLA FILTRO TIPO
===================================================== */

function populateTipoFilter() {

    const tipoFilter = document.getElementById("filterTIPO");
    if (!tipoFilter) return;

    tipoFilter.innerHTML = '<option value="all">Tutti i tipi</option>';

    const tipi = new Set();

    skyObjects.forEach(obj => {
        if (obj.TIPO) {
            tipi.add(obj.TIPO);
        }
    });

    Array.from(tipi).sort().forEach(tipo => {
        const option = document.createElement("option");
        option.value = tipo;
        option.textContent = tipo;
        tipoFilter.appendChild(option);
    });
}

/* =====================================================
   POPOLA FILTRO LUOGO
===================================================== */

function populatePlaceFilter() {

    const placeFilter = document.getElementById("obsPlace");
    if (!placeFilter) return;

    placeFilter.innerHTML = '<option value="">Seleziona un luogo</option>';

    places.forEach(place => {
        const option = document.createElement("option");
        option.value = place.nome;
        option.textContent = `${place.nome} (${place.latitudine}, ${place.longitudine})`;
        placeFilter.appendChild(option);
    });
}

/* =====================================================
   NORMALIZZAZIONE NUMERICA
===================================================== */

function toNumber(value) {
    const cleaned = String(value ?? "").replace("'", "").replace(",", ".").trim();
    if (cleaned === "") return null;
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
}

/* =====================================================
   CONFRONTO CAMPO CATALOGO
   "*"  -> solo record con il campo valorizzato
   testo -> match parziale (case-insensitive)
   vuoto -> nessun filtro
===================================================== */

function matchCatalogField(filterValue, fieldValue) {

    if (!filterValue) return true;

    const value = String(fieldValue || "").trim();

    if (filterValue === "*") {
        return value !== "";
    }

    return value.toLowerCase().includes(filterValue.toLowerCase());
}

/* =====================================================
   PARAMETRI DI OSSERVAZIONE
===================================================== */

function getObservationParams() {

    const placeName = document.getElementById("obsPlace").value;
    const dateValue = document.getElementById("obsDate").value;
    const timeValue = document.getElementById("obsTime").value;

    if (!placeName || !dateValue || !timeValue) {
        return { attivo: false };
    }

    const place = places.find(p => p.nome === placeName);

    if (!place) {
        return { attivo: false };
    }

    const date = new Date(`${dateValue}T${timeValue}Z`);   // input interpretato come UTC

    if (isNaN(date.getTime())) {
        return { attivo: false };
    }

    return {
        attivo: true,
        date: date,
        lat: parseFloat(place.latitudine),
        lon: parseFloat(place.longitudine),
        luogo: placeName
    };
}

/* =====================================================
   CALCOLO ALTEZZA (con gestione errori)
===================================================== */

function getAltAzFor(obj, obs) {

    if (!obs || !obs.attivo) {
        return { valido: false };
    }

    try {
        return computeAltAz(
            obj.RA2000,
            obj.DEC2000,
            obs.date,
            obs.lat,
            obs.lon
        );
    }
    catch (error) {
        console.error("OGGETTI.JS - Errore calcolo alt/az:", error, obj);
        return { valido: false };
    }
}

/* =====================================================
   FILTRAGGIO
===================================================== */

function getFilteredObjects() {

    const fCATALOGO = (document.getElementById("filterCATALOGO").value || "").trim();
    const fTIPO = document.getElementById("filterTIPO").value;
    const fMAG = toNumber(document.getElementById("filterMAGFOTO").value);
    const fDIM = toNumber(document.getElementById("filterDIMMAX").value);

    return skyObjects.filter(obj => {

        if (!matchCatalogField(fCATALOGO, obj.CATALOGO)) return false;


        if (fTIPO !== "all" && obj.TIPO !== fTIPO) return false;

        if (fMAG !== null) {
            const mag = toNumber(obj.MAGFOTO);
            if (mag === null || mag > fMAG) return false;
        }

        if (fDIM !== null) {
            const dim = toNumber(obj.DIMMAX);
            if (dim === null || dim <= fDIM) return false;
        }

        return true;
    });
}

/* =====================================================
   ORDINAMENTO
   I valori non disponibili (null / N/D) vanno sempre
   in fondo alla tabella, in entrambe le direzioni.
===================================================== */

function sortObjects(objects, obs) {

    if (!sortState) return objects;

    const key = sortState.key;
    const dir = sortState.dir;

    function sortValue(obj) {

        if (key === "ALTEZZA") {
            const result = getAltAzFor(obj, obs);
            return result.valido ? result.altezza : null;
        }

        return toNumber(obj[key]);
    }

    return objects.slice().sort((a, b) => {

        const va = sortValue(a);
        const vb = sortValue(b);

        if (va === null && vb === null) return 0;
        if (va === null) return 1;
        if (vb === null) return -1;

        if (va < vb) return -1 * dir;
        if (va > vb) return 1 * dir;

        return 0;
    });
}

/* Aggiorna le icone di ordinamento nelle intestazioni */
function updateSortIcons() {

    const headers = document.querySelectorAll("#objectTable th.sortable");

    headers.forEach(th => {

        const icon = th.querySelector(".sort-icon");
        if (!icon) return;

        icon.className = "fa-solid fa-sort sort-icon";
        th.classList.remove("sorted-asc", "sorted-desc");

        if (sortState && th.dataset.sort === sortState.key) {

            if (sortState.dir === 1) {
                icon.classList.add("fa-sort-up");
                th.classList.add("sorted-asc");
            } else {
                icon.classList.add("fa-sort-down");
                th.classList.add("sorted-desc");
            }
        }
    });
}

/* =====================================================
   SPARKLINE / GRAFICO SVG DELLE PROSSIME 12 ORE
   Genera un grafico dell'altezza dell'oggetto nelle
   12 ore successive a obs.date, con:
   - curva dell'altezza (rosso sotto l'orizzonte)
   - linea tratteggiata dell'orizzonte (h = 0)
   - tacche orarie sull'asse x
   - etichette di azimut/quadrante ogni 2 ore (N, NE, E, ...)
   - marker del culmine (altezza massima)
   - punti di sorgere/tramonto (attraversamento h=0)
===================================================== */

const CHART_HOURS = 12;   // ore rappresentate
const CHART_STEPS = 96;   // campioni (ogni 7,5 minuti)
const AZ_EVERY = 2;       // etichetta azimut ogni 2 ore

function formatTimeHHMM(date) {
    const h = String(date.getUTCHours()).padStart(2, "0");
    const m = String(date.getUTCMinutes()).padStart(2, "0");
    return h + ":" + m + " UTC";
}

function buildAltitudeChart(obj, obs) {

    // Dimensioni del grafico
    const W = 720, H = 240;
    const PAD_L = 40, PAD_R = 15, PAD_T = 30, PAD_B = 30;
    const plotW = W - PAD_L - PAD_R;
    const plotH = H - PAD_T - PAD_B;

    // Campionamento dell'altezza e dell'azimut
    const campioni = [];

    for (let i = 0; i <= CHART_STEPS; i++) {

        const t = new Date(obs.date.getTime() + (i / CHART_STEPS) * CHART_HOURS * 3600 * 1000);

        // Calcolo con l'istante t (non con obs.date fisso)
        const res = computeAltAz(obj.RA2000, obj.DEC2000, t, obs.lat, obs.lon);

        campioni.push({
            time: t,
            alt: res.valido ? res.altezza : null,
            az: res.valido ? res.azimut : null
        });
    }

    // Se nessun campione valido, il grafico non si puo' disegnare
    if (campioni.every(c => c.alt === null)) {
        return `<p class="coord-na">Coordinate non disponibili per il grafico.</p>`;
    }

    // Range dell'asse Y: dall'altezza minima a quella massima osservate,
    // sempre incluso lo 0 (orizzonte)
    const altVals = campioni.filter(c => c.alt !== null).map(c => c.alt);
    let yMin = Math.min(-5, Math.floor(Math.min(...altVals)));
    let yMax = Math.max(5, Math.ceil(Math.max(...altVals)));

    // Funzioni di mappatura coordinate
    const xOf = i => PAD_L + (i / CHART_STEPS) * plotW;
    const yOf = v => PAD_T + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

    /* ---------- CURVA DELL'ALTEZZA ---------- */

    // Spezza la curva in segmenti sopra e sotto l'orizzonte
    let sopraD = "";
    let sottoD = "";

    campioni.forEach((c, i) => {

        if (c.alt === null) return;

        const x = xOf(i).toFixed(1);
        const y = yOf(c.alt).toFixed(1);

        if (c.alt >= 0) {
            sopraD += (sopraD === "" ? "M" : "L") + x + "," + y;
        } else {
            sottoD += (sottoD === "" ? "M" : "L") + x + "," + y;
        }
    });

    /* ---------- CULMINE (altezza massima) ---------- */

    let culmine = null;
    campioni.forEach((c, i) => {
        if (c.alt !== null && (culmine === null || c.alt > culmine.alt)) {
            culmine = Object.assign({}, c, { index: i });
        }
    });

    /* ---------- SORGENTE / TRAMONTO (attraversamenti h = 0) ---------- */

    const attraversamenti = [];

    for (let i = 1; i < campioni.length; i++) {

        const a = campioni[i - 1];
        const b = campioni[i];

        if (a.alt === null || b.alt === null) continue;

        if ((a.alt < 0 && b.alt >= 0) || (a.alt > 0 && b.alt <= 0)) {

            // Interpolazione lineare del punto esatto h = 0
            const f = Math.abs(a.alt) / (Math.abs(a.alt) + Math.abs(b.alt));
            const tZero = new Date(a.time.getTime() + f * (b.time.getTime() - a.time.getTime()));

            attraversamenti.push({
                time: tZero,
                tipo: b.alt >= a.alt ? "sorgere" : "tramonto",
                x: xOf(i - 1 + f)
            });
        }
    }

    /* ---------- TACCHE ASSE X (ogni ora) ---------- */

    let tickX = "";

    for (let h = 0; h <= CHART_HOURS; h++) {

        const x = xOf(h * CHART_STEPS / CHART_HOURS);

        tickX +=
            `<line x1="${x}" y1="${PAD_T + plotH}" x2="${x}" y2="${PAD_T + plotH + 4}" stroke="#999" stroke-width="1"/>` +
            `<text x="${x}" y="${H - 8}" text-anchor="middle" class="chart-label">` +
            `+${h}h</text>`;
    }

    /* ---------- ETICHETTE AZIMUT / QUADRANTI ----------
       Ogni AZ_EVERY ore mostra l'azimut dell'oggetto con
       la direzione cardinale (N, NE, E, SE, S, SO, O, NO).
       Posizionate nella fascia alta del grafico; il primo
       e l'ultimo campione sono allineati verso l'interno
       per non uscire dall'area SVG. */

    let azLabels = "";

    for (let h = 0; h <= CHART_HOURS; h += AZ_EVERY) {

        const idx = Math.round(h * CHART_STEPS / CHART_HOURS);
        const c = campioni[idx];

        if (!c || c.az === null) continue;

        const x = xOf(idx);

        const azRounded = Math.round(c.az);
        const cardinale = cardinalFromAzimuth(c.az);

        // Colore in base al quadrante: settentrione/est piu' freddo,
        // sud/ovest piu' caldo (aiuta a leggere la rotazione)
        let colore = "#555";
        if (c.az >= 315 || c.az < 45) colore = "#1565c0";   // N
        else if (c.az < 135) colore = "#2e7d32";             // E
        else if (c.az < 225) colore = "#c62828";             // S
        else colore = "#e65100";                             // O

        // Allineamento: ai bordi dell'area di disegno
        // il testo non deve uscire dal viewBox
        let anchor = "middle";
        if (h === 0) anchor = "start";
        if (h === CHART_HOURS) anchor = "end";

        azLabels +=
            `<text x="${x.toFixed(1)}" y="${PAD_T - 6}" text-anchor="${anchor}" ` +
            `class="chart-az" fill="${colore}">${azRounded}° ${cardinale}</text>`;
    }

    /* ---------- GRIGLIA E ETICHETTE ASSE Y ---------- */

    let gridY = "";

    const yStep = (yMax - yMin) <= 60 ? 15 : 30;

    for (let v = Math.ceil(yMin / yStep) * yStep; v <= yMax; v += yStep) {

        const y = yOf(v);

        gridY +=
            `<line x1="${PAD_L}" y1="${y}" x2="${W - PAD_R}" y2="${y}" stroke="${v === 0 ? "#888" : "#e5e5e5"}" ` +
            `stroke-width="1" ${v === 0 ? 'stroke-dasharray="4,3"' : ""}/>` +
            `<text x="${PAD_L - 6}" y="${y + 3}" text-anchor="end" class="chart-label">${v}°</text>`;
    }

    /* ---------- MARKER CULMINE E SORGERE/TRAMONTO ---------- */

    let markers = "";

    if (culmine && culmine.alt > 0) {
        markers +=
            `<circle cx="${xOf(culmine.index).toFixed(1)}" cy="${yOf(culmine.alt).toFixed(1)}" r="4" fill="#2e88e5"/>` +
            `<text x="${xOf(culmine.index).toFixed(1)}" y="${(yOf(culmine.alt) - 8).toFixed(1)}" ` +
            `text-anchor="middle" class="chart-peak">culmine ${formatDegrees(culmine.alt, 1)}</text>`;
    }

    attraversamenti.forEach(a => {
        markers +=
            `<circle cx="${a.x.toFixed(1)}" cy="${yOf(0)}" r="3.5" fill="${a.tipo === "sorgere" ? "#2e7d32" : "#c62828"}"/>` +
            `<text x="${a.x.toFixed(1)}" y="${(yOf(0) + (a.tipo === "sorgere" ? 16 : -8)).toFixed(1)}" ` +
            `text-anchor="middle" class="chart-cross">${a.tipo === "sorgere" ? "sorge" : "tramonta"} ${formatTimeHHMM(a.time)}</text>`;
    });

    /* ---------- ASSEMBLAGGIO SVG ---------- */

    const oraInizio = formatTimeHHMM(obs.date);

    return `
        <div class="chart-box">
            <p class="chart-title">
                <strong>${obj.NOME || "Oggetto"}</strong> — andamento dell'altezza nelle prossime ${CHART_HOURS} ore
                (da ${oraInizio}, ${obs.luogo})
            </p>
            <svg viewBox="0 0 ${W} ${H}" class="altitude-chart" role="img"
                 aria-label="Grafico dell'altezza e dell'azimut nelle prossime ${CHART_HOURS} ore">
                ${gridY}
                ${tickX}
                ${azLabels}
                <path d="${sottoD}" fill="none" stroke="#c62828" stroke-width="2"/>
                <path d="${sopraD}" fill="none" stroke="#2e88e5" stroke-width="2.5"/>
                ${markers}
            </svg>
            <p class="chart-legend">
                <span class="legend-item"><span class="legend-swatch" style="background:#2e88e5"></span> sopra l'orizzonte</span>
                <span class="legend-item"><span class="legend-swatch" style="background:#c62828"></span> sotto l'orizzonte</span>
                <span class="legend-item"><span class="legend-line"></span> orizzonte (0°)</span>
                ${culmine ? `<span class="legend-item">● culmine: <strong>${formatTimeHHMM(culmine.time)}</strong> a ${formatDegrees(culmine.alt, 1)}</span>` : ""}
                <span class="legend-item">etichette in alto: azimut e quadrante ogni ${AZ_EVERY} ore</span>
            </p>
        </div>`;
}

/* =====================================================
   RENDER TABELLA
===================================================== */

function renderTable() {

    const tbody = document.querySelector("#objectTable tbody");
    const count = document.getElementById("objectCount");
    if (!tbody) return;

    tbody.innerHTML = "";

    // La sottoriga di dettaglio si chiude a ogni re-render
    openDetailId = null;

    let filtered = [];

    try {
        filtered = getFilteredObjects();
    }
    catch (error) {
        console.error("OGGETTI.JS - Errore nel filtraggio:", error);
        tbody.innerHTML =
            `<tr><td colspan="15" class="coord-na">Errore nel filtraggio: ${error.message}</td></tr>`;
        return;
    }

    // Parametri di osservazione (data, ora, luogo)
    const obs = getObservationParams();

    // Applica l'ordinamento
    const ordered = sortObjects(filtered, obs);

    // Aggiorna le icone nelle intestazioni
    updateSortIcons();

    if (count) {
        let text =
            `Oggetti trovati: ${filtered.length} su ${skyObjects.length}`;

        if (sortState) {
            const nomeCampo = sortState.key === "ALTEZZA" ? "Altezza" : sortState.key;
            const direzione = sortState.dir === 1 ? "crescente" : "decrescente";
            text += ` — Ordinato per ${nomeCampo} (${direzione})`;
        }

        if (obs.attivo) {
            text += ` — Altezza/Azimut calcolati per: ${obs.luogo}`;
            text += ` — Clicca su una riga per il grafico delle prossime ${CHART_HOURS} ore`;
        } else {
            text += ` — Inserisci data, ora (UTC) e luogo per calcolare altezza e azimut`;
        }

        count.textContent = text;
    }

    if (ordered.length === 0) {
        tbody.innerHTML =
            `<tr><td colspan="15">Nessun oggetto corrisponde ai filtri selezionati.</td></tr>`;
        return;
    }

    ordered.forEach((obj, index) => {

        const row = document.createElement("tr");

        try {

//            const osservato = obj.OSSERVATO === "Si"
//                ? `<span class="status-online"><i class="fa-solid fa-circle-check"></i> Si</span>`
                //: `<span class="status-offline"><i class="fa-solid fa-circle-xmark"></i> No</span>`;

            // Colonne altezza e azimut
            let altCell = "";
            let azCell = "";

            const result = getAltAzFor(obj, obs);

            if (result.valido) {

                if (result.sottoOrizzonte) {
                    altCell =
                        `<span class="status-offline">${formatDegrees(result.altezza, 1)}</span>`;
                } else {
                    altCell =
                        `<span class="status-online">${formatDegrees(result.altezza, 1)}</span>`;
                }

                azCell =
                    `${formatDegrees(result.azimut, 1)} ${cardinalFromAzimuth(result.azimut)}`;

            } else if (obs.attivo) {
                altCell = `<span class="coord-na">N/D</span>`;
                azCell = `<span class="coord-na">N/D</span>`;
            } else {
                altCell = `<span class="coord-na">—</span>`;
                azCell = `<span class="coord-na">—</span>`;
            }

            // Icona che segnala la possibilita' di aprire il grafico
            const chartIcon = obs.attivo
                ? ` <i class="fa-solid fa-chart-line chart-hint" title="Grafico delle prossime ${CHART_HOURS} ore"></i>`
                : "";

            row.className = "data-row";
            row.dataset.id = obj.id || String(index);

// dopo dimmax tolto                  <td>${osservato}</td>   

            row.innerHTML = `
                <td>${obj.CATALOGO || ""}</td>
                <td class="obj-name">${obj.NOME || ""}</td>
                <td>${obj.COSTELLAZIONE || ""}</td>
                <td>${obj.TIPO || ""}</td>
                <td>${obj.MAGFOTO || ""}</td>
                <td>${obj.MAGVIS || ""}</td>
                <td>${obj.DIMMAX || ""}</td>
                <td>${altCell}${chartIcon}</td>
                <td>${azCell}</td>
            `;

            /* Click sulla riga: apre/chiude il grafico di dettaglio */

            if (obs.attivo) {
                row.addEventListener("click", function () {
                    toggleDetailRow(row, obj, obs);
                });
            }

        }
        catch (rowError) {
            console.error("OGGETTI.JS - Errore sulla riga " + index + ":", rowError, obj);
            row.innerHTML =
                `<td colspan="15" class="coord-na">Errore sul calcolo di questo oggetto: ${rowError.message}</td>`;
        }

        tbody.appendChild(row);

    });

}

/* =====================================================
   SOTTORIGA DI DETTAGLIO CON IL GRAFICO
   Apre il grafico sotto la riga cliccata; un secondo
   click la chiude. Una sola sottoriga alla volta.
===================================================== */

function toggleDetailRow(row, obj, obs) {

    const rowId = row.dataset.id;

    // Se la sottoriga di questa riga e' gia' aperta: chiudi
    if (openDetailId === rowId) {
        closeDetailRow(row);
        return;
    }

    // Chiude eventuale altra sottoriga aperta
    document.querySelectorAll("tr.detail-row").forEach(dr => {
        const prev = dr.previousElementSibling;
        if (prev && prev.classList) prev.classList.remove("row-open");
        dr.remove();
    });

    // Costruisce la sottoriga con il grafico
    const detail = document.createElement("tr");
    detail.className = "detail-row";

    const cell = document.createElement("td");
    cell.colSpan = 15;

    try {
        cell.innerHTML = buildAltitudeChart(obj, obs);
    }
    catch (error) {
        console.error("OGGETTI.JS - Errore nella costruzione del grafico:", error, obj);
        cell.innerHTML =
            `<p class="coord-na">Errore nella costruzione del grafico: ${error.message}</p>`;
    }

    detail.appendChild(cell);
    row.after(detail);
    row.classList.add("row-open");

    openDetailId = rowId;
}

function closeDetailRow(row) {
    const detail = row.nextElementSibling;
    if (detail && detail.classList && detail.classList.contains("detail-row")) {
        detail.remove();
    }
    row.classList.remove("row-open");
    openDetailId = null;
}

/* =====================================================
   FILTRI
===================================================== */

function initFilters() {

    const filterIds = [
        "filterCATALOGO",
        "filterTIPO",
        "filterMAGFOTO",
        "filterDIMMAX"
    ];

    filterIds.forEach(id => {

        const field = document.getElementById(id);
        if (!field) return;

        const event =
            (id === "filterTIPO") ? "change" : "input";

        field.addEventListener(event, function () {
            renderTable();
        });

    });

    ["obsDate", "obsTime", "obsPlace"].forEach(id => {
        const field = document.getElementById(id);
        if (!field) return;
        field.addEventListener("change", function () {
            renderTable();
        });
        field.addEventListener("input", function () {
            renderTable();
        });
    });

    /* Azzera filtri */

    const reset = document.getElementById("resetFilters");
    if (reset) {
        reset.addEventListener("click", function () {
            filterIds.forEach(id => {
                const field = document.getElementById(id);
                if (!field) return;
                if (id === "filterTIPO") {
                    field.value = "all";
                } else {
                    field.value = "";
                }
            });
            renderTable();
        });
    }

    /* Ordinamento colonne cliccabili */

    const sortHeaders = document.querySelectorAll("#objectTable th.sortable");

    sortHeaders.forEach(th => {

        th.addEventListener("click", function () {

            const key = th.dataset.sort;

            if (!key) return;

            if (sortState && sortState.key === key) {
                if (sortState.dir === 1) {
                    sortState = { key: key, dir: -1 };
                } else {
                    sortState = null;
                }
            } else {
                sortState = { key: key, dir: 1 };
            }

            renderTable();
        });

    });

}

/* =====================================================
   AVVIO
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        checkDependencies();

        loadObjects();
        loadPlaces();
    }
);
