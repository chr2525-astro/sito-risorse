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

            resetZoom();

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

        resetZoom();
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


    /* ---------------------------------
       Zoom e pan sull'immagine
    --------------------------------- */

    let zoom = 1;
    let panX = 0;
    let panY = 0;
    let trascina = null;
    let tocco = null;

    function applicaTrasform() {

        /* limita lo spostamento: l'immagine non può uscire dalla vista */
        const maxX = (zoom - 1) * lightboxImg.clientWidth / 2;
        const maxY = (zoom - 1) * lightboxImg.clientHeight / 2;
        panX = Math.min(maxX, Math.max(-maxX, panX));
        panY = Math.min(maxY, Math.max(-maxY, panY));

        lightboxImg.style.transform =
            "translate(" + panX + "px, " + panY + "px) scale(" + zoom + ")";
        lightboxImg.style.cursor =
            zoom > 1 ? "grab" : "";
    }

    function resetZoom() {
        zoom = 1;
        panX = 0;
        panY = 0;
        applicaTrasform();
    }

    function impostaZoom(nuovo) {
        zoom = Math.min(8, Math.max(1, nuovo));
        if (zoom === 1) {
            panX = 0;
            panY = 0;
        }
        applicaTrasform();
    }

    /* rotella del mouse */
    lightbox.addEventListener(
        "wheel",
        function (event) {
            if (!lightbox.classList.contains("active")) return;
            event.preventDefault();
            impostaZoom(zoom * (event.deltaY < 0 ? 1.15 : 1 / 1.15));
        },
        { passive: false }
    );

    /* doppio clic: alterna 1x / 2.5x */
    lightboxImg.addEventListener(
        "dblclick",
        function () {
            impostaZoom(zoom > 1 ? 1 : 2.5);
        }
    );

    /* pan col mouse (solo se ingrandito) */
    lightboxImg.addEventListener(
        "mousedown",
        function (event) {
            if (zoom <= 1) return;
            event.preventDefault();
            trascina = { x: event.clientX, y: event.clientY, px: panX, py: panY };
            lightboxImg.style.cursor = "grabbing";
        }
    );

    window.addEventListener(
        "mousemove",
        function (event) {
            if (!trascina) return;
            panX = trascina.px + (event.clientX - trascina.x);
            panY = trascina.py + (event.clientY - trascina.y);
            applicaTrasform();
        }
    );

    window.addEventListener(
        "mouseup",
        function () {
            if (!trascina) return;
            trascina = null;
            lightboxImg.style.cursor = zoom > 1 ? "grab" : "";
        }
    );

    /* touch: trascinamento con un dito, zoom con due (pinch) */
    function distanzaDita(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.hypot(dx, dy);
    }

    lightboxImg.addEventListener(
        "touchstart",
        function (event) {
            if (event.touches.length === 2) {
                tocco = { pinch: distanzaDita(event.touches) };
            } else if (event.touches.length === 1 && zoom > 1) {
                tocco = {
                    x: event.touches[0].clientX,
                    y: event.touches[0].clientY
                };
            }
        },
        { passive: true }
    );

    lightboxImg.addEventListener(
        "touchmove",
        function (event) {
            if (!tocco) return;
            event.preventDefault();
            if (event.touches.length === 2) {
                const d = distanzaDita(event.touches);
                if (tocco.pinch) impostaZoom(zoom * d / tocco.pinch);
                tocco.pinch = d;
            } else if (event.touches.length === 1 && tocco.x !== undefined) {
                const t = event.touches[0];
                panX += t.clientX - tocco.x;
                panY += t.clientY - tocco.y;
                tocco = { x: t.clientX, y: t.clientY };
                applicaTrasform();
            }
        },
        { passive: false }
    );

    lightboxImg.addEventListener(
        "touchend",
        function () {
            tocco = null;
        }
    );

    /* pulsanti zoom */
    const zoomIn = document.getElementById("zoomIn");
    const zoomOut = document.getElementById("zoomOut");
    const zoomReset = document.getElementById("zoomReset");

    if (zoomIn) zoomIn.addEventListener("click", function () { impostaZoom(zoom * 1.3); });
    if (zoomOut) zoomOut.addEventListener("click", function () { impostaZoom(zoom / 1.3); });
    if (zoomReset) zoomReset.addEventListener("click", resetZoom);
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