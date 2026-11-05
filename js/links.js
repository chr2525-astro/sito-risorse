
/*
=========================================
 links.js
 Caricamento dinamico risorse da JSON
=========================================
*/

async function loadLinks(jsonFile) {

    try {

        const response = await fetch(jsonFile);

        if (!response.ok) {
            throw new Error(
                `Errore caricamento ${jsonFile}`
            );
        }

        const data = await response.json();

        const container =
            document.getElementById("content");

        container.innerHTML = "";

        data.categorie.forEach(categoria => {

            const section =
                document.createElement("section");

            section.classList.add("category");

            section.innerHTML =
                `<h2>${categoria.nome}</h2>`;

            categoria.links.forEach(link => {

                const card =
                    document.createElement("div");

                card.classList.add("link-card");

                const icon =
                    getIcon(link.tipo);

                card.innerHTML =

                `
                <div class="resource-icon">
                    <i class="${icon}"></i>
                </div>

                <div class="resource-content">

                    <h3>
                        ${link.titolo}
                    </h3>

                    <p>
                        ${link.descrizione}
                    </p>

                    <a
                       href="${link.url}"
                       target="_blank"
                       rel="noopener noreferrer"
                       class="resource-button">

                       Apri Risorsa

                    </a>

                </div>
                `;

                section.appendChild(card);

            });

            container.appendChild(section);

        });

    }
    catch(error) {

        console.error(error);

        document.getElementById("content")
            .innerHTML =

            `
            <div class="error-box">

                <h2>
                    Errore
                </h2>

                <p>
                    Impossibile caricare i dati.
                </p>

            </div>
            `;
    }
}

/*
=========================================
 ICONE
=========================================
*/

function getIcon(tipo) {

    const icons = {

        pdf: "fa-solid fa-file-pdf",

        xls: "fa-solid fa-file-excel",

        doc: "fa-solid fa-file-word",

        software: "fa-solid fa-desktop",

        mobile: "fa-solid fa-mobile-screen",

        website: "fa-solid fa-globe",

        youtube: "fa-brands fa-youtube",

        github: "fa-brands fa-github",

        download: "fa-solid fa-download"

    };

    return icons[tipo]
        || "fa-solid fa-link";
}

