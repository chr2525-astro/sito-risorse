/* =====================================================
   ASTROFILI.JS
   Mappa delle astrofili italiani
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    initMap
);

/* =====================================================
   INIZIALIZZAZIONE MAPPA
===================================================== */

async function initMap() {

    try {

        const map = L.map("map", {
            zoomControl: true
        });

        /* -------------------------------------
           Centro Italia
        ------------------------------------- */

        map.setView(
            [42.5, 12.5],
            6
        );

        /* -------------------------------------
           OpenStreetMap
        ------------------------------------- */

        L.tileLayer(
            "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                maxZoom: 19,
                attribution:
                    "&copy; OpenStreetMap contributors"
            }
        ).addTo(map);

        /* -------------------------------------
           Icona personalizzata
           (opzionale)
        ------------------------------------- */

        const cameraIcon = L.icon({

            iconUrl:
                "img/camera-marker.png",

            iconSize: [32, 32],

            iconAnchor: [16, 32],

            popupAnchor: [0, -28]

        });

        /* -------------------------------------
           Caricamento JSON
        ------------------------------------- */

        const response =
            await fetch(
                "data/astrofili.json"
            );

        if (!response.ok) {

            throw new Error(
                "Errore caricamento astrofili.json"
            );

        }

        const data =
            await response.json();

        if (
            !data.cams ||
            !Array.isArray(data.cams)
        ) {

            throw new Error(
                "Formato JSON non valido"
            );

        }

        /* -------------------------------------
           Bounds automatici
        ------------------------------------- */

        const bounds = [];

        data.cams.forEach(cam => {

            if (
                typeof cam.lat !== "number" ||
                typeof cam.lng !== "number"
            ) {
                return;
            }

            bounds.push([
                cam.lat,
                cam.lng
            ]);

            /* -----------------------------
               Stato
            ----------------------------- */

            const statoBadge =
                cam.stato === "online"
                ? "<span class='status-online'>🟢 Online</span>"
                : "<span class='status-offline'>🔴 Offline</span>";


            /* -----------------------------
               Popup
            ----------------------------- */

            const popupHtml = `

                <div class="cam-popup">

                    <h3>${cam.nome}</h3>

                    <p>

                        <strong>Provincia:</strong>

                        ${cam.indirizzo || " - " || cam.provincia || "-"}

                    </p>


                    <p>

                        <strong>Stato:</strong>

                        ${statoBadge}

                    </p>

                    <p>

                        <a href="${cam.url}"
                           target="_blank"
                           rel="noopener noreferrer">

                            Apri sito

                        </a>

                    </p>

                </div>

            `;

            /* -----------------------------
               Marker
            ----------------------------- */

            const marker = L.marker(
                [cam.lat, cam.lng],
                {
                    icon: cameraIcon
                }
            );

            marker
                .addTo(map)
                .bindPopup(
                    popupHtml,
                    {
                        maxWidth: 320
                    }
                );

        });

        /* -------------------------------------
           Zoom automatico
        ------------------------------------- */

        if (bounds.length > 0) {

            map.fitBounds(
                bounds,
                {
                    padding: [40, 40]
                }
            );

        }

    }
    catch (error) {

        console.error(error);

        document.getElementById("map")
            .innerHTML =

            `
            <div class="error-box">

                Errore nel caricamento
                degli astrofili.

            </div>
            `;
    }
}