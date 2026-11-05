/* =====================================================
   MISSIONI.JS
   Esplorazione del Sistema Solare
===================================================== */

let missions = [];
let filteredMissions = [];

/* =====================================================
   AVVIO
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    initMissioni
);

async function initMissioni() {

    await loadMissioni();

    populateFilters();

    renderMissioni();

    registerEvents();

}

/* =====================================================
   CARICAMENTO JSON
===================================================== */

async function loadMissioni() {

    try {

        const response =
            await fetch("data/missioni.json");

        if (!response.ok) {

            throw new Error(
                "Errore caricamento missioni.json"
            );

        }

        const data =
            await response.json();

        missions = data.missioni || [];

        filteredMissions = [...missions];

    }

    catch(error){

        console.error(error);

    }

}

/* =====================================================
   FILTRI
===================================================== */

function populateFilters(){

    createSelect(
        "filterAgency",
        [...new Set(
            missions.map(m=>m.agenzia)
        )]
    );

    createSelect(
        "filterDestination",
        [...new Set(
            missions.map(m=>m.destinazione)
        )]
    );

    createSelect(
        "filterCategory",
        [...new Set(
            missions.map(m=>m.categoria)
        )]
    );

}

function createSelect(id,values){

    const select =
        document.getElementById(id);

    if(!select) return;

    values.sort();

    values.forEach(value=>{

        const option =
            document.createElement("option");

        option.value=value;

        option.textContent=value;

        select.appendChild(option);

    });

}

/* =====================================================
   EVENTI
===================================================== */

function registerEvents(){

    document
        .getElementById("searchMission")
        .addEventListener(
            "input",
            applyFilters
        );

    document
        .querySelectorAll(".mission-filter")
        .forEach(control=>{

            control.addEventListener(
                "change",
                applyFilters
            );

        });

}

/* =====================================================
   APPLICA FILTRI
===================================================== */

function applyFilters(){

    const search =
        document
        .getElementById("searchMission")
        .value
        .toLowerCase();

    const agency =
        document
        .getElementById("filterAgency")
        .value;

    const destination =
        document
        .getElementById("filterDestination")
        .value;

    const category =
        document
        .getElementById("filterCategory")
        .value;

    filteredMissions =
        missions.filter(m=>{

            return (

                m.nome.toLowerCase()
                    .includes(search)

                &&

                (agency==="" ||
                 m.agenzia===agency)

                &&

                (destination==="" ||
                 m.destinazione===destination)

                &&

                (category==="" ||
                 m.categoria===category)

            );

        });

    renderMissioni();

}

/* =====================================================
   VISUALIZZAZIONE
===================================================== */

function renderMissioni(){

    const container =
        document.getElementById("missionContainer");

    container.innerHTML="";

    filteredMissions

        .sort((a,b)=>

            a.lancio.localeCompare(b.lancio)

        )

        .forEach(m=>{

            const card =
                document.createElement("article");

            card.className="mission-card";

            card.innerHTML=`

                <img
                    src="${m.immagine}"
                    alt="${m.nome}">

                <div class="mission-body">

                    <h2>${m.nome}</h2>

                    <p>

                        <strong>Agenzia:</strong>

                        ${m.agenzia}

                    </p>

                    <p>

                        <strong>Lancio:</strong>

                        ${formatDate(m.lancio)}

                    </p>
					
                    <p>

                        <strong>Stato:</strong>

                        ${m.stato}

                    </p>					

                    <p>

                        <strong>Destinazione:</strong>

                        ${m.destinazione}

                    </p>

                    <p>

                        <strong>Tipo:</strong>

                        ${m.categoria}

                    </p>

                    <button
                        class="details-button"
                        onclick="showMission('${m.id}')">

                        Dettagli

                    </button>

                </div>

            `;

            container.appendChild(card);

        });

}

/* =====================================================
   DETTAGLI
===================================================== */

function showMission(id){

    const mission =
        missions.find(m=>m.id===id);

    if(!mission) return;

    document
        .getElementById("modalTitle")
        .textContent=
            mission.nome;

    document
        .getElementById("modalBody")
        .innerHTML=`

        <img
            src="${mission.immagine}"
            class="modal-image"
            alt="${mission.nome}">

        <p>

            ${mission.descrizione}

        </p>

        <h3>

            Obiettivi

        </h3>

        <ul>

            ${mission.obiettivi
                .map(o=>`<li>${o}</li>`)
                .join("")}

        </ul>

        <h3>

            Risultati

        </h3>

        <ul>

            ${mission.risultati
                .map(r=>`<li>${r}</li>`)
                .join("")}

        </ul>

        <p>

            <a
                href="${mission.sito}"
                target="_blank">

                Sito ufficiale

            </a>

        </p>

    `;

    document
        .getElementById("missionModal")
        .classList.add("active");

}

/* =====================================================
   CHIUSURA MODALE
===================================================== */

function closeMission(){

    document
        .getElementById("missionModal")
        .classList.remove("active");

}

document.addEventListener(

    "keydown",

    function(event){

        if(event.key==="Escape"){

            closeMission();

        }

    }

);

/* =====================================================
   FORMAT DATA
===================================================== */

function formatDate(date){

    return new Date(date)

        .toLocaleDateString(
            "it-IT"
        );

}