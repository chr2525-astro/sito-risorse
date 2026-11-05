const grid = document.querySelector("#resource-grid");
const filters = document.querySelector("#category-filters");
const search = document.querySelector("#search");
const sort = document.querySelector("#sort");
const count = document.querySelector("#results-count");
const emptyState = document.querySelector("#empty-state");
const loadError = document.querySelector("#load-error");

let resources = [];
let activeCategory = "all";

function renderFilters(categories) {
  for (const category of categories) {
    const button = document.createElement("button");
    button.className = "filter-button";
    button.type = "button";
    button.dataset.category = category.id;
    button.textContent = category.label;
    button.setAttribute("aria-pressed", "false");
    filters.append(button);
  }
}

function renderResources() {
  const query = search.value.trim().toLocaleLowerCase("it");
  const visible = resources
    .filter((resource) => activeCategory === "all" || resource.category === activeCategory)
    .filter((resource) => `${resource.title} ${resource.description} ${resource.categoryLabel} ${resource.type}`.toLocaleLowerCase("it").includes(query))
    .sort((first, second) => sort.value === "name"
      ? first.title.localeCompare(second.title, "it")
      : Number(second.featured) - Number(first.featured) || first.title.localeCompare(second.title, "it"));

  grid.replaceChildren(...visible.map(createCard));
  grid.hidden = visible.length === 0;
  emptyState.hidden = visible.length !== 0;
  count.textContent = `${visible.length} ${visible.length === 1 ? "risorsa" : "risorse"}`;
}

function createCard(resource, index) {
  const article = document.createElement("article");
  article.className = "resource-card";
  article.style.animationDelay = `${Math.min(index, 8) * 35}ms`;

  const top = document.createElement("div");
  top.className = "card-top";
  const category = document.createElement("span");
  category.className = "category-label";
  category.textContent = resource.categoryLabel;
  const type = document.createElement("span");
  type.className = "resource-type";
  type.textContent = resource.type;
  top.append(category, type);

  const title = document.createElement("h3");
  title.textContent = resource.title;
  const description = document.createElement("p");
  description.textContent = resource.description;
  const link = document.createElement("a");
  link.className = "card-link";
  link.href = resource.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.setAttribute("aria-label", `Apri ${resource.title} in una nuova scheda`);
  link.append(document.createTextNode("Visita il sito"));
  const arrow = document.createElement("span");
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "↗";
  link.append(arrow);

  article.append(top, title, description, link);
  return article;
}

filters.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-category]");
  if (!button) return;
  activeCategory = button.dataset.category;
  filters.querySelectorAll("button").forEach((item) => {
    const selected = item === button;
    item.classList.toggle("is-active", selected);
    item.setAttribute("aria-pressed", String(selected));
  });
  renderResources();
});

search.addEventListener("input", renderResources);
sort.addEventListener("change", renderResources);
document.querySelector("#reset-filters").addEventListener("click", () => {
  activeCategory = "all";
  search.value = "";
  filters.querySelector('[data-category="all"]').click();
  search.focus();
});
document.querySelector("[data-filter-link]").addEventListener("click", () => {
  filters.querySelector('[data-category="community"]')?.click();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    search.focus();
  }
});

fetch("data/risorse.json")
  .then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
  .then((catalog) => {
    resources = catalog.resources.map((resource) => ({
      ...resource,
      categoryLabel: catalog.categories.find((category) => category.id === resource.category)?.label ?? "Altro",
    }));
    renderFilters(catalog.categories);
    grid.setAttribute("aria-busy", "false");
    renderResources();
  })
  .catch(() => {
    grid.hidden = true;
    grid.setAttribute("aria-busy", "false");
    count.textContent = "Risorse non disponibili";
    loadError.hidden = false;
  });