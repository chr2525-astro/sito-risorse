/* =====================================================
   COORDCALC.JS
   Calcolo di altezza (h) e azimut (A) di un oggetto
   celeste a partire da coordinate equatoriali J2000,
   luogo di osservazione e data/ora.

   Formule:
   - Tempo siderale locale (LST) da data/ora e longitudine
   - Angolo orario H = LST - AR
   - h = asin( sin(dec)·sin(lat) + cos(dec)·cos(lat)·cos(H) )
   - A = atan2( sin(H), cos(H)·sin(lat) - tan(dec)·cos(lat) ) + 180
     (azimut misurato da Nord, cresce verso Est)
===================================================== */

const DEG = Math.PI / 180;   // gradi -> radianti
const RAD = 180 / Math.PI;   // radianti -> gradi

/* =====================================================
   PARSING DELLE COORDINATE
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
   TEMPO SIDEROLO LOCALE (LST) IN GRADI
   Basato sull'equinozio J2000 (algoritmo semplificato,
   accuratezza ~ arcminuti)
===================================================== */

function getJulianDate(date) {
    return date.getTime() / 86400000 + 2440587.5;
}

function getLSTDegrees(date, longitudeDeg) {

    const jd = getJulianDate(date);

    // Giorni trascorsi da J2000.0
    const T = Math.floor(jd - 0.5) + 0.5 - 2451545.0;  // giorni a mezzanotte UT

    // Tempo siderale medio di Greenwich in ore
    let gmstHours =
        6.697374558 +
        0.06570982441908 * T +
        (date.getUTCHours() +
            date.getUTCMinutes() / 60 +
            date.getUTCSeconds() / 3600) * 1.00273790935;

    // Normalizza 0-24 ore
    gmstHours = ((gmstHours % 24) + 24) % 24;

    // Aggiunge la longitudine (Est positiva) e converte in gradi
    let lst = gmstHours * 15 + longitudeDeg;

    // Normalizza 0-360 gradi
    lst = ((lst % 360) + 360) % 360;

    return lst;
}

/* =====================================================
   CALCOLO ALTEZZA E AZIMUT
   Restituisce { altezza: gradi, azimut: gradi, valido: bool }
   oppure { valido: false } se i dati sono insufficienti
===================================================== */

function computeAltAz(raString, decString, date, latitudeDeg, longitudeDeg) {

    const ra = parseRA(raString);
    const dec = parseDEC(decString);

    if (ra === null || dec === null) return { valido: false };
    if (date === null || isNaN(date.getTime())) return { valido: false };
    if (isNaN(latitudeDeg) || isNaN(longitudeDeg)) return { valido: false };

    const lst = getLSTDegrees(date, longitudeDeg);

    // Angolo orario in gradi, normalizzato -180..+180
    let H = lst - ra;
    if (H > 180) H -= 360;
    if (H < -180) H += 360;

    // Conversione in radianti
    const Hr = H * DEG;
    const latR = latitudeDeg * DEG;
    const decR = dec * DEG;

    // Altezza
    const sinAlt =
        Math.sin(decR) * Math.sin(latR) +
        Math.cos(decR) * Math.cos(latR) * Math.cos(Hr);

    const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt))) * RAD;

    // Azimut: la formula atan2 fornisce l'angolo dal SUD,
    // si aggiungono 180 gradi per ottenere l'azimut dal NORD
    const cosAzDen =
        Math.cos(Hr) * Math.sin(latR) -
        Math.tan(decR) * Math.cos(latR);

    const az =
        (Math.atan2(
            Math.sin(Hr),
            cosAzDen
        ) * RAD + 180);

    let azNorm = (az + 360) % 360;  // 0 = Nord, 90 = Est

    return {
        valido: true,
        altezza: alt,
        azimut: azNorm,
        sottoOrizzonte: alt < 0
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