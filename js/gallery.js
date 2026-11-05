/* =====================================================
   GALLERY.JS
   Galleria astronomica con paginazione e lightbox
===================================================== */

const IMAGES_PER_PAGE = 12;

let galleryImages = [];
let currentPage = 1;
let currentCategory = "all";      // Categoría selezionata (default: "all")
let allCategories = [];           // Array con tutte le categorie univoche
let categoryFilterInitialized = false;

/* =====================================================
   CARICAMENTO JSON
===================================================== */

async function loadGallery() {

    try {

        const response =
            await fetch("data/gallery.json");

        if (!response.ok) {
            throw new Error(
                "Impossibile caricare gallery.json"
            );
        }

        const data =
            await response.json();

        galleryImages =
            data.images || [];
			
        // NUOVO: Estrai tutte le categorie univoche
        extractCategories();

        // NUOVO: Popola il menu a tendina delle categorie
        populateCategoryFilter();			

        renderGallery();
        renderPagination();

    }
    catch (error) {

        console.error(error);

        document.getElementById("gallery").innerHTML =

            `<p>Errore nel caricamento della galleria.</p>`;
    }
}


function extractCategories() {
    const categories = new Set();
    galleryImages.forEach(image => {
        if (image.category) {
            categories.add(image.category);
        }
    });
    allCategories = Array.from(categories).sort();
}

function populateCategoryFilter() {
    const categoryFilter = document.getElementById("categoryFilter");
    if (!categoryFilter) return;
	
	 // SVUOTA IL SELECT PRIMA DI AGGIUNGERE LE NUOVE OPTION
    categoryFilter.innerHTML = '<option value="all">Tutte le categorie</option>';

    // Aggiungi le opzioni per ogni categoria
    allCategories.forEach(category => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });

    // Aggiungi listener per il cambio di categoria
	    if (!categoryFilterInitialized) {
    categoryFilter.addEventListener("change", function() {
        currentCategory = this.value;
        currentPage = 1; // Resetta alla prima pagina
        renderGallery();
        renderPagination();
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
	        categoryFilterInitialized = true;
    }
}


function getFilteredImages() {
    if (currentCategory === "all") {
        return galleryImages;
    }
    return galleryImages.filter(image => image.category === currentCategory);
}

/* =====================================================
   RENDER GALLERIA
===================================================== */

function renderGallery() {

    const gallery =
        document.getElementById("gallery");

    if (!gallery) return;

    gallery.innerHTML = "";

    // NUOVO: Filtra le immagini in base alla categoria
    const filteredImages = getFilteredImages();

    const start = (currentPage - 1) * IMAGES_PER_PAGE;
    const end = start + IMAGES_PER_PAGE;
    const images = filteredImages.slice(start, end);

    images.forEach(image => {
        const item = document.createElement("div");
        item.className = "gallery-item";
        item.innerHTML = `
            <img
                src="${image.thumb}"
                alt="${image.description}"
                data-full="${image.full}"
                data-description="${image.description}"
                loading="lazy">
            <div class="caption">
                <strong>${image.category || "Senza categoria"}</strong><br>
                ${image.description}
            </div>
        `;
        gallery.appendChild(item);
    });

}

/* =====================================================
   PAGINAZIONE
===================================================== */

function renderPagination() {

    const pagination =
        document.getElementById("pagination");

    if (!pagination) return;

    pagination.innerHTML = "";

    // NUOVO: Usa le immagini filtrate per il calcolo delle pagine
    const filteredImages = getFilteredImages();
    const pages = Math.ceil(filteredImages.length / IMAGES_PER_PAGE);

    if (pages <= 1) return;

    for (let i = 1; i <= pages; i++) {

        const button =
            document.createElement("button");

        button.textContent = i;

        if (i === currentPage) {

            button.classList.add(
                "active-page"
            );

        }

        button.addEventListener(
            "click",
            () => {

                currentPage = i;

                renderGallery();

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });

            }
        );

        pagination.appendChild(button);

    }

}

/* =====================================================
   LIGHTBOX
===================================================== */

function initLightbox() {

    const gallery =
        document.getElementById("gallery");

    const lightbox =
        document.getElementById("lightbox");

    const lightboxImg =
        document.getElementById("lightboxImg");

    const caption =
        document.getElementById("lightboxCaption");

    const closeButton =
        document.getElementById("closeLightbox");

    if (
        !gallery ||
        !lightbox ||
        !lightboxImg ||
        !caption ||
        !closeButton
    ) {
        console.error(
            "Elementi lightbox mancanti."
        );
        return;
    }

    /* ---------------------------------
       Apertura immagine
    --------------------------------- */

    gallery.addEventListener(
        "click",
        function (event) {

            const img =
                event.target.closest("img");

            if (!img) return;

            lightboxImg.src =
                img.dataset.full;

            caption.textContent =
                img.dataset.description;

            lightbox.classList.add(
                "active"
            );

            lightbox.setAttribute(
                "aria-hidden",
                "false"
            );
        }
    );

    /* ---------------------------------
       Chiusura lightbox
    --------------------------------- */

    function closeLightbox() {

        lightbox.classList.remove(
            "active"
        );

        lightbox.setAttribute(
            "aria-hidden",
            "true"
        );

        lightboxImg.src = "";
    }

    /* X */

    closeButton.addEventListener(
        "click",
        closeLightbox
    );

    /* click sullo sfondo */

    lightbox.addEventListener(
        "click",
        function (event) {

            if (event.target === lightbox) {

                closeLightbox();

            }

        }
    );

    /* ESC */

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape" &&
                lightbox.classList.contains(
                    "active"
                )
            ) {

                closeLightbox();

            }

        }
    );

}

/* =====================================================
   AVVIO
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        initLightbox();

        loadGallery();

    }
);