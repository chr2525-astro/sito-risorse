/* =====================================================
   OSSERVAZIONE.JS
   Dashboard "Stasera si osserva?" per la pagina
   osservazione.html.

   - Data e luogo (da data/luoghi.json) in cima alla pagina
   - Calcoli astronomici con Astronomy Engine:
     tramonto, inizio/fine buio astronomico, alba,
     sorgere/tramonto Luna, fase lunare
   - Meteo serale da Open-Meteo (gratuito, senza API key)
   - Attività solare da NOAA SWPC (indice Kp, regioni attive)
   - Punteggio sintetico di osservabilità 0-100
===================================================== */

let places = [];

/* =====================================================
   FORMATTAZIONE ORARI (ora italiana, Europe/Rome)
===================================================== */

const fmtTime = new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit"
});

const fmtDay = new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    weekday: "short",
    day: "numeric",
    month: "short"
});

const fmtDayFull = new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    weekday: "long",
    day: "numeric",
    month: "long"
});

function orario(date) {
    return fmtTime.format(date);
}

function orarioEsteso(date) {
    return fmtDay.format(date) + " " + fmtTime.format(date);
}

function dom(id) {
    return document.getElementById(id);
}

function na(msg) {
    return '<p class="obs-na">' + msg + "</p>";
}

/* =====================================================
   CARICAMENTO LUOGHI
===================================================== */

async function loadPlaces() {

    const response = await fetch("data/luoghi.json");
    const data = await response.json();
    places = data.luoghi || [];

    const select = dom("obsPlace");

    places.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.nome;
        opt.textContent = p.nome;
        select.appendChild(opt);
    });
}

/* =====================================================
   CALCOLI ASTRONOMICI (Astronomy Engine)
===================================================== */

function computeAstronomy(place, dateStr) {

    /* mezzogiorno UTC della data selezionata */
    const t0 = Astronomy.MakeTime(new Date(dateStr + "T12:00:00Z"));
    const observer = new Astronomy.Observer(
        parseFloat(place.latitudine),
        parseFloat(place.longitudine),
        0
    );

    const result = { luogo: place.nome };

    /* --- SOLE --- */
    const sunset = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, t0, 2);

    if (sunset) {
        result.tramonto = sunset.date;

        /* fine crepuscolo astronomico (sole a -18 gradi, scende) */
        const darkStart = Astronomy.SearchAltitude(
            Astronomy.Body.Sun, observer, -1, sunset, 1, -18);

        if (darkStart) {
            result.buioInizio = darkStart.date;

            /* inizio crepuscolo del mattino (sole a -18 gradi, risale) */
            const darkEnd = Astronomy.SearchAltitude(
                Astronomy.Body.Sun, observer, +1, darkStart, 2, -18);

            if (darkEnd) {
                result.buioFine = darkEnd.date;

                /* alba successiva */
                const sunrise = Astronomy.SearchRiseSet(
                    Astronomy.Body.Sun, observer, +1, darkEnd, 1);
                if (sunrise) result.alba = sunrise.date;
            }
        }
    }

    /* --- LUNA --- */
    const moonSet = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, -1, t0, 2);
    const moonRise = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, +1, t0, 2);

    if (moonSet) result.lunaTramonta = moonSet.date;
    if (moonRise) result.lunaSorge = moonRise.date;

    /* fase lunare nel cuore della notte */
    let midNight = null;
    if (result.buioInizio && result.buioFine) {
        midNight = new Date(
            (result.buioInizio.getTime() + result.buioFine.getTime()) / 2
        );
    } else if (result.tramonto) {
        midNight = new Date(result.tramonto.getTime() + 5 * 3600 * 1000);
    }

    if (midNight) {
        const ill = Astronomy.Illumination(Astronomy.Body.Moon, midNight);
        result.lunaIlluminazione = ill.phase_fraction;   /* 0..1 */
        result.lunaFase = Astronomy.MoonPhase(midNight); /* angolo 0-360 gradi */

        /* presenza della luna sopra l'orizzonte nel buio astronomico */
        if (result.buioInizio && result.buioFine) {
            let sopra = 0, campioni = 0, altMax = -90;
            const inizio = result.buioInizio.getTime();
            const fine = result.buioFine.getTime();

            for (let i = 0; i <= 12; i++) {
                const t = new Date(inizio + (fine - inizio) * i / 12);
                const time = Astronomy.MakeTime(t);
                const eq = Astronomy.Equator(Astronomy.Body.Moon, time, observer, true, true);
                const hor = Astronomy.Horizon(time, observer, eq.ra, eq.dec, "normal");
                campioni++;
                if (hor.altitude > 0) sopra++;
                if (hor.altitude > altMax) altMax = hor.altitude;
            }

            result.lunaPresenzaBuio = sopra / campioni;   /* 0..1 */
            result.lunaAltezzaMax = altMax;
        }
    }

    /* durata del buio astronomico in ore */
    if (result.buioInizio && result.buioFine) {
        result.oreBuio =
            (result.buioFine.getTime() - result.buioInizio.getTime()) / 3600000;
    }

    return result;
}

/* =====================================================
   RENDER CIELO E LUNA
===================================================== */

function nomeFaseLuna(angolo) {
    if (angolo === undefined || angolo === null || isNaN(angolo)) return null;
    const a = ((angolo % 360) + 360) % 360;
    if (a < 22.5 || a >= 337.5) return "Luna nuova";
    if (a < 67.5)  return "Luna crescente";
    if (a < 112.5) return "Primo quarto";
    if (a < 157.5) return "Gibbosa crescente";
    if (a < 202.5) return "Luna piena";
    if (a < 247.5) return "Gibbosa calante";
    if (a < 292.5) return "Ultimo quarto";
    return "Luna calante";
}

function renderSky(astro) {

    const el = dom("skyList");
    const rows = [];

    const add = (etichetta, valore) => {
        if (valore) {
            rows.push(
                '<div class="sky-item"><span>' + etichetta +
                '</span><span class="t">' + valore + "</span></div>"
            );
        }
    };

    add('<i class="fa-solid fa-arrow-down"></i> Tramonto del Sole', orario(astro.tramonto));
    add('<i class="fa-solid fa-moon"></i> Inizio buio astronomico', orario(astro.buioInizio));
    add('<i class="fa-solid fa-sun"></i> Fine buio astronomico', orario(astro.buioFine));
    add('<i class="fa-solid fa-arrow-up"></i> Alba', orario(astro.alba));

    if (astro.oreBuio) {
        add('<i class="fa-solid fa-clock"></i> Ore di buio vero',
            astro.oreBuio.toFixed(1) + " h");
    }

    add('<i class="fa-solid fa-arrow-up"></i> Luna sorge',
        astro.lunaSorge ? orarioEsteso(astro.lunaSorge) : null);
    add('<i class="fa-solid fa-arrow-down"></i> Luna tramonta',
        astro.lunaTramonta ? orarioEsteso(astro.lunaTramonta) : null);

    if (astro.lunaFase !== undefined) {
        add('<i class="fa-solid fa-moon"></i> Fase della Luna',
            nomeFaseLuna(astro.lunaFase));
    }

    if (astro.lunaIlluminazione !== undefined) {
        add('<i class="fa-solid fa-circle-half-stroke"></i> Luna illuminata',
            (astro.lunaIlluminazione * 100).toFixed(0) + " %");
    }

    if (astro.lunaAltezzaMax !== undefined && astro.lunaPresenzaBuio !== undefined) {
        add('<i class="fa-solid fa-arrows-up-down"></i> Luna nel buio',
            (astro.lunaPresenzaBuio * 100).toFixed(0) + " % · max " +
            (astro.lunaAltezzaMax > 0 ? "+" : "") +
            astro.lunaAltezzaMax.toFixed(0) + "°");
    }

    el.innerHTML = rows.length > 0 ? rows.join("") : na("Dati non disponibili");

    /* nota sintetica */
    const note = dom("skyNote");
    if (astro.buioInizio && astro.buioFine) {
        if (astro.lunaPresenzaBuio === 0) {
            note.textContent = "Finestra di buio senza Luna: ideale per il cielo profondo.";
        } else if (astro.lunaPresenzaBuio < 0.4) {
            note.textContent = "Luna presente solo per una parte del buio: pianifica il cielo profondo nelle ore senza Luna.";
        } else if (astro.lunaIlluminazione < 0.35) {
            note.textContent = "Luna presente ma poco illuminata: disturbo limitato.";
        } else {
            note.textContent = "Luna molto presente e illuminata: meglio pianeti e Luna stessa.";
        }
    } else {
        note.textContent = "";
    }
}

/* =====================================================
   METEO (Open-Meteo)
===================================================== */

async function fetchMeteo(place, dateStr) {

    const [y, m, d] = dateStr.split("-").map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    const dateEnd = next.toISOString().slice(0, 10);

    const url =
        "https://api.open-meteo.com/v1/forecast" +
        "?latitude=" + place.latitudine +
        "&longitude=" + place.longitudine +
        "&hourly=cloud_cover,precipitation_probability,relative_humidity_2m,wind_speed_10m,visibility" +
        "&timezone=Europe%2FBerlin" +
        "&start_date=" + dateStr +
        "&end_date=" + dateEnd;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Open-Meteo HTTP " + response.status);
    return response.json();
}

/* estrae le ore della serata 18:00-23:00 + 00:00-03:00 locali */
function estraiSerata(meteo, dateStr) {

    const times = meteo.hourly.time;
    const out = [];

    for (let i = 0; i < times.length; i++) {
        const t = times[i];                /* es. "2026-11-06T18:00" */
        const giorno = t.slice(0, 10);
        const ora = Number(t.slice(11, 13));

        const inGiorno = (giorno === dateStr && ora >= 18 && ora <= 23);
        const notteDopo = (giorno !== dateStr && ora <= 3);

        if (inGiorno || notteDopo) {
            out.push({
                ora: t.slice(11, 16),
                nuvolosita: meteo.hourly.cloud_cover[i],
                pioggia: meteo.hourly.precipitation_probability[i],
                umidita: meteo.hourly.relative_humidity_2m[i],
                vento: meteo.hourly.wind_speed_10m[i],
                visibilita: meteo.hourly.visibility ? meteo.hourly.visibility[i] / 1000 : null
            });
        }
    }
    return out;
}

function media(arr) {
    const val = arr.filter(v => v !== null && v !== undefined && !isNaN(v));
    if (val.length === 0) return null;
    return val.reduce((a, b) => a + b, 0) / val.length;
}

function renderMeteo(serata) {

    const el = dom("meteoList");

    if (!serata || serata.length === 0) {
        el.innerHTML = na("Dati meteo non disponibili.");
        return;
    }

    const rows = serata.map(h => {
        const pct = h.nuvolosita === null || h.nuvolosita === undefined
            ? 0 : Math.max(2, h.nuvolosita);
        return (
            '<div class="meteo-row">' +
            '<span class="hh">' + h.ora + "</span>" +
            '<span class="meteo-bar-track">' +
            '<span class="meteo-bar" style="width:' + pct + '%"></span></span>' +
            '<span class="vv">' +
            (h.nuvolosita === null || h.nuvolosita === undefined
                ? "–" : h.nuvolosita.toFixed(0) + " %") +
            "</span></div>"
        );
    });

    el.innerHTML = rows.join("");

    const extra = dom("meteoExtra");
    const umid = media(serata.map(h => h.umidita));
    const vento = media(serata.map(h => h.vento));
    const pioggia = Math.max(...serata.map(h => h.pioggia ?? 0));
    const vis = media(serata.map(h => h.visibilita));

    const pezzi = [];
    if (umid !== null) pezzi.push('<span><i class="fa-solid fa-droplet"></i>Umidità ' + umid.toFixed(0) + " %</span>");
    if (vento !== null) pezzi.push('<span><i class="fa-solid fa-wind"></i>Vento ' + vento.toFixed(0) + " km/h</span>");
    if (pioggia !== null) pezzi.push('<span><i class="fa-solid fa-umbrella"></i>Pioggia max ' + pioggia.toFixed(0) + " %</span>");
    if (vis !== null) pezzi.push('<span><i class="fa-solid fa-eye"></i>Visibilità ' + vis.toFixed(0) + " km</span>");

    extra.innerHTML = pezzi.join("");
}

/* =====================================================
   ATTIVITA' SOLARE (NOAA SWPC)
===================================================== */

async function fetchSWPC() {

    const [kpRes, regioniRes] = await Promise.allSettled([
        fetch("https://services.swpc.noaa.gov/json/planetary_k_index_1m.json").then(r => r.json()),
        fetch("https://services.swpc.noaa.gov/json/solar_regions.json").then(r => r.json())
    ]);

    const out = {};

    if (kpRes.status === "fulfilled" && Array.isArray(kpRes.value) && kpRes.value.length > 0) {
        const ultimo = kpRes.value[kpRes.value.length - 1];
        out.kp = Number(ultimo.estimated_kp ?? ultimo.kp_index ?? 0);
        out.kpOra = ultimo.time_tag;
        out.kpStorico = kpRes.value.slice(-24);   /* ultime 24 letture per il popup */
    }

    if (regioniRes.status === "fulfilled" && Array.isArray(regioniRes.value)) {

        const tutte = regioniRes.value;
        const ultimaData = tutte.reduce((max, r) =>
            (r.observed_date && r.observed_date > max ? r.observed_date : max), "");

        const odierne = tutte.filter(r => r.observed_date === ultimaData);

        out.regioniDettaglio = odierne;   /* dettaglio completo per i popup */
        out.data = ultimaData;
        out.regioni = odierne.length;
        out.macchie = odierne.reduce((s, r) => s + (r.number_spots || 0), 0);
        out.delta = odierne.filter(r =>
            typeof r.mag_class === "string" && r.mag_class.includes("D")).length;
        out.flares = odierne.reduce((s, r) =>
            s + (r.c_xray_events || 0) + (r.m_xray_events || 0) + (r.x_xray_events || 0), 0);

        const top = odierne.slice().sort((a, b) => (b.area || 0) - (a.area || 0))[0];
        if (top) {
            out.topRegione = "AR" + top.region +
                " (" + (top.location || "?") + ", classe " + (top.spot_class || "?") +
                ", mag " + (top.mag_class || "?") + ", " + (top.number_spots || 0) + " macchie)";
        }
    }

    return out;
}

function renderSun(swpc) {

    const el = dom("sunGrid");

    const stats = [];

    if (swpc.kp !== undefined) {
        const kpPos = Math.min(100, (swpc.kp / 9) * 100);
        stats.push(
            '<div class="sun-stat sun-click" data-popup="kp" title="Clicca per i dettagli">' +
            '<div class="big">' + swpc.kp.toFixed(1) + "</div>" +
            '<div class="cap">Indice Kp (0–9)</div>' +
            '<div class="kp-track"><div class="kp-thumb" style="left:' + kpPos + '%"></div></div>' +
            "</div>"
        );
    }

    if (swpc.regioni !== undefined) {
        stats.push(
            '<div class="sun-stat sun-click" data-popup="regioni" title="Clicca per i dettagli">' +
            '<div class="big">' + swpc.regioni + "</div>" +
            '<div class="cap">Regioni attive</div>' +
            "</div>"
        );
    }

    if (swpc.macchie !== undefined) {
        stats.push(
            '<div class="sun-stat sun-click" data-popup="macchie" title="Clicca per i dettagli">' +
            '<div class="big">' + swpc.macchie + "</div>" +
            '<div class="cap">Macchie solari totali</div>' +
            "</div>"
        );
    }

    if (swpc.flares !== undefined) {
        stats.push(
            '<div class="sun-stat sun-click" data-popup="flare" title="Clicca per i dettagli">' +
            '<div class="big">' + swpc.flares + "</div>" +
            '<div class="cap">Flare C+M+X oggi</div>' +
            "</div>"
        );
    }

    el.innerHTML = stats.length > 0
        ? stats.join("")
        : na("Dati di attività solare non disponibili.");

    /* clic su un riquadro: apre il popup di dettaglio */
    el.querySelectorAll(".sun-click").forEach(s => {
        s.addEventListener("click", () =>
            showSunPopup(s.getAttribute("data-popup"), swpc));
    });

    const note = dom("sunNote");
    let testo = 'Dati: <a href="https://www.swpc.noaa.gov" target="_blank">NOAA SWPC</a>';

    if (swpc.kp !== undefined) {
        if (swpc.kp >= 5) {
            testo += " — Kp alto: possibile attività aurorale, anche a latitudini insolite.";
        } else if (swpc.kp >= 4) {
            testo += " — Kp moderato: aurora possibile solo a alte latitudini.";
        } else {
            testo += " — Quiete geospaziale: nessun disturbo aurorale atteso.";
        }
    }

    if (swpc.delta !== undefined && swpc.delta > 0) {
        testo += " Attenzione: " + swpc.delta +
            " regione/i con configurazione magnetica delta (potenziale di flare).";
    }

    if (swpc.topRegione) {
        testo += " Regione principale: " + swpc.topRegione + ".";
    }

    testo += " <em>Clicca su un riquadro per i dettagli.</em>";

    note.innerHTML = testo;
}

/* =====================================================
   POPUP DETTAGLI ATTIVITA' SOLARE
===================================================== */

function fmtKpTime(t) {
    if (!t) return "–";
    let s = String(t).replace(" ", "T");
    if (!/[Z+]/.test(s)) s += "Z";
    const d = new Date(s);
    return isNaN(d) ? String(t) : orario(d);
}

function kpScala(v) {
    const pos = Math.max(0, Math.min(100, (v / 9) * 100));
    return '<span class="kp-track"><span class="kp-thumb" style="left:' + pos + '%"></span></span>';
}

function showSunPopup(tipo, swpc) {

    const overlay = dom("sunPopup");
    let title = "";
    let body = "";

    if (tipo === "kp" && Array.isArray(swpc.kpStorico) && swpc.kpStorico.length > 0) {

        title = "Indice Kp — ultime " + swpc.kpStorico.length + " letture";
        body =
            '<table class="sun-table"><thead><tr>' +
            "<th>Ora</th><th>Kp stimato</th><th>Scala 0–9</th>" +
            "</tr></thead><tbody>" +
            swpc.kpStorico.map(k => {
                const v = Number(k.estimated_kp ?? k.kp_index ?? 0);
                return "<tr><td>" + fmtKpTime(k.time_tag) + "</td><td>" +
                    v.toFixed(2) + "</td><td>" + kpScala(v) + "</td></tr>";
            }).join("") +
            "</tbody></table>" +
            '<p class="sun-popup-note">Kp ≥ 5: tempesta geomagnetica possibile, aurora anche a latitudini insolite. Orari in ora italiana.</p>';

    } else if (tipo === "regioni" && Array.isArray(swpc.regioniDettaglio)) {

        title = "Regioni attive del " + (swpc.data || "");
        body =
            '<table class="sun-table"><thead><tr>' +
            "<th>Regione</th><th>Posizione</th><th>Classe</th><th>Mag.</th><th>Area</th>" +
            "</tr></thead><tbody>" +
            swpc.regioniDettaglio.map(r =>
                "<tr><td>AR" + r.region + "</td><td>" + (r.location || "–") + "</td><td>" +
                (r.spot_class || "–") + "</td><td>" + (r.mag_class || "–") + "</td><td>" +
                (r.area || "–") + "</td></tr>"
            ).join("") +
            "</tbody></table>" +
            '<p class="sun-popup-note">Posizione in coordinate elioografiche (es. S14E05). Classe: Zurich/McIntosh. Mag.: complessità magnetica (D = delta, la più esplosiva). Area in milionesimi del disco solare.</p>';

    } else if (tipo === "macchie" && Array.isArray(swpc.regioniDettaglio)) {

        const tot = swpc.macchie || 0;
        title = "Macchie per regione — totale " + tot;
        const righe = swpc.regioniDettaglio.slice()
            .sort((a, b) => (b.number_spots || 0) - (a.number_spots || 0));
        body = righe.map(r => {
            const n = r.number_spots || 0;
            const w = tot > 0 ? Math.max(2, (n / tot) * 100) : 0;
            return '<div class="meteo-row"><span class="hh">AR' + r.region + "</span>" +
                '<span class="meteo-bar-track">' +
                '<span class="meteo-bar" style="width:' + w + '%"></span></span>' +
                '<span class="vv">' + n + "</span></div>";
        }).join("") +
        '<p class="sun-popup-note">Numero di macchie componenti ciascun gruppo, in ordine decrescente.</p>';

    } else if (tipo === "flare" && Array.isArray(swpc.regioniDettaglio)) {

        title = "Brillamenti per regione (classi C / M / X)";
        const righe = swpc.regioniDettaglio.slice()
            .sort((a, b) =>
                ((b.x_xray_events || 0) * 100 + (b.m_xray_events || 0) * 10 + (b.c_xray_events || 0)) -
                ((a.x_xray_events || 0) * 100 + (a.m_xray_events || 0) * 10 + (a.c_xray_events || 0)));
        body =
            '<table class="sun-table"><thead><tr>' +
            "<th>Regione</th><th>C</th><th>M</th><th>X</th><th>Tot.</th>" +
            "</tr></thead><tbody>" +
            righe.map(r => {
                const c = r.c_xray_events || 0;
                const m = r.m_xray_events || 0;
                const x = r.x_xray_events || 0;
                return "<tr><td>AR" + r.region + "</td><td>" + c + "</td><td" +
                    (m > 0 ? ' class="warn"' : "") + ">" + m + "</td><td" +
                    (x > 0 ? ' class="warn"' : "") + ">" + x + "</td><td>" +
                    (c + m + x) + "</td></tr>";
            }).join("") +
            "</tbody></table>" +
            '<p class="sun-popup-note">Classi di brillamento in ordine di potenza: C (lievi), M (medie), X (le più intense). Le classi M e X possono innescare tempeste geomagnetiche nei giorni successivi.</p>';

    } else {
        return;   /* dati non disponibili per questo popup */
    }

    dom("sunPopupTitle").innerHTML = title;
    dom("sunPopupBody").innerHTML = body;
    overlay.hidden = false;
}

function closeSunPopup() {
    dom("sunPopup").hidden = true;
}

/* =====================================================
   VERDETTO
===================================================== */

function renderVerdict(astro, serata) {

    const ring = dom("scoreRing");
    const title = dom("verdictTitle");
    const reasons = dom("verdictReasons");

    const items = [];

    let score = null;

    /* --- contributo meteo --- */
    const nuvol = serata && serata.length > 0 ? media(serata.map(h => h.nuvolosita)) : null;

    if (nuvol !== null) {
        const base = 100 - nuvol;
        items.push({ pct: base, ok: true,
            txt: "Nuvolosità media serale " + nuvol.toFixed(0) +
                 "% → base " + base.toFixed(0) + "/100" });

        /* penalità luna */
        if (astro.lunaIlluminazione !== undefined && astro.lunaPresenzaBuio !== undefined) {
            const disturbo = astro.lunaIlluminazione * astro.lunaPresenzaBuio;
            const penalta = disturbo * 55;
            if (penalta > 1) {
                items.push({ pct: -penalta, ok: false,
                    txt: "Luna " + (astro.lunaIlluminazione * 100).toFixed(0) +
                         "% illuminata, presente nel buio per il " +
                         (astro.lunaPresenzaBuio * 100).toFixed(0) +
                         "% del tempo → -" + penalta.toFixed(0) });
            } else {
                items.push({ pct: 0, ok: true,
                    txt: "Disturbo lunare trascurabile" });
            }
            score = base - penalta;
        } else {
            score = base;
        }

        /* penalità umidità e vento */
        const umid = media(serata.map(h => h.umidita));
        const vento = media(serata.map(h => h.vento));

        if (umid !== null && umid > 80) {
            const p = (umid - 80) * 0.5;
            items.push({ pct: -p, ok: false,
                txt: "Umidità " + umid.toFixed(0) + "% → rischio rugiada/nebbia, -" + p.toFixed(0) });
            score -= p;
        }

        if (vento !== null && vento > 15) {
            const p = (vento - 15) * 1.2;
            items.push({ pct: -p, ok: false,
                txt: "Vento " + vento.toFixed(0) + " km/h → telescopio instabile, -" + p.toFixed(0) });
            score -= p;
        }

    } else {
        items.push({ pct: 0, ok: false,
            txt: "Meteo non disponibile: verdetto basato solo sulla Luna" });

        if (astro.lunaIlluminazione !== undefined && astro.lunaPresenzaBuio !== undefined) {
            const disturbo = astro.lunaIlluminazione * astro.lunaPresenzaBuio;
            score = 70 - disturbo * 55;
            if (disturbo < 0.1) {
                items.push({ pct: 0, ok: true, txt: "Finestra di buio senza Luna" });
            }
        }
    }

    if (score !== null) {
        score = Math.max(0, Math.min(100, Math.round(score)));

        ring.querySelector(".val").textContent = score;

        let colore;
        let giudizio;
        if (score >= 75)  { colore = "#4caf50"; giudizio = "Serata ottima per l'osservazione"; }
        else if (score >= 55) { colore = "#8bc34a"; giudizio = "Serata buona"; }
        else if (score >= 35) { colore = "#ff9800"; giudizio = "Serata discreta"; }
        else { colore = "#f44336"; giudizio = "Serata poco promettente"; }

        ring.style.borderColor = colore;
        title.textContent = giudizio;
    } else {
        title.textContent = "Dati insufficienti";
    }

    reasons.innerHTML = items.map(i =>
        "<li><i class=\"fa-solid " + (i.ok ? "fa-check" : "fa-triangle-exclamation") +
        "\"></i>" + i.txt + "</li>"
    ).join("");
}

/* =====================================================
   EVENTI (data/eventi.json, aggiornato a mano)
===================================================== */

function oggiRoma() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Rome",
        year: "numeric", month: "2-digit", day: "2-digit"
    }).format(new Date());
}

function dataPlusGiorni(dataStr, giorni) {
    const [y, m, d] = dataStr.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d + giorni)).toISOString().slice(0, 10);
}

const iconeEvento = {
    meteore: "meteor",
    eclissi: "circle-half-stroke",
    congiunzione: "star",
    occultazione: "moon",
    pianeti: "globe",
    cometa: "comet",
    altro: "calendar-days"
};

async function aggiornaEventi() {

    const el = dom("eventiList");

    try {
        const r = await fetch("data/eventi.json");
        if (!r.ok) throw new Error("HTTP " + r.status);
        const dati = await r.json();
        const lista = dati.eventi || [];

        const oggi = oggiRoma();
        const limite = dataPlusGiorni(oggi, 30);

        const futuri = lista
            .filter(e => e.data && e.data >= oggi && e.data <= limite)
            .sort((a, b) =>
                (a.data + (a.ora || "")).localeCompare(b.data + (b.ora || "")));

        if (futuri.length === 0) {
            el.innerHTML = na("Nessun evento segnalato nei prossimi 30 giorni.");
        } else {
            el.innerHTML = futuri.map(e => {
                const icona = iconeEvento[e.tipo] || iconeEvento.altro;
                const chip = e.tipo ? ' <span class="chip">' + e.tipo + "</span>" : "";
                const dt = new Date(e.data + "T12:00:00Z");
                return '<div class="evento">' +
                    '<div class="evento-head">' +
                    '<span><i class="fa-solid fa-' + icona + '"></i> ' +
                    (e.titolo || "Evento") + chip + "</span>" +
                    '<span class="t">' + fmtDayFull.format(dt) +
                    (e.ora ? " · " + e.ora : "") + "</span></div>" +
                    (e.descrizione
                        ? '<div class="evento-desc">' + e.descrizione + "</div>" : "") +
                    (e.visibilita
                        ? '<div class="evento-desc"><i class="fa-solid fa-eye"></i> ' +
                          e.visibilita + "</div>" : "") +
                    "</div>";
            }).join("");
        }

        dom("eventiNote").innerHTML =
            'Eventi curati manualmente nel file <code>data/eventi.json</code>.';

    } catch (err) {
        console.error("OSSERVAZIONE.JS - Errore eventi:", err);
        el.innerHTML = na("File eventi non raggiungibile.");
    }
}

/* =====================================================
   FASI LUNARI (prossimi 30 giorni, calcolo locale)
===================================================== */

async function aggiornaFasi() {

    const el = dom("fasiList");

    try {
        const nomi = { 0: "Luna nuova", 90: "Primo quarto", 180: "Luna piena", 270: "Ultimo quarto" };
        const icone = { 0: "fa-moon", 90: "fa-circle-half-stroke", 180: "fa-circle", 270: "fa-circle-half-stroke" };

        const adesso = new Date();
        const fasi = [];

        for (const ang of [0, 90, 180, 270]) {
            const t = Astronomy.SearchMoonPhase(ang, adesso, 31);
            if (t) fasi.push({ t: t.date, nome: nomi[ang], icona: icone[ang] });
        }

        fasi.sort((a, b) => a.t - b.t);

        el.innerHTML = fasi.map(f =>
            '<div class="sky-item"><span><i class="fa-solid ' + f.icona + '"></i> ' + f.nome +
            '</span><span class="t">' + fmtDayFull.format(f.t) + " · " + orario(f.t) + "</span></div>"
        ).join("");

        dom("fasiNote").textContent =
            "Momenti esatti delle fasi principali (ora italiana).";

    } catch (err) {
        console.error("OSSERVAZIONE.JS - Errore fasi lunari:", err);
        el.innerHTML = na("Fasi lunari non disponibili.");
    }
}

/* =====================================================
   PASSAGGI ISS (calcolo locale da TLE)
===================================================== */

let issTLE = null;
let issTLEOra = 0;

async function scaricaTLE() {

    if (issTLE && Date.now() - issTLEOra < 12 * 3600000) return issTLE;

    /* prima scelta: CelesTrak (testo, 3 righe) */
    try {
        const r = await fetch(
            "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE");
        if (r.ok) {
            const righe = (await r.text()).trim().split("\n").map(s => s.trim());
            if (righe.length >= 3 && righe[1].startsWith("1 ") && righe[2].startsWith("2 ")) {
                issTLE = [righe[1], righe[2]];
                issTLEOra = Date.now();
                return issTLE;
            }
        }
    } catch (e) { /* passa al fallback */ }

    /* fallback: TLE API (JSON) */
    const r2 = await fetch("https://tle.ivanstanojevic.me/api/tle/25544");
    if (!r2.ok) throw new Error("TLE non disponibile");
    const j = await r2.json();
    issTLE = [j.line1, j.line2];
    issTLEOra = Date.now();
    return issTLE;
}

function direzione(az) {
    const rose = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
    const a = ((az % 360) + 360) % 360;
    return rose[Math.round(a / 45) % 8];
}

/* Sole sopra l'orizzonte dell'osservatore? altitudine in gradi */
function altSole(d, obs, astro) {
    const time = astro.MakeTime(d);
    const eq = astro.Equator(astro.Body.Sun, time, obs, true, true);
    const hor = astro.Horizon(time, obs, eq.ra, eq.dec, "normal");
    return hor.altitude;
}

/* la ISS è illuminata dal Sole?
   (approssimazione con cilindro d'ombra: basta per i passaggi) */
function issIlluminata(posEci, d, astro) {

    const AU = 149597870.7;             /* km */
    const R = 6378;                     /* raggio Terra in km */
    const sole = astro.GeoVector(astro.Body.Sun, astro.MakeTime(d), true);
    const sx = sole.x * AU, sy = sole.y * AU, sz = sole.z * AU;

    const dot = posEci.x * sx + posEci.y * sy + posEci.z * sz;
    if (dot > 0) return true;           /* lato diurno: illuminata */

    /* lato notturno: distanza perpendicolare dall'asse Terra-Sole */
    const s2 = sx * sx + sy * sy + sz * sz;
    const t = dot / s2;
    const px = posEci.x - t * sx;
    const py = posEci.y - t * sy;
    const pz = posEci.z - t * sz;
    return (px * px + py * py + pz * pz) > R * R;
}

/* campiona la posizione della ISS ogni 30 s e raggruppa i passaggi
   con elevazione massima sopra il minimo (default 10 gradi).
   Per ogni passaggio memorizza anche:
   - soleAlt: altitudine del Sole all'istante del massimo
   - illuminata: ISS fuori dall'ombra della Terra
   Il passaggio è "visibile" se illuminata && soleAlt < -6 (buio civile). */
function calcolaPassaggiISS(satrec, lat, lon, giorni, sat, astro) {

    const obsGd = {
        longitude: sat.degreesToRadians(lon),
        latitude: sat.degreesToRadians(lat),
        height: 0
    };
    const obs = astro ? new astro.Observer(lat, lon, 0) : null;

    const MIN_EL = 10;
    const passi = [];
    const inizio = Date.now();
    const fine = inizio + giorni * 86400000;
    let attuale = null;

    for (let t = inizio; t <= fine; t += 30000) {

        const d = new Date(t);
        const pv = sat.propagate(satrec, d);

        if (!pv || !pv.position) {
            if (attuale) { attuale.fine = d; passi.push(attuale); attuale = null; }
            continue;
        }

        const gmst = sat.gstime(d);
        const ecf = sat.eciToEcf(pv.position, gmst);
        const look = sat.ecfToLookAngles(obsGd, ecf);
        const el = sat.radiansToDegrees(look.elevation);
        const az = sat.radiansToDegrees(look.azimuth);

        if (el >= MIN_EL) {
            if (!attuale) {
                attuale = { inizio: d, fine: d, maxEl: el, azMax: az,
                            soleAlt: null, illuminata: true };
            } else {
                attuale.fine = d;
            }
            if (el > attuale.maxEl) {
                attuale.maxEl = el;
                attuale.azMax = az;
                if (astro) {
                    attuale.soleAlt = altSole(d, obs, astro);
                    attuale.illuminata = issIlluminata(pv.position, d, astro);
                }
            }
        } else if (attuale) {
            passi.push(attuale);
            attuale = null;
            if (passi.length >= 20) break;
        }
    }

    if (attuale) passi.push(attuale);

    /* solo passaggi visibili: cielo buio e ISS illuminata */
    return passi.filter(p => p.illuminata && (p.soleAlt === null || p.soleAlt < -6));
}

async function aggiornaISS(place) {

    const el = dom("issList");

    try {
        if (typeof satellite === "undefined") {
            el.innerHTML = na("Libreria satelliti non caricata.");
            return;
        }

        const tle = await scaricaTLE();
        const satrec = satellite.twoline2satrec(tle[0], tle[1]);

        const passi = calcolaPassaggiISS(
            satrec,
            parseFloat(place.latitudine),
            parseFloat(place.longitudine),
            5,
            satellite,
            Astronomy
        );

        if (passi.length === 0) {
            el.innerHTML = na(
                "Nessun passaggio visibile nei prossimi 5 giorni " +
                "(di giorno o con la ISS in ombra).");
            return;
        }

        el.innerHTML = passi.slice(0, 6).map(p =>
            '<div class="sky-item"><span><i class="fa-solid fa-satellite"></i> ' +
            fmtDayFull.format(p.inizio) + " · " + orario(p.inizio) + "–" + orario(p.fine) +
            '</span><span class="t">max ' + p.maxEl.toFixed(0) + "° · " +
            direzione(p.azMax) + "</span></div>"
        ).join("");

        dom("issNote").innerHTML =
            "Solo passaggi visibili: elevazione massima sopra 10°, ISS " +
            "illuminata dal Sole e cielo buio (Sole sotto -6°). " +
            "Calcolo locale da TLE: " +
            '<a href="https://celestrak.org" target="_blank">CelesTrak</a>.';

    } catch (err) {
        console.error("OSSERVAZIONE.JS - Errore ISS:", err);
        el.innerHTML = na("Passaggi ISS non disponibili.");
    }
}

/* =====================================================
   AGGIORNAMENTO COMPLESSIVO
===================================================== */

async function update() {

    const placeName = dom("obsPlace").value;
    const dateStr = dom("obsDate").value;

    const place = places.find(p => p.nome === placeName);

    if (!place || !dateStr) return;

    dom("obsCoords").textContent =
        "Lat " + place.latitudine + " · Lon " + place.longitudine;

    /* calcoli astronomici (locali, senza rete) */
    let astro = null;
    try {
        astro = computeAstronomy(place, dateStr);
        renderSky(astro);
    } catch (err) {
        console.error("OSSERVAZIONE.JS - Errore calcoli astronomici:", err);
        dom("skyList").innerHTML = na("Errore nei calcoli astronomici.");
    }

    /* meteo */
    try {
        const meteo = await fetchMeteo(place, dateStr);
        const serata = estraiSerata(meteo, dateStr);
        renderMeteo(serata);
        renderVerdict(astro, serata);
    } catch (err) {
        console.error("OSSERVAZIONE.JS - Errore meteo:", err);
        dom("meteoList").innerHTML = na("Dati meteo non raggiungibili.");
        dom("meteoExtra").innerHTML = "";
        renderVerdict(astro, null);
    }

    /* attività solare (indipendente da data/luogo) */
    try {
        const swpc = await fetchSWPC();
        renderSun(swpc);
    } catch (err) {
        console.error("OSSERVAZIONE.JS - Errore SWPC:", err);
        dom("sunGrid").innerHTML = na("Dati di attività solare non raggiungibili.");
    }

    /* eventi, fasi lunari e passaggi ISS */
    try { await aggiornaEventi(); } catch (err) { console.error(err); }
    try { await aggiornaFasi(); } catch (err) { console.error(err); }
    try { await aggiornaISS(place); } catch (err) { console.error(err); }
}

/* =====================================================
   AVVIO
===================================================== */

document.addEventListener("DOMContentLoaded", async function () {

    /* data di default: oggi (ora italiana) */
    const oggi = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Rome",
        year: "numeric", month: "2-digit", day: "2-digit"
    }).format(new Date());
    dom("obsDate").value = oggi;

    try {
        await loadPlaces();
    } catch (err) {
        console.error("OSSERVAZIONE.JS - Errore caricamento luoghi:", err);
    }

    dom("obsDate").addEventListener("change", update);
    dom("obsPlace").addEventListener("change", update);

    /* chiusura popup attività solare */
    const popup = dom("sunPopup");
    if (popup) {
        dom("sunPopupClose").addEventListener("click", closeSunPopup);
        popup.addEventListener("click", e => {
            if (e.target === popup) closeSunPopup();
        });
        document.addEventListener("keydown", e => {
            if (e.key === "Escape") closeSunPopup();
        });
    }

    update();
});
