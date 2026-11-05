/* Carica i luoghi dal JSON */
async function loadPlaces() {

    try {

        const response = await fetch("data/luoghi.json");

        if (!response.ok) {
            throw new Error("Impossibile caricare luoghi.json");
        }

        const data = await response.json();

        places = data.luoghi || [];

        populatePlaceFilter();

    }
    catch (error) {
        console.error(error);
    }
}

/* Popola il select dei luoghi */
function populatePlaceFilter() {

    const placeFilter = document.getElementById("obsPlace");
    if (!placeFilter) return;

    // Svuota e ripristina l'opzione predefinita
    placeFilter.innerHTML = '<option value="">Seleziona un luogo</option>';

    places.forEach(place => {
        const option = document.createElement("option");
        option.value = place.nome;
        option.textContent = `${place.nome} (${place.latitudine}, ${place.longitudine})`;
        placeFilter.appendChild(option);
    });
}