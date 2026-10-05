"use strict";
/* ============================================================================
   Plugin « Explorateur de fichiers ».
   ----------------------------------------------------------------------------
   Deux natures d'onglet :
     · « files »    — le dossier data/ d'un agent : navigation, dépôt de
                      fichiers et de dossiers, sélection, copier/couper/coller,
                      archives, exécution de scripts, corbeille ;
     · « explorer » — ~/.allkin en lecture seule.

   Les routes serveur (/api/agents/:id/data/*, /api/allkin/fs) restent dans le
   cœur : les agents s'en servent aussi. Ouvrir un fichier passe par le plugin
   « Éditeur de texte » quand il est là ; sinon le fichier est téléchargé.
   ========================================================================== */
(() => {
const {
  activeTab,
  api,
  applyScroll,
  bindLongPress,
  closeChatMenu,
  closeTabContextMenu,
  dataFileUrl,
  el,
  estUnDepotDeFichiers,
  estUnScript,
  estUneArchive,
  fichiersDeposes,
  findTab,
  formatDateTime,
  formatRelativeTime,
  formatSize,
  formaterOctets,
  isInTrash,
  joinDataPath,
  openTab,
  persistTabs,
  safeAreaInsets,
  sortedEntries,
  state,
  typeDeFichier,
} = window.Allkin.core;
const ICON_FILE = window.Allkin.core.icons.file;
const ICON_FOLDER = window.Allkin.core.icons.folder;
const core = window.Allkin.core;
// Every text shown goes through the translation layer of the host; the
// dictionaries of the plugin are in locales.js.
const t = window.Allkin.t;
const tn = window.Allkin.tn;
/** The locale dates and numbers are formatted with. */
const locale = () => window.Allkin.i18n.locale;

/* Les fenêtres de l'application (confirmation, saisie) plutôt que celles du
   navigateur, qui bloquent l'onglet et jurent avec le reste ; repli sur les
   natives avec un cœur plus ancien. Tout résultat d'action passe en bulle. */
const confirmer = (options) => (core.confirm ? core.confirm(options) : Promise.resolve(window.confirm(options.text || options.title)));
const demander = (options) => (core.prompt ? core.prompt(options) : Promise.resolve(window.prompt(options.title, options.input?.value ?? "")));
const bulle = (message, kind = "ok") => core.toast?.(message, kind);
const erreur = (message) => bulle(message, "ko");

/* ---- Icônes par type de fichier -------------------------------------------
   Une tuile colorée par famille : un dossier, une image, une archive, un
   script se reconnaissent avant même de lire le nom. Le reste tombe sur le
   document générique. */
const FX = {
  folder: ["#f59e0b", '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M216,74H130.49l-27.9-27.9a13.94,13.94,0,0,0-9.9-4.1H40A14,14,0,0,0,26,56V200.62A13.39,13.39,0,0,0,39.38,214H216.89A13.12,13.12,0,0,0,230,200.89V88A14,14,0,0,0,216,74ZM40,54H92.69a2,2,0,0,1,1.41.59L113.51,74H38V56A2,2,0,0,1,40,54ZM218,200.89a1.11,1.11,0,0,1-1.11,1.11H39.38A1.4,1.4,0,0,1,38,200.62V86H216a2,2,0,0,1,2,2Z"/></g>'],
  trash: ["#94a3b8", '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M216,50H174V40a22,22,0,0,0-22-22H104A22,22,0,0,0,82,40V50H40a6,6,0,0,0,0,12H50V208a14,14,0,0,0,14,14H192a14,14,0,0,0,14-14V62h10a6,6,0,0,0,0-12ZM94,40a10,10,0,0,1,10-10h48a10,10,0,0,1,10,10V50H94ZM194,208a2,2,0,0,1-2,2H64a2,2,0,0,1-2-2V62H194ZM110,104v64a6,6,0,0,1-12,0V104a6,6,0,0,1,12,0Zm48,0v64a6,6,0,0,1-12,0V104a6,6,0,0,1,12,0Z"/></g>'],
  inbox: ["#38bdf8", '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M208,34H48A14,14,0,0,0,34,48V208a14,14,0,0,0,14,14H208a14,14,0,0,0,14-14V48A14,14,0,0,0,208,34ZM48,46H208a2,2,0,0,1,2,2V154H179.31a13.94,13.94,0,0,0-9.9,4.1L150.1,177.41a2,2,0,0,1-1.41.59H107.31a2,2,0,0,1-1.41-.58L86.59,158.1a13.94,13.94,0,0,0-9.9-4.1H46V48A2,2,0,0,1,48,46ZM208,210H48a2,2,0,0,1-2-2V166H76.69a2,2,0,0,1,1.41.58L97.41,185.9a13.94,13.94,0,0,0,9.9,4.1h41.38a13.94,13.94,0,0,0,9.9-4.1l19.31-19.31a2,2,0,0,1,1.41-.59H210v42A2,2,0,0,1,208,210Z"/></g>'],
  parent: ["#94a3b8", '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M164.24,203.76a6,6,0,1,1-8.48,8.48l-80-80a6,6,0,0,1,0-8.48l80-80a6,6,0,0,1,8.48,8.48L88.49,128Z"/></g>'],
  image: ["#ec4899", '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M216,42H40A14,14,0,0,0,26,56V200a14,14,0,0,0,14,14H216a14,14,0,0,0,14-14V56A14,14,0,0,0,216,42ZM40,54H216a2,2,0,0,1,2,2V163.57L188.53,134.1a14,14,0,0,0-19.8,0l-21.42,21.42L101.9,110.1a14,14,0,0,0-19.8,0L38,154.2V56A2,2,0,0,1,40,54ZM38,200V171.17l52.58-52.58a2,2,0,0,1,2.84,0L176.83,202H40A2,2,0,0,1,38,200Zm178,2H193.8l-38-38,21.41-21.42a2,2,0,0,1,2.83,0l38,38V200A2,2,0,0,1,216,202ZM146,100a10,10,0,1,1,10,10A10,10,0,0,1,146,100Z"/></g>'],
  video: ["#a855f7", '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M250.83,74.71a6,6,0,0,0-6.16.3L206,100.79V72a14,14,0,0,0-14-14H32A14,14,0,0,0,18,72V184a14,14,0,0,0,14,14H192a14,14,0,0,0,14-14V155.21L244.67,181a6,6,0,0,0,9.33-5V80A6,6,0,0,0,250.83,74.71ZM194,184a2,2,0,0,1-2,2H32a2,2,0,0,1-2-2V72a2,2,0,0,1,2-2H192a2,2,0,0,1,2,2Zm48-19.21-36-24V115.21l36-24Z"/></g>'],
  audio: ["#a855f7", '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M211.69,19.27a6,6,0,0,0-5.15-1.09l-128,32A6,6,0,0,0,74,56V170.11A34,34,0,1,0,86,196V108.68l116-29v58.43A34,34,0,1,0,214,164V24A6,6,0,0,0,211.69,19.27ZM52,218a22,22,0,1,1,22-22A22,22,0,0,1,52,218ZM86,96.32V60.68l116-29V67.32ZM180,186a22,22,0,1,1,22-22A22,22,0,0,1,180,186Z"/></g>'],
  pdf: ["#ef4444", '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M222,152a6,6,0,0,1-6,6H190v20h18a6,6,0,0,1,0,12H190v18a6,6,0,0,1-12,0V152a6,6,0,0,1,6-6h32A6,6,0,0,1,222,152ZM90,172a26,26,0,0,1-26,26H54v10a6,6,0,0,1-12,0V152a6,6,0,0,1,6-6H64A26,26,0,0,1,90,172Zm-12,0a14,14,0,0,0-14-14H54v28H64A14,14,0,0,0,78,172Zm84,8a34,34,0,0,1-34,34H112a6,6,0,0,1-6-6V152a6,6,0,0,1,6-6h16A34,34,0,0,1,162,180Zm-12,0a22,22,0,0,0-22-22H118v44h10A22,22,0,0,0,150,180ZM42,112V40A14,14,0,0,1,56,26h96a6,6,0,0,1,4.25,1.76l56,56A6,6,0,0,1,214,88v24a6,6,0,0,1-12,0V94H152a6,6,0,0,1-6-6V38H56a2,2,0,0,0-2,2v72a6,6,0,0,1-12,0ZM158,82h35.52L158,46.48Z"/></g>'],
  archive: ["#c084fc", '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M224,50H32A14,14,0,0,0,18,64V88a14,14,0,0,0,14,14h2v90a14,14,0,0,0,14,14H208a14,14,0,0,0,14-14V102h2a14,14,0,0,0,14-14V64A14,14,0,0,0,224,50ZM210,192a2,2,0,0,1-2,2H48a2,2,0,0,1-2-2V102H210ZM226,88a2,2,0,0,1-2,2H32a2,2,0,0,1-2-2V64a2,2,0,0,1,2-2H224a2,2,0,0,1,2,2ZM98,136a6,6,0,0,1,6-6h48a6,6,0,0,1,0,12H104A6,6,0,0,1,98,136Z"/></g>'],
  script: ["#22c55e", '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M116,132.48l-72,64a6,6,0,0,1-8-9L103,128,36,68.49a6,6,0,0,1,8-9l72,64a6,6,0,0,1,0,9ZM216,186H120a6,6,0,0,0,0,12h96a6,6,0,0,0,0-12Z"/></g>'],
  code: ["#0ea5e9", '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M67.84,92.61,25.37,128l42.47,35.39a6,6,0,1,1-7.68,9.22l-48-40a6,6,0,0,1,0-9.22l48-40a6,6,0,0,1,7.68,9.22Zm176,30.78-48-40a6,6,0,1,0-7.68,9.22L230.63,128l-42.47,35.39a6,6,0,1,0,7.68,9.22l48-40a6,6,0,0,0,0-9.22Zm-81.79-89A6,6,0,0,0,154.36,38l-64,176A6,6,0,0,0,94,221.64a6.15,6.15,0,0,0,2,.36,6,6,0,0,0,5.64-3.95l64-176A6,6,0,0,0,162.05,34.36Z"/></g>'],
  data: ["#14b8a6", '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M128,26C75.29,26,34,49.72,34,80v96c0,30.28,41.29,54,94,54s94-23.72,94-54V80C222,49.72,180.71,26,128,26Zm0,12c44.45,0,82,19.23,82,42s-37.55,42-82,42S46,102.77,46,80,83.55,38,128,38Zm82,138c0,22.77-37.55,42-82,42s-82-19.23-82-42V154.79C62,171.16,92.37,182,128,182s66-10.84,82-27.21Zm0-48c0,22.77-37.55,42-82,42s-82-19.23-82-42V106.79C62,123.16,92.37,134,128,134s66-10.84,82-27.21Z"/></g>'],
  text: ["#6366f1", '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M212.24,83.76l-56-56A6,6,0,0,0,152,26H56A14,14,0,0,0,42,40V216a14,14,0,0,0,14,14H200a14,14,0,0,0,14-14V88A6,6,0,0,0,212.24,83.76ZM158,46.48,193.52,82H158ZM200,218H56a2,2,0,0,1-2-2V40a2,2,0,0,1,2-2h90V88a6,6,0,0,0,6,6h50V216A2,2,0,0,1,200,218Zm-34-82a6,6,0,0,1-6,6H96a6,6,0,0,1,0-12h64A6,6,0,0,1,166,136Zm0,32a6,6,0,0,1-6,6H96a6,6,0,0,1,0-12h64A6,6,0,0,1,166,168Z"/></g>'],
  doc: ["#3b82f6", '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M212.24,83.76l-56-56A6,6,0,0,0,152,26H56A14,14,0,0,0,42,40V216a14,14,0,0,0,14,14H200a14,14,0,0,0,14-14V88A6,6,0,0,0,212.24,83.76ZM158,46.48,193.52,82H158ZM200,218H56a2,2,0,0,1-2-2V40a2,2,0,0,1,2-2h90V88a6,6,0,0,0,6,6h50V216A2,2,0,0,1,200,218Z"/></g>'],
};
const FX_BY_EXT = {
  png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image", svg: "image", bmp: "image", heic: "image", avif: "image",
  mp4: "video", mov: "video", webm: "video", mkv: "video", avi: "video",
  mp3: "audio", wav: "audio", ogg: "audio", flac: "audio", m4a: "audio",
  pdf: "pdf",
  zip: "archive", tar: "archive", gz: "archive", tgz: "archive", bz2: "archive", xz: "archive", "7z": "archive", rar: "archive",
  sh: "script", bash: "script", zsh: "script", py: "script", rb: "script", pl: "script",
  js: "code", mjs: "code", cjs: "code", ts: "code", tsx: "code", jsx: "code", html: "code", css: "code", scss: "code", php: "code", go: "code", rs: "code", c: "code", h: "code", cpp: "code", java: "code", kt: "code", swift: "code", sql: "code",
  json: "data", yaml: "data", yml: "data", toml: "data", csv: "data", tsv: "data", xml: "data", ini: "data", env: "data",
  md: "text", markdown: "text", txt: "text", log: "text", rtf: "text",
  doc: "doc", docx: "doc", odt: "doc", xls: "doc", xlsx: "doc", ods: "doc", ppt: "doc", pptx: "doc", odp: "doc",
};

/** Famille d'un élément : dossier (corbeille et Upload à part), ou par extension. */
function familleDe(entry, chemin = "") {
  if (entry.type === "parent") return "parent";
  if (entry.type === "dir") {
    if (!chemin.includes("/") && entry.name === TRASH_DIR_NAME) return "trash";
    if (!chemin.includes("/") && entry.name === "Upload") return "inbox";
    return "folder";
  }
  const ext = entry.name.includes(".") ? entry.name.split(".").pop().toLowerCase() : "";
  return FX_BY_EXT[ext] ?? "doc";
}

/** Pose l'icône (et sa couleur) sur une tuile .data-row-icon / .data-ctx-head-icon. */
function poserIcone(tuile, entry, chemin = "") {
  const [couleur, chemins] = FX[familleDe(entry, chemin)] ?? FX.doc;
  tuile.style.setProperty("--fx-color", couleur);
  tuile.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${chemins}</svg>`;
}

/** « il y a 2 j » plutôt qu'une date, tant que c'est récent. */
function quand(iso) {
  if (!iso) return "";
  const age = Date.now() - new Date(iso).getTime();
  return age < 7 * 86_400_000 ? formatRelativeTime(iso) : formatDateTime(iso);
}

function normaliser(texte) {
  return (texte || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Ouvre un fichier : dans l'éditeur de texte s'il est installé, en
 *  téléchargement sinon. */
function openFileTab(agentId, path, name) {
  const editor = window.Allkin.capability("text-editor");
  if (editor) editor.openFile(agentId, path, name);
  else window.open(dataFileUrl(agentId, path, true), "_blank");
}

// ---- Onglet Fichiers : l'espace data/ de l'agent ----
// Table triable ; clic sur un dossier -> navigation, clic sur un fichier ->
// ouverture dans son propre onglet, bouton dédié -> téléchargement.
// Le dossier courant est mémorisé sur l'onglet : y revenir rouvre le même.

const dataViewState = {
  agent: null,
  path: "",
  entries: [],
  sortKey: null,
  sortDir: 1,
  // Mode sélection (cases à cocher) : survit à la navigation entre dossiers
  // dans le même onglet Fichiers. La sélection elle-même, non — elle reste
  // bornée au dossier affiché, sinon des cases cochées « invisibles » dans un
  // autre dossier deviendraient déroutantes.
  selectMode: false,
  selected: new Set(),
  /** Filtre par nom (barre d'outils), propre au dossier affiché. */
  filter: "",
};

// Nom du dossier corbeille — celui du serveur (agent-data.ts) : supprimer y
// déplace, et n'efface pour de bon qu'une fois dedans. Le libellé des
// confirmations en dépend, il ne doit pas mentir sur ce qui va se passer.
const TRASH_DIR_NAME = "Trash";

/** The id of the shared folder where an agent id is expected (see share.ts on
 *  the server): the same routes, the same view. */
const SHARE_SCOPE = "share";
const isShare = () => dataViewState.agent?.id === SHARE_SCOPE;

function openFilesTabView(tab) {
  const agent =
    tab.agentId === SHARE_SCOPE
      ? { id: SHARE_SCOPE, name: t("plugin.file-explorer.share.name") }
      : state.agents.find((a) => a.id === tab.agentId);
  if (!agent) return;
  dataViewState.agent = agent;
  loadDataPath(tab.path ?? "");
}

function renderDataBreadcrumb() {
  const breadcrumbEl = el("data-breadcrumb");
  breadcrumbEl.innerHTML = "";
  const segments = dataViewState.path ? dataViewState.path.split("/") : [];

  const root = document.createElement("button");
  root.type = "button";
  root.className = "data-crumb";
  root.textContent = dataViewState.agent.name;
  root.addEventListener("click", () => loadDataPath(""));
  breadcrumbEl.appendChild(root);

  let acc = "";
  for (const segment of segments) {
    acc = acc ? `${acc}/${segment}` : segment;
    const sep = document.createElement("span");
    sep.className = "data-crumb-sep";
    sep.textContent = "/";
    breadcrumbEl.appendChild(sep);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "data-crumb";
    btn.textContent = segment;
    const target = acc;
    btn.addEventListener("click", () => loadDataPath(target));
    breadcrumbEl.appendChild(btn);
  }
}

// ---- Column widths ----
// A column is resized by dragging the right edge of its header; a double
// click on that edge gives it back its default width. The widths are kept on
// the device (localStorage), per table. The name takes what is left — until
// it is given a width of its own: the empty last column then absorbs the
// rest. The table never gets narrower than its columns plus a readable name:
// below that, it scrolls sideways instead of crushing the name.
const COLUMNS_KEY = "plugin.file-explorer.columns";
const COLUMN_MIN = 56;
const NAME_MIN = 176;
let columnResizedAt = 0;

function readColumnWidths() {
  try {
    const stored = JSON.parse(localStorage.getItem(COLUMNS_KEY));
    return stored && typeof stored === "object" ? stored : {};
  } catch {
    return {};
  }
}

function bindColumnResize(table, id, defaults) {
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const grips = [...table.querySelectorAll(".data-col-grip")];
  const filler = table.querySelector("th[data-col-filler]");
  const widths = () => readColumnWidths()[id] ?? {};
  const save = (own) => {
    const all = readColumnWidths();
    if (Object.keys(own).length) all[id] = own;
    else delete all[id];
    try {
      localStorage.setItem(COLUMNS_KEY, JSON.stringify(all));
    } catch {
      // Private window, storage refused: the widths last as long as the page.
    }
  };
  const apply = (own) => {
    let total = 0;
    for (const grip of grips) {
      const key = grip.dataset.col;
      const width = Number(own[key]) > 0 ? Number(own[key]) : null;
      grip.parentElement.style.width = width ? `${width}px` : "";
      total += width ?? (defaults[key] ?? 0) * rem;
    }
    const nameSet = Number(own.name) > 0;
    if (filler) filler.style.width = nameSet ? "auto" : "";
    total += nameSet ? 0 : NAME_MIN;
    if (filler) total += (defaults.filler ?? 0) * rem;
    table.style.setProperty("--fx-table-min", `${Math.round(total)}px`);
  };
  let current = widths();
  apply(current);
  for (const grip of grips) {
    const key = grip.dataset.col;
    const th = grip.parentElement;
    grip.addEventListener("click", (e) => e.stopPropagation());
    grip.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      delete current[key];
      apply(current);
      save(current);
    });
    grip.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startWidth = th.getBoundingClientRect().width;
      const min = key === "name" ? NAME_MIN : COLUMN_MIN;
      grip.setPointerCapture(e.pointerId);
      table.classList.add("is-resizing");
      const onMove = (move) => {
        current = { ...current, [key]: Math.max(min, Math.round(startWidth + move.clientX - startX)) };
        apply(current);
      };
      const onUp = () => {
        grip.removeEventListener("pointermove", onMove);
        grip.removeEventListener("pointerup", onUp);
        grip.removeEventListener("pointercancel", onUp);
        table.classList.remove("is-resizing");
        columnResizedAt = Date.now();
        save(current);
      };
      grip.addEventListener("pointermove", onMove);
      grip.addEventListener("pointerup", onUp);
      grip.addEventListener("pointercancel", onUp);
    });
  }
}
bindColumnResize(el("data-table"), "agent", { size: 7, createdAt: 9.5, modifiedAt: 9.5, filler: 7.5 });
bindColumnResize(el("explorer-table"), "allkin", { size: 7, date: 9 });

// Contrôles de tri : en-têtes de colonnes sur grand écran, boutons de la
// barre de tri sur mobile. Même attribut data-sort-key des deux côtés, donc
// un seul sélecteur et une seule implémentation.
for (const control of document.querySelectorAll("#data-view [data-sort-key]")) {
  control.addEventListener("click", () => {
    // The end of a column drag is not a click on its header.
    if (Date.now() - columnResizedAt < 300) return;
    const key = control.dataset.sortKey;
    if (dataViewState.sortKey === key) {
      dataViewState.sortDir *= -1;
    } else {
      dataViewState.sortKey = key;
      dataViewState.sortDir = 1;
    }
    renderDataTable();
  });
}

const SORT_LABELS = {
  name: t("plugin.file-explorer.field.name"),
  size: t("plugin.file-explorer.field.size"),
  createdAt: t("plugin.file-explorer.field.created"),
  modifiedAt: t("plugin.file-explorer.field.modified"),
};

function updateSortIndicators() {
  for (const control of document.querySelectorAll("#data-view [data-sort-key]")) {
    control.classList.remove("sorted-asc", "sorted-desc");
    if (control.dataset.sortKey === dataViewState.sortKey) {
      control.classList.add(dataViewState.sortDir > 0 ? "sorted-asc" : "sorted-desc");
    }
  }
  const label = el("data-sort-label");
  if (label) label.textContent = SORT_LABELS[dataViewState.sortKey] ?? SORT_LABELS.name;
}

/* Le menu de tri (téléphone) : s'ouvre sous son bouton, se referme au choix,
   au clic ailleurs et à Échap. */
function setDataSortMenuOpen(open) {
  el("data-sort-menu")?.classList.toggle("hidden", !open);
  el("data-sort-btn")?.setAttribute("aria-expanded", String(open));
}
el("data-sort-btn")?.addEventListener("click", (e) => {
  e.stopPropagation();
  setDataSortMenuOpen(el("data-sort-menu").classList.contains("hidden"));
});
el("data-sort-menu")?.addEventListener("click", () => setDataSortMenuOpen(false));
document.addEventListener("click", (e) => {
  if (!e.target.closest?.("#data-sort")) setDataSortMenuOpen(false);
});

/* Le filtre : par nom, sans tenir compte des accents ni de la casse. */
function brancherFiltre(inputId, clearId, onChange) {
  const input = el(inputId);
  const clear = el(clearId);
  if (!input) return;
  input.addEventListener("input", () => {
    clear?.classList.toggle("hidden", !input.value);
    onChange(input.value);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && input.value) {
      e.stopPropagation();
      input.value = "";
      clear?.classList.add("hidden");
      onChange("");
    }
  });
  clear?.addEventListener("click", () => {
    input.value = "";
    clear.classList.add("hidden");
    onChange("");
    input.focus();
  });
}
brancherFiltre("data-filter-input", "data-filter-clear", (v) => {
  dataViewState.filter = v;
  renderDataTable();
});

/* La loupe déplie le champ ; le refermer efface le filtre. */
function brancherLoupe(btnId, barId, inputId, clearId, onChange) {
  const btn = el(btnId);
  const bar = el(barId);
  if (!btn || !bar) return;
  btn.addEventListener("click", () => {
    const open = bar.classList.contains("hidden");
    bar.classList.toggle("hidden", !open);
    btn.classList.toggle("active", open);
    btn.setAttribute("aria-expanded", String(open));
    const input = el(inputId);
    if (open) {
      input.focus();
    } else if (input.value) {
      input.value = "";
      el(clearId)?.classList.add("hidden");
      onChange("");
    }
  });
}
brancherLoupe("data-filter-btn", "data-toolbar", "data-filter-input", "data-filter-clear", (v) => {
  dataViewState.filter = v;
  renderDataTable();
});

/** Les éléments à afficher : triés, puis filtrés. */
function entreesVisibles() {
  const q = normaliser(dataViewState.filter.trim());
  const entries = sortedEntries(dataViewState);
  return q ? entries.filter((e) => normaliser(e.name).includes(q)) : entries;
}

function renderDataTable() {
  updateSortIndicators();
  el("data-table").classList.toggle("select-mode", dataViewState.selectMode);
  const bodyEl = el("data-table-body");
  bodyEl.innerHTML = "";
  const agent = dataViewState.agent;
  const entries = entreesVisibles();
  const template = el("data-row-template");

  // Remonter d'un cran, à la place même des dossiers : un geste, pas un
  // bouton à chercher. Sur téléphone, c'est souvent plus près que le chemin.
  if (dataViewState.path) {
    const parent = dataViewState.path.includes("/") ? dataViewState.path.slice(0, dataViewState.path.lastIndexOf("/")) : "";
    const node = template.content.cloneNode(true);
    const row = node.querySelector(".data-row");
    row.classList.add("is-parent");
    poserIcone(row.querySelector(".data-row-icon"), { type: "parent", name: ".." });
    row.querySelector(".data-row-name-text").textContent = t("plugin.file-explorer.parent.name");
    row.querySelector(".data-row-meta").textContent = parent ? parent : t("plugin.file-explorer.parent.root", { name: agent.name });
    row.querySelector(".data-row-size").textContent = "";
    row.querySelector(".data-row-select").innerHTML = "";
    row.querySelector(".data-row-actions").innerHTML = "";
    row.addEventListener("click", () => loadDataPath(parent));
    bodyEl.appendChild(node);
  }

  if (entries.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.className = "data-table-empty";
    const filtre = dataViewState.filter.trim();
    cell.innerHTML = filtre
      ? `<div class="data-empty"><strong>${t("plugin.file-explorer.empty.noMatch", { query: filtre.replace(/</g, "&lt;") })}</strong></div>`
      : `<div class="data-empty">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><g class="ph-light" transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M216,74H130.49l-27.9-27.9a13.94,13.94,0,0,0-9.9-4.1H40A14,14,0,0,0,26,56V200.62A13.39,13.39,0,0,0,39.38,214H216.89A13.12,13.12,0,0,0,230,200.89V88A14,14,0,0,0,216,74ZM40,54H92.69a2,2,0,0,1,1.41.59L113.51,74H38V56A2,2,0,0,1,40,54ZM218,200.89a1.11,1.11,0,0,1-1.11,1.11H39.38A1.4,1.4,0,0,1,38,200.62V86H216a2,2,0,0,1,2,2Z"/></g><g class="ph-duo" transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M128,80H32V56a8,8,0,0,1,8-8H92.69a8,8,0,0,1,5.65,2.34Z" opacity="0.2"/><path d="M216,72H131.31L104,44.69A15.86,15.86,0,0,0,92.69,40H40A16,16,0,0,0,24,56V200.62A15.4,15.4,0,0,0,39.38,216H216.89A15.13,15.13,0,0,0,232,200.89V88A16,16,0,0,0,216,72ZM92.69,56l16,16H40V56ZM216,200H40V88H216Z"/></g></svg>
           <strong>${t("plugin.file-explorer.empty.title")}</strong>
           <span>${t("plugin.file-explorer.empty.hint")}</span>
         </div>`;
    row.appendChild(cell);
    bodyEl.appendChild(row);
    return;
  }

  for (const entry of entries) {
    const node = template.content.cloneNode(true);
    const row = node.querySelector(".data-row");
    const entryPath = joinDataPath(dataViewState.path, entry.name);
    poserIcone(row.querySelector(".data-row-icon"), entry, entryPath);
    row.querySelector(".data-row-name-text").textContent = entry.name;
    row.querySelector(".data-row-name-text").title = entry.name;
    const taille = entry.type === "dir" ? "" : formatSize(entry.size);
    row.querySelector(".data-row-size").textContent = entry.type === "dir" ? "—" : taille;
    // La ligne de détail du téléphone : taille et dernière modification.
    row.querySelector(".data-row-meta").textContent = [entry.type === "dir" ? t("plugin.file-explorer.kind.folder") : taille, quand(entry.modifiedAt)].filter(Boolean).join(" · ");
    const createdCell = row.querySelector(".data-row-created");
    const modifiedCell = row.querySelector(".data-row-modified");
    createdCell.textContent = formatDateTime(entry.createdAt);
    createdCell.title = new Date(entry.createdAt).toLocaleString(locale());
    modifiedCell.textContent = formatDateTime(entry.modifiedAt);
    modifiedCell.title = new Date(entry.modifiedAt).toLocaleString(locale());

    const checkbox = row.querySelector(".data-row-checkbox");
    checkbox.checked = dataViewState.selected.has(entryPath);
    row.classList.toggle("is-selected", checkbox.checked);
    checkbox.addEventListener("click", (e) => e.stopPropagation());
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) dataViewState.selected.add(entryPath);
      else dataViewState.selected.delete(entryPath);
      row.classList.toggle("is-selected", checkbox.checked);
      updateDataMenuActionsState();
    });

    // En mode sélection, un clic sur la ligne coche/décoche plutôt que de
    // naviguer/ouvrir — la case elle-même gère déjà son propre clic ci-dessus.
    const toggleCheckboxInstead = (e) => {
      if (!dataViewState.selectMode || e.target.closest(".data-row-select")) return true;
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event("change"));
      return false;
    };

    const downloadBtn = row.querySelector(".data-row-download");
    if (entry.type === "dir") {
      downloadBtn.classList.add("hidden");
      row.addEventListener("click", (e) => {
        if (e.target.closest(".data-row-actions")) return;
        if (!toggleCheckboxInstead(e)) return;
        loadDataPath(entryPath);
      });
    } else {
      downloadBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        window.open(dataFileUrl(agent.id, entryPath, true), "_blank");
      });
      row.addEventListener("click", (e) => {
        if (e.target.closest(".data-row-actions")) return;
        if (!toggleCheckboxInstead(e)) return;
        openFileTab(agent.id, entryPath, entry.name);
      });
    }

    // Le clic droit est traité par délégation sur `document` (voir plus bas) :
    // la ligne n'a qu'à dire QUI elle est. L'appui long et le bouton ⋯, eux,
    // restent posés ici — le tactile n'a pas de clic droit.
    row.dataset.path = entryPath;
    bindLongPress(row, (touch) => openDataContextMenu(entry, entryPath, touch.clientX, touch.clientY));
    row.querySelector(".data-row-more").addEventListener("click", (e) => {
      e.stopPropagation();
      const r = e.currentTarget.getBoundingClientRect();
      openDataContextMenu(entry, entryPath, r.right, r.bottom + 4, { alignRight: true });
    });

    row.querySelector(".data-row-delete").addEventListener("click", async (e) => {
      e.stopPropagation();
      await supprimerElements([entryPath], entry.name);
    });

    bodyEl.appendChild(node);
  }
}

/** Corbeille ou effacement définitif, après confirmation dans la fenêtre de
 *  l'application. `nom` : pour un élément seul, ce qu'on affiche. */
async function supprimerElements(chemins, nom = null) {
  if (chemins.length === 0) return;
  const definitif = chemins.every((c) => isInTrash(c));
  // One whole sentence per case: a single item is called by its name, several
  // are counted.
  const named = Boolean(nom) && chemins.length === 1;
  const count = chemins.length;
  const ok = await confirmer({
    title: t("common.confirmation"),
    text: definitif
      ? named
        ? t("plugin.file-explorer.delete.confirm.eraseNamed", { name: nom })
        : tn("plugin.file-explorer.delete.confirm.eraseCount", count)
      : named
        ? t("plugin.file-explorer.delete.confirm.binNamed", { name: nom, folder: TRASH_DIR_NAME })
        : tn("plugin.file-explorer.delete.confirm.binCount", count, { folder: TRASH_DIR_NAME }),
    okLabel: definitif ? t("plugin.file-explorer.bin.erase") : t("plugin.file-explorer.bin.move"),
    danger: true,
  });
  if (!ok) return;
  try {
    const { errors } = await api(`/api/agents/${dataViewState.agent.id}/data/delete-many`, {
      method: "POST",
      body: JSON.stringify({ paths: chemins }),
    });
    await loadDataPath(dataViewState.path);
    const rates = Object.keys(errors ?? {});
    if (rates.length) erreur(t("plugin.file-explorer.delete.failed", { names: rates.join(", ") }));
    else if (definitif) bulle(named ? t("plugin.file-explorer.delete.done.erasedNamed", { name: nom }) : tn("plugin.file-explorer.delete.done.erasedCount", count));
    else bulle(named ? t("plugin.file-explorer.delete.done.binnedNamed", { name: nom }) : tn("plugin.file-explorer.delete.done.binnedCount", count));
  } catch (err) {
    erreur(err.message);
  }
}

/* ---------- Dépôt d'un dossier depuis l'explorateur du système ----------

   OUI, C'EST POSSIBLE, ET SANS RIEN INSTALLER. Le navigateur ne rend pas un
   dossier : il rend des « entrées » qu'on parcourt soi-même
   (`webkitGetAsEntry`, disponible dans Chrome, Safari, Firefox et Edge). On
   descend l'arborescence, on en tire une liste plate de fichiers portant chacun
   son chemin d'origine, et le serveur la reconstruit (voir saveDataUpload).

   Deux limites à connaître, et à dire plutôt qu'à cacher :
     · le glisser-déposer ne donne accès qu'à ce qui est déposé, jamais au reste
       du disque — c'est le navigateur qui le garantit, pas nous ;
     · les liens symboliques et les permissions ne survivent pas. Ce qui arrive,
       ce sont des fichiers et des dossiers, rien d'autre.

   Le parcours est fait AVANT le premier envoi. C'est ce qui permet d'annoncer
   « 0 / 243 » dès la première seconde au lieu d'un compteur qui monte sans
   qu'on sache jusqu'où — et de renoncer avant d'avoir écrit quoi que ce soit si
   le dossier se révèle absurde. */

/**
 * Envoie les fichiers un par un, en montrant où l'on en est.
 *
 * Un par un, et en série : un dossier peut contenir des centaines de fichiers,
 * les envoyer ensemble obligerait à tout tenir en mémoire et ferait échouer le
 * lot entier pour un seul fichier fautif. Ici chacun réussit ou échoue seul,
 * la progression est exacte, et une interruption laisse ce qui est déjà passé.
 */
async function deposerFichiers(agentId, destination, fichiers, dossiersVides = []) {
  const node = el("upload-progress-template").content.cloneNode(true);
  // La fenêtre qu'on ouvre, prise dans le fragment avant insertion : chercher
  // dans la page renverrait la première fenêtre venue, pas forcément celle-ci.
  const modal = node.firstElementChild;
  document.body.appendChild(node);
  const total = fichiers.reduce((n, f) => n + f.fichier.size, 0);
  modal.querySelector("#upload-modal-target").textContent =
    `${tn("plugin.file-explorer.upload.files", fichiers.length)} · ${formaterOctets(total)}` +
    (dossiersVides.length ? ` · ${tn("plugin.file-explorer.upload.emptyFolders", dossiersVides.length)}` : "") +
    ` → ${destination ? `data/${destination}` : "data/"}`;

  const barre = modal.querySelector("#upload-progress-fill");
  const compte = modal.querySelector("#upload-progress-count");
  const courant = modal.querySelector("#upload-modal-current");
  const zoneErreurs = modal.querySelector("#upload-errors");

  let envoyes = 0;
  let octets = 0;
  const erreurs = [];

  for (const { chemin, fichier } of fichiers) {
    courant.textContent = chemin;
    compte.textContent = `${envoyes} / ${fichiers.length}`;
    barre.style.width = `${total ? Math.round((octets / total) * 100) : 0}%`;
    try {
      const corps = new FormData();
      corps.append("path", destination ? `${destination}/${chemin}` : chemin);
      corps.append("file", fichier, fichier.name);
      const rep = await fetch(`/api/agents/${agentId}/data/upload`, { method: "POST", body: corps });
      if (!rep.ok) {
        const detail = await rep.json().catch(() => ({}));
        throw new Error(detail.error || `HTTP ${rep.status}`);
      }
    } catch (err) {
      erreurs.push(`${chemin} — ${err.message}`);
    }
    envoyes += 1;
    octets += fichier.size;
  }

  /* Les dossiers vides en dernier : les créer d'abord serait du travail perdu
     si le dépôt échoue, et ils ne conditionnent rien — l'écriture d'un fichier
     crée déjà ses parents. */
  for (const dossier of dossiersVides) {
    courant.textContent = `${dossier}/`;
    try {
      const rep = await fetch(`/api/agents/${agentId}/data/upload-dir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: destination ? `${destination}/${dossier}` : dossier }),
      });
      if (!rep.ok) {
        const detail = await rep.json().catch(() => ({}));
        throw new Error(detail.error || `HTTP ${rep.status}`);
      }
    } catch (err) {
      erreurs.push(`${dossier}/ — ${err.message}`);
    }
  }

  barre.style.width = "100%";
  compte.textContent = `${envoyes} / ${fichiers.length}`;
  // Le titre suit : « Dépôt en cours » sur une fenêtre finie ferait attendre
  // quelque chose qui n'arrivera pas.
  modal.querySelector("#upload-modal-title").textContent = erreurs.length ? t("plugin.file-explorer.upload.title.incomplete") : t("plugin.file-explorer.upload.title.done");
  courant.textContent = erreurs.length
    ? tn("plugin.file-explorer.upload.result", fichiers.length - erreurs.length, { failed: erreurs.length })
    : t("plugin.file-explorer.upload.done");
  if (erreurs.length) {
    modal.querySelector(".update-progress")?.classList.add("is-error");
    zoneErreurs.classList.remove("hidden");
    zoneErreurs.replaceChildren(
      ...erreurs.map((e) => {
        const p = document.createElement("p");
        p.textContent = e;
        return p;
      })
    );
  }
  modal.querySelector("#upload-modal-actions").classList.remove("hidden");
  modal.querySelector(".modal-cancel").addEventListener("click", () => modal.remove());
  // Rien n'a été écrit hors de data/ : on recharge simplement le dossier ouvert.
  await loadDataPath(dataViewState.path);
}

/* ---- Le geste lui-même ----
   `dragenter`/`dragleave` se déclenchent aussi en passant d'un élément à
   l'autre À L'INTÉRIEUR de la vue : un simple booléen ferait clignoter le
   voile. On compte donc les entrées et les sorties. */
let profondeurGlisser = 0;

(() => {
  const vue = el("data-view");
  if (!vue) return;

  vue.addEventListener("dragenter", (e) => {
    if (!estUnDepotDeFichiers(e)) return;
    e.preventDefault();
    profondeurGlisser += 1;
    vue.classList.add("is-dropping");
    el("data-drop-veil-text").textContent = t("plugin.file-explorer.drop.into", { folder: dataViewState.path ? dataViewState.path : "data/" });
  });
  vue.addEventListener("dragover", (e) => {
    if (!estUnDepotDeFichiers(e)) return;
    // Sans ce preventDefault, le navigateur ouvre le fichier à la place.
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  });
  vue.addEventListener("dragleave", () => {
    profondeurGlisser = Math.max(0, profondeurGlisser - 1);
    if (profondeurGlisser === 0) vue.classList.remove("is-dropping");
  });
  vue.addEventListener("drop", async (e) => {
    if (!estUnDepotDeFichiers(e)) return;
    e.preventDefault();
    profondeurGlisser = 0;
    vue.classList.remove("is-dropping");
    const agent = dataViewState.agent;
    if (!agent) return;

    // Le DataTransfer ne survit pas au premier `await` : on relève ce qu'il
    // contient tout de suite, avant tout parcours asynchrone.
    let depot;
    try {
      depot = await fichiersDeposes(e.dataTransfer);
    } catch (err) {
      erreur(t("plugin.file-explorer.drop.readFailed", { message: err.message }));
      return;
    }
    if (depot.fichiers.length === 0 && depot.dossiers.length === 0) {
      erreur(t("plugin.file-explorer.drop.nothing"));
      return;
    }
    await deposerFichiers(agent.id, dataViewState.path, depot.fichiers, depot.dossiers);
  });
})();

/* ---------- Menu contextuel de l'explorateur ----------

   Les gestes d'un explorateur de bureau, parce que c'est ce qu'on essaie
   d'abord. Le menu ne crée aucune capacité nouvelle : tout ce qu'il propose
   existait déjà dans le menu ⋮ ou sur la ligne. Il les met là où la main les
   cherche.

   LE VOLUME, PUISQUE LA QUESTION SE POSE. Trois opérations peuvent porter sur
   des gigaoctets, et chacune a son traitement :

     · TÉLÉCHARGER — le serveur streame déjà l'archive ; c'est le navigateur
       qui la chargeait en mémoire. Un formulaire POST lui rend la main : il
       écrit sur le disque au fil de l'eau, avec sa propre progression, sans
       limite de taille (voir telechargerZip).

     · COPIER — `cpSync` figeait la boucle d'événements, donc le serveur entier
       et tous les agents avec lui. La copie est passée en asynchrone.

     · DÉPLACER, SUPPRIMER — un renommage, y compris vers la corbeille. Le coût
       ne dépend pas de la taille : rien à faire.

   Reste une limite assumée : une copie très longue n'affiche pas de
   progression. Le serveur ne sait pas dire où elle en est sans instrumenter
   `cp`, et l'opération ne bloque plus rien pendant ce temps. */

// `agentId`: the folder the items were taken from — pasting in another one
// (an agent's, the shared folder) copies or moves across.
const dataClipboard = { mode: null, paths: [], agentId: null };
let dataContextTarget = null;

function closeDataContextMenu() {
  el("data-context-menu")?.classList.add("hidden");
  dataContextTarget = null;
}

/** Ce sur quoi le menu agit : la sélection si l'élément visé en fait partie,
 *  l'élément seul sinon. C'est le comportement d'un explorateur — un clic droit
 *  hors sélection travaille sur ce qu'on vient de viser, pas sur ce qui restait
 *  coché ailleurs. */
function ciblesDuMenu() {
  if (!dataContextTarget) return [];
  const { chemin } = dataContextTarget;
  if (chemin === null) return [];
  return dataViewState.selected.has(chemin) ? [...dataViewState.selected] : [chemin];
}

/* Types de fichiers nommés en clair. Volontairement court : les extensions
   qu'on croise vraiment dans data/. Tout le reste retombe sur l'extension en
   capitales — « MD » vaut mieux qu'un « Fichier » qui n'apprend rien, et
   mentir sur un type qu'on ne connaît pas serait pire. */

/**
 * Remplit l'en-tête du menu : de quoi parle-t-on.
 *
 * Un fichier dit tout de lui-même — son type vient de son nom, sa taille est
 * déjà dans la liste. Un DOSSIER, non : sa taille et son contenu demandent un
 * parcours côté serveur. On affiche donc « Calcul… » puis on complète, plutôt
 * que de retarder l'ouverture du menu — un menu contextuel doit paraître
 * instantanément, c'est sa raison d'être.
 *
 * Le jeton `demande` protège du chevauchement : deux clics droits rapprochés
 * lanceraient deux parcours, et le plus lent écraserait le plus récent.
 */
let demandeStat = 0;

function renderDataContextHead(entry, chemin) {
  const tete = el("data-ctx-head");
  const sep = el("data-ctx-head-sep");
  const visible = Boolean(entry && chemin);
  tete.classList.toggle("hidden", !visible);
  sep.classList.toggle("hidden", !visible);
  if (!visible) return;

  const dossier = entry.type === "dir";
  poserIcone(el("data-ctx-head-icon"), entry, chemin);
  el("data-ctx-head-name").textContent = entry.name;
  el("data-ctx-head-name").title = entry.name;
  const meta = el("data-ctx-head-meta");

  if (!dossier) {
    meta.textContent = `${typeDeFichier(entry.name)} · ${formatSize(entry.size)}`;
    return;
  }

  meta.textContent = t("plugin.file-explorer.ctx.computing");
  const jeton = ++demandeStat;
  void api(`/api/agents/${dataViewState.agent.id}/data/stat?path=${encodeURIComponent(chemin)}`)
    .then((s) => {
      if (jeton !== demandeStat) return;
      const elements = s.files + s.dirs;
      meta.textContent = tn(s.partiel ? "plugin.file-explorer.ctx.statPartial" : "plugin.file-explorer.ctx.stat", elements, { size: formatSize(s.bytes) });
    })
    .catch(() => {
      if (jeton === demandeStat) meta.textContent = t("plugin.file-explorer.kind.folder");
    });
}

function openDataContextMenu(entry, chemin, x, y, { alignRight = false } = {}) {
  window.getSelection?.()?.removeAllRanges?.();
  closeTabContextMenu?.();
  dataContextTarget = { entry, chemin };
  renderDataContextHead(entry, chemin);
  const menu = el("data-context-menu");
  const cibles = ciblesDuMenu();
  const plusieurs = cibles.length > 1;
  const surUnElement = chemin !== null;
  const dansCorbeille = surUnElement && isInTrash(chemin);

  // Un clic dans le vide ne vise rien : seules restent les créations et le
  // collage. Les griser plutôt que les cacher garde le menu stable d'un clic à
  // l'autre — un menu dont les entrées se déplacent se manipule mal.
  el("data-ctx-open").disabled = !surUnElement || plusieurs;
  el("data-ctx-select").disabled = !surUnElement;
  el("data-ctx-select").classList.toggle("hidden", dataViewState.selectMode && plusieurs);
  el("data-ctx-download").disabled = !surUnElement;
  el("data-ctx-copy").disabled = !surUnElement;
  el("data-ctx-cut").disabled = !surUnElement || dansCorbeille;
  el("data-ctx-rename").disabled = !surUnElement || plusieurs;
  el("data-ctx-delete").disabled = !surUnElement;
  el("data-ctx-paste").disabled = dataClipboard.paths.length === 0;
  el("data-ctx-archive").disabled = !surUnElement;
  el("data-ctx-archive-label").textContent = plusieurs ? t("plugin.file-explorer.ctx.archiveCount", { count: cibles.length }) : t("plugin.file-explorer.ctx.archive");
  /* « Désarchiver » n'apparaît que sur une archive, et sur une seule : cachée
     plutôt que grisée, parce qu'elle n'a de sens nulle part ailleurs — un menu
     ne doit pas exhiber en permanence ce qui ne servira presque jamais. */
  el("data-ctx-extract").classList.toggle(
    "hidden",
    plusieurs || !surUnElement || entry?.type === "dir" || !estUneArchive(entry?.name ?? "")
  );

  // "Edit the image": on one image, when the image editor is installed.
  const imageEditor = window.Allkin.capability("image-editor");
  el("data-ctx-edit-image").classList.toggle(
    "hidden",
    !imageEditor || plusieurs || !surUnElement || dansCorbeille || entry?.type === "dir" || !imageEditor.canEdit(entry?.name ?? "")
  );

  /* « Exécuter » suit la même règle : sur un script, un seul, et pas dans la
     corbeille — lancer ce qu'on vient de jeter n'est jamais ce qu'on voulait. */
  el("data-ctx-run").classList.toggle(
    "hidden",
    plusieurs || !surUnElement || dansCorbeille || isShare() || entry?.type === "dir" || !estUnScript(entry?.name ?? "")
  );

  el("data-ctx-download-label").textContent = plusieurs ? t("plugin.file-explorer.ctx.downloadCount", { count: cibles.length }) : t("common.download");
  el("data-ctx-delete-label").textContent = dansCorbeille
    ? t("plugin.file-explorer.bin.eraseForGood")
    : plusieurs
      ? t("plugin.file-explorer.bin.moveCount", { count: cibles.length })
      : t("plugin.file-explorer.bin.move");
  // « Vider la corbeille » n'a de sens que dans la corbeille.
  el("data-ctx-empty-trash").classList.toggle("hidden", !isInTrash(dataViewState.path));
  el("data-ctx-paste-label").textContent = dataClipboard.paths.length
    ? t("plugin.file-explorer.ctx.pasteCount", { count: dataClipboard.paths.length })
    : t("plugin.file-explorer.ctx.paste");

  // Même placement que le menu d'un onglet : hors écran d'abord pour connaître
  // sa taille, puis recalé dans les bords sûrs.
  menu.style.left = "0px";
  menu.style.top = "0px";
  menu.classList.remove("hidden");
  const rect = menu.getBoundingClientRect();
  const safe = safeAreaInsets();
  if (alignRight) x -= rect.width;
  const left = Math.min(x, window.innerWidth - rect.width - 8 - safe.right);
  const top = Math.min(y, window.innerHeight - rect.height - 8 - safe.bottom);
  menu.style.left = `${Math.max(8 + safe.left, left)}px`;
  menu.style.top = `${Math.max(8 + safe.top, top)}px`;
}

/* FERMETURE SUR `pointerdown`, ET NON SUR `click`. Deux raisons, mesurées.

   L'ordre des événements d'un clic droit est
   `pointerdown → mousedown → contextmenu → mouseup`, sans aucun `click` sous
   Chromium. Mais Safari sur macOS, lui, émet bien un `click` après un
   ctrl+clic : la fermeture arrivait alors APRÈS l'ouverture, le menu
   apparaissait et disparaissait aussitôt, et il fallait recommencer. C'est le
   « parfois il faut cliquer deux fois ». Sur `pointerdown`, l'ordre est
   toujours « on ferme, puis on ouvre » — quel que soit le navigateur et le
   geste (deux doigts, ctrl+clic, souris).

   Et c'est plus vif : le menu se ferme au moment où l'on appuie, pas quand on
   relâche. */
document.addEventListener("pointerdown", (e) => {
  if (!e.target.closest("#data-context-menu")) closeDataContextMenu();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDataContextMenu();
});

/* UN SEUL ÉCOUTEUR, SUR `document`. Il était posé sur #data-view, en pariant
   que toute la surface de l'explorateur lui appartient. Le pari est fragile :
   il suffit d'une zone que je n'avais pas prévue — un en-tête, une marge, un
   élément ajouté plus tard — pour que le navigateur affiche SON menu à la
   place. Ici, plus aucun pixel n'est oublié.

   Deux exceptions, volontaires : les champs de saisie gardent le menu natif —
   on y a besoin de « Coller » — et les autres menus de l'application gardent
   le leur. */
document.addEventListener("contextmenu", (e) => {
  if (state.view !== "files") return;
  if (e.target.closest("input, textarea, [contenteditable='true']")) return;
  if (e.target.closest("#data-context-menu, #tab-context-menu, .chat-menu, .modal")) return;

  e.preventDefault();
  const ligne = e.target.closest(".data-row");
  // La ligne porte son chemin : plus besoin d'un écouteur par ligne, qui se
  // reposait à chaque rendu du tableau.
  if (ligne?.dataset.path) {
    const entry = dataViewState.entries.find((x) => joinDataPath(dataViewState.path, x.name) === ligne.dataset.path);
    openDataContextMenu(entry ?? null, ligne.dataset.path, e.clientX, e.clientY);
  } else {
    openDataContextMenu(null, null, e.clientX, e.clientY);
  }
});

el("data-ctx-open").addEventListener("click", () => {
  const cible = dataContextTarget;
  closeDataContextMenu();
  if (!cible?.entry) return;
  if (cible.entry.type === "dir") loadDataPath(cible.chemin);
  else openFileTab(dataViewState.agent.id, cible.chemin, cible.entry.name);
});

el("data-ctx-edit-image").addEventListener("click", () => {
  const cible = dataContextTarget;
  closeDataContextMenu();
  const editor = window.Allkin.capability("image-editor");
  if (!cible?.entry || !editor) return;
  editor.openFile(dataViewState.agent.id, cible.chemin, cible.entry.name);
});

/* « Sélectionner » : entre en mode sélection avec cet élément coché. Sur
   téléphone, c'est le chemin le plus court vers une action groupée. */
el("data-ctx-select").addEventListener("click", () => {
  const cible = dataContextTarget;
  closeDataContextMenu();
  if (!cible?.chemin) return;
  if (!dataViewState.selectMode) {
    dataViewState.selectMode = true;
    el("data-select-btn").classList.add("active");
    el("data-select-btn").setAttribute("aria-pressed", "true");
  }
  if (dataViewState.selected.has(cible.chemin)) dataViewState.selected.delete(cible.chemin);
  else dataViewState.selected.add(cible.chemin);
  renderDataTable();
  updateDataMenuActionsState();
});

el("data-ctx-upload").addEventListener("click", () => {
  closeDataContextMenu();
  el("data-upload-input").click();
});

el("data-ctx-download").addEventListener("click", () => {
  const cibles = ciblesDuMenu();
  const entry = dataContextTarget?.entry;
  closeDataContextMenu();
  if (cibles.length === 0) return;
  // Un fichier seul part par son URL : le navigateur le streame, et on évite
  // de zipper ce qui n'a pas besoin de l'être.
  if (cibles.length === 1 && entry?.type !== "dir") {
    window.open(dataFileUrl(dataViewState.agent.id, cibles[0], true), "_blank");
    return;
  }
  telechargerZip(dataViewState.agent.id, cibles);
});

for (const [id, mode] of [["data-ctx-copy", "copy"], ["data-ctx-cut", "move"]]) {
  el(id).addEventListener("click", () => {
    const cibles = ciblesDuMenu();
    closeDataContextMenu();
    if (cibles.length === 0) return;
    dataClipboard.mode = mode;
    dataClipboard.paths = cibles;
    dataClipboard.agentId = dataViewState.agent?.id ?? null;
    bulle(tn(mode === "copy" ? "plugin.file-explorer.clipboard.copied" : "plugin.file-explorer.clipboard.cut", cibles.length));
  });
}

el("data-ctx-paste").addEventListener("click", async () => {
  closeDataContextMenu();
  const agent = dataViewState.agent;
  if (!agent || dataClipboard.paths.length === 0) return;
  const destination = dataViewState.path;
  const fromAgent = dataClipboard.agentId ?? agent.id;
  const sameFolder = fromAgent === agent.id;
  const erreurs = [];
  for (const source of dataClipboard.paths) {
    const nom = source.split("/").pop();
    const cible = destination ? `${destination}/${nom}` : nom;
    if (sameFolder && cible === source) {
      erreurs.push(t("plugin.file-explorer.paste.alreadyHere", { name: nom }));
      continue;
    }
    // Coller un dossier dans lui-même produirait une descente infinie : le
    // système de fichiers ne s'en protège pas, nous si.
    if (sameFolder && (destination === source || destination.startsWith(`${source}/`))) {
      erreurs.push(t("plugin.file-explorer.paste.intoItself", { name: nom }));
      continue;
    }
    try {
      await api(`/api/agents/${agent.id}/data/${dataClipboard.mode}`, {
        method: "POST",
        body: JSON.stringify({ from: source, to: cible, ...(sameFolder ? {} : { fromAgent }) }),
      });
    } catch (err) {
      erreurs.push(`${nom} — ${err.message}`);
    }
  }
  // Un « couper » ne se colle qu'une fois : les sources n'existent plus.
  const colles = dataClipboard.paths.length - erreurs.length;
  if (dataClipboard.mode === "move") dataClipboard.paths = [];
  if (erreurs.length) erreur(erreurs.join(" · "));
  else bulle(tn("plugin.file-explorer.paste.done", colles));
  await loadDataPath(dataViewState.path);
});

el("data-ctx-rename").addEventListener("click", async () => {
  const cible = dataContextTarget;
  closeDataContextMenu();
  if (!cible?.entry) return;
  const nom = (await demander({
    title: t("common.rename"),
    okLabel: t("common.rename"),
    input: { value: cible.entry.name, placeholder: t("plugin.file-explorer.rename.placeholder"), maxLength: 255 },
  }))?.trim();
  if (!nom || nom === cible.entry.name) return;
  if (nom.includes("/")) {
    erreur(t("plugin.file-explorer.name.noSlash"));
    return;
  }
  const parent = cible.chemin.includes("/") ? cible.chemin.slice(0, cible.chemin.lastIndexOf("/")) : "";
  try {
    await api(`/api/agents/${dataViewState.agent.id}/data/move`, {
      method: "POST",
      body: JSON.stringify({ from: cible.chemin, to: parent ? `${parent}/${nom}` : nom }),
    });
    await loadDataPath(dataViewState.path);
    bulle(t("plugin.file-explorer.rename.done", { name: nom }));
  } catch (err) {
    erreur(err.message);
  }
});

el("data-ctx-archive").addEventListener("click", async () => {
  const cibles = ciblesDuMenu();
  closeDataContextMenu();
  if (cibles.length === 0) return;

  const node = el("archive-format-template").content.cloneNode(true);
  // La fenêtre qu'on ouvre, prise dans le fragment avant insertion : chercher
  // dans la page renverrait la première fenêtre venue, pas forcément celle-ci.
  const modal = node.firstElementChild;
  document.body.appendChild(node);
  const fermer = () => modal.remove();
  modal.querySelector(".modal-cancel").addEventListener("click", fermer);
  modal.addEventListener("mousedown", (e) => {
    if (e.target === modal) fermer();
  });
  modal.querySelector("#archive-modal-target").textContent =
    cibles.length === 1 ? cibles[0] : tn("plugin.file-explorer.items", cibles.length);

  // La liste vient du serveur : lui seul sait ce qu'il peut produire.
  let formats = [{ value: "zip", label: "ZIP", description: "" }];
  try {
    formats = (await api("/api/archive-formats")).formats ?? formats;
  } catch {
    // Liste minimale : mieux vaut proposer le zip que rien du tout.
  }
  /* Construit à la main plutôt qu'en réutilisant `.option-row` : cette rangée-là
     est faite pour un libellé à gauche et une commande à droite, et un bouton
     radio n'a ni la largeur ni le poids d'un champ. Le résultat s'empilait. */
  const liste = modal.querySelector("#archive-format-list");
  liste.replaceChildren();
  for (const [i, f] of formats.entries()) {
    const rangee = document.createElement("label");
    rangee.className = "archive-format";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "archiveFormat";
    radio.value = f.value;
    radio.checked = i === 0;
    const texte = document.createElement("span");
    texte.className = "archive-format-text";
    const nom = document.createElement("span");
    nom.className = "archive-format-name";
    nom.textContent = f.label;
    const note = document.createElement("span");
    note.className = "archive-format-note";
    note.textContent = f.description ?? "";
    texte.append(nom, note);
    rangee.append(radio, texte);
    liste.appendChild(rangee);
  }

  modal.querySelector("#archive-modal-go").addEventListener("click", async (e) => {
    const bouton = e.currentTarget;
    const format = modal.querySelector('input[name="archiveFormat"]:checked')?.value ?? "zip";
    bouton.disabled = true;
    bouton.textContent = t("plugin.file-explorer.archive.creating");
    try {
      const { path } = await api(`/api/agents/${dataViewState.agent.id}/data/archive`, {
        method: "POST",
        body: JSON.stringify({ paths: cibles, destination: dataViewState.path, format }),
      });
      fermer();
      await loadDataPath(dataViewState.path);
      bulle(t("plugin.file-explorer.archive.done", { path }));
    } catch (err) {
      const zone = modal.querySelector("#archive-modal-error");
      zone.textContent = err.message;
      zone.classList.remove("hidden");
      bouton.disabled = false;
      bouton.textContent = t("plugin.file-explorer.archive.create");
    }
  });
});

el("data-ctx-extract").addEventListener("click", async () => {
  const cible = dataContextTarget;
  closeDataContextMenu();
  if (!cible?.chemin) return;
  bulle(t("plugin.file-explorer.extract.running", { name: cible.entry?.name ?? cible.chemin }));
  try {
    const r = await api(`/api/agents/${dataViewState.agent.id}/data/extract`, {
      method: "POST",
      body: JSON.stringify({ path: cible.chemin }),
    });
    await loadDataPath(dataViewState.path);
    bulle(tn("plugin.file-explorer.extract.done", r.files, { path: r.path }));
  } catch (err) {
    erreur(err.message);
  }
});

/* ---- Exécuter un script ---------------------------------------------------

   QUI EXÉCUTE : l'utilisateur, avec les droits du serveur Allkin. Ce n'est pas
   une action d'agent et ça ne dépend d'aucun droit d'agent — l'explorateur est
   un gestionnaire de fichiers, et un gestionnaire de fichiers lance ce qu'on
   lui demande de lancer.

   CE QUI TIENT LIEU DE GARDE-FOU : le contenu, montré avant. Répondre oui à
   « rapport.sh » ne veut rien dire ; répondre oui à ce qu'on vient de lire, si.

   POURQUOI PAS LE DOUBLE-CLIC : partout ailleurs il veut dire « ouvrir », et
   on double-clique pour REGARDER. En faire le geste d'exécution met un
   lancement à un clic mal visé. Il ouvre donc le script dans l'éditeur, comme
   pour n'importe quel fichier, et l'exécution reste un geste délibéré. */

el("data-ctx-run").addEventListener("click", () => {
  const cible = dataContextTarget;
  closeDataContextMenu();
  if (!cible?.chemin || !cible.entry) return;
  void ouvrirExecutionScript(dataViewState.agent.id, cible.chemin, cible.entry.name);
});

async function ouvrirExecutionScript(agentId, chemin, nom) {
  const node = el("script-run-template").content.cloneNode(true);
  const modal = node.firstElementChild; // voir openDataNameDialog
  document.body.appendChild(node);
  const q = (id) => modal.querySelector(`#${id}`);

  q("script-run-name").textContent = nom;
  q("script-run-meta").textContent = `data/${chemin}`;
  const dossier = chemin.includes("/") ? `data/${chemin.slice(0, chemin.lastIndexOf("/"))}` : "data/";
  q("script-run-warn").textContent = t("plugin.file-explorer.run.warn", { folder: dossier });

  /** L'exécution en cours, s'il y en a une. Sert à l'arrêt comme au ménage. */
  let controleur = null;
  let runId = null;
  let termine = false;

  const fermer = () => {
    // Couper le flux suffit : le serveur tue le processus quand la connexion
    // tombe (voir la route /data/run). L'appel explicite est la ceinture — le
    // navigateur peut mettre du temps à propager l'abandon.
    if (!termine && runId) {
      void fetch(`/api/agents/${agentId}/data/run/${runId}/stop`, { method: "POST" }).catch(() => {});
    }
    controleur?.abort();
    modal.remove();
    document.removeEventListener("keydown", surEchap);
  };
  const surEchap = (e) => { if (e.key === "Escape") fermer(); };
  document.addEventListener("keydown", surEchap);
  q("script-run-cancel").addEventListener("click", fermer);
  modal.addEventListener("mousedown", (e) => { if (e.target === modal) fermer(); });

  /* ---- Temps 1 : montrer le script ---- */
  const source = q("script-run-source");
  const bouton = q("script-run-go");
  bouton.disabled = true;
  source.textContent = t("plugin.file-explorer.run.reading");
  try {
    const rep = await fetch(dataFileUrl(agentId, chemin));
    if (!rep.ok) throw new Error(`HTTP ${rep.status}`);
    const texte = await rep.text();
    /* Coloré par le même moteur que l'éditeur : un script se lit mieux ainsi,
       et c'est sur cette lecture que repose la décision. La langue se déduit du
       NOM — highlight.js est indexé sur « sh », pas sur « bash », et lui passer
       l'extension brute rendrait du texte nu sans que rien ne le signale. */
    // Le coloriseur de l'éditeur de texte (80 langages) s'il est là, celui
    // du cœur sinon.
    const hl = window.Allkin.capability("code-highlight");
    const langue = hl ? hl.languageForFilename(nom) : window.languageForFilename?.(nom);
    source.innerHTML = langue && langue !== "plaintext" ? (hl ? hl.highlight(texte, langue) : window.highlightCode?.(texte, langue) ?? "") : "";
    if (!source.innerHTML) source.textContent = texte;
    bouton.disabled = false;
  } catch (err) {
    source.textContent = t("plugin.file-explorer.run.readFailed", { message: err.message });
    return;
  }

  /* ---- Temps 2 : lancer et suivre ---- */
  bouton.addEventListener("click", async () => {
    q("script-run-confirm").classList.add("hidden");
    q("script-run-live").classList.remove("hidden");
    bouton.classList.add("hidden");
    q("script-run-stop").classList.remove("hidden");
    q("script-run-cancel").textContent = t("common.close");
    q("script-run-state").textContent = t("plugin.file-explorer.run.state.running");
    q("script-run-state").className = "script-run-state running";

    const console_ = q("script-run-console");
    const debut = Date.now();
    controleur = new AbortController();

    /* Le DOM est borné, comme la sortie l'est côté serveur : un script qui
       écrit des dizaines de milliers de lignes ferait ramer l'onglet bien
       avant d'atteindre le plafond d'octets. On garde la fin, qui est ce
       qu'on regarde. */
    const MAX_MORCEAUX = 2000;
    const ajouter = (flux, texte) => {
      const colle = console_.scrollTop + console_.clientHeight >= console_.scrollHeight - 30;
      const span = document.createElement("span");
      if (flux === "err") span.className = "script-run-err";
      span.textContent = texte;
      console_.appendChild(span);
      while (console_.childNodes.length > MAX_MORCEAUX) console_.removeChild(console_.firstChild);
      // Ne suit que si on était déjà en bas : sinon relire plus haut pendant
      // que ça défile serait impossible.
      if (colle) console_.scrollTop = console_.scrollHeight;
    };

    const finir = (libelle, classe) => {
      termine = true;
      q("script-run-state").textContent = libelle;
      q("script-run-state").className = `script-run-state ${classe}`;
      q("script-run-stop").classList.add("hidden");
      q("script-run-cancel").textContent = t("common.close");
    };

    try {
      const rep = await fetch(`/api/agents/${agentId}/data/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: chemin }),
        signal: controleur.signal,
      });
      if (!rep.ok) {
        const detail = await rep.json().catch(() => ({}));
        throw new Error(detail.error || `HTTP ${rep.status}`);
      }

      /* NDJSON : une ligne par événement. Un morceau reçu peut couper une
         ligne en deux, d'où le tampon — sans lui, un JSON.parse échouerait au
         hasard du découpage réseau. */
      const lecteur = rep.body.getReader();
      const decodeur = new TextDecoder();
      let tampon = "";
      for (;;) {
        const { done, value } = await lecteur.read();
        if (done) break;
        tampon += decodeur.decode(value, { stream: true });
        const lignes = tampon.split("\n");
        tampon = lignes.pop();
        for (const ligne of lignes) {
          if (!ligne) continue;
          let evt;
          try { evt = JSON.parse(ligne); } catch { continue; }
          if (evt.type === "start") {
            runId = evt.runId;
            // Ce qui tourne réellement, une fois le shebang lu côté serveur.
            q("script-run-meta").textContent = t("plugin.file-explorer.run.meta", { command: evt.argv.join(" "), folder: evt.cwd, user: evt.utilisateur });
            q("script-run-meta").title = q("script-run-meta").textContent;
          } else if (evt.type === "out" || evt.type === "err") {
            ajouter(evt.type, evt.texte);
          } else if (evt.type === "end") {
            const secondes = ((evt.dureeMs ?? Date.now() - debut) / 1000).toLocaleString(locale(), {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            });
            if (evt.cause === "arret") finir(t("plugin.file-explorer.run.state.stopped", { seconds: secondes }), "stopped");
            else if (evt.exitCode === 0) finir(t("plugin.file-explorer.run.state.done", { seconds: secondes }), "ok");
            else finir(t("plugin.file-explorer.run.state.code", { code: evt.exitCode ?? "?", seconds: secondes }), "fail");
          }
        }
      }
      // Flux coupé sans « end » : le dire plutôt que de laisser « en cours »
      // éternellement, ce qui ferait croire à un script encore vivant.
      if (!termine) finir(t("plugin.file-explorer.run.state.interrupted"), "fail");
    } catch (err) {
      if (err.name !== "AbortError") {
        ajouter("err", `\n[Allkin] ${err.message}`);
        finir(t("plugin.file-explorer.run.state.failed"), "fail");
      }
    }
  });

  q("script-run-stop").addEventListener("click", async () => {
    q("script-run-stop").disabled = true;
    q("script-run-stop").textContent = t("plugin.file-explorer.run.stopping");
    if (runId) await fetch(`/api/agents/${agentId}/data/run/${runId}/stop`, { method: "POST" }).catch(() => {});
  });
}

el("data-ctx-new-file").addEventListener("click", () => {
  closeDataContextMenu();
  el("file-new-btn").click();
});
el("data-ctx-new-dir").addEventListener("click", () => {
  closeDataContextMenu();
  el("folder-new-btn").click();
});

el("data-ctx-delete").addEventListener("click", async () => {
  const cibles = ciblesDuMenu();
  const entry = dataContextTarget?.entry;
  closeDataContextMenu();
  await supprimerElements(cibles, cibles.length === 1 ? entry?.name : null);
});

async function loadDataPath(path) {
  const agent = dataViewState.agent;
  if (!agent) return;
  el("data-error").classList.add("hidden");
  try {
    const { entries } = await api(`/api/agents/${agent.id}/data?path=${encodeURIComponent(path)}`);
    // Un filtre vaut pour le dossier où on l'a tapé.
    if (path !== dataViewState.path) {
      dataViewState.filter = "";
      const input = el("data-filter-input");
      if (input) input.value = "";
      el("data-filter-clear")?.classList.add("hidden");
    }
    dataViewState.path = path;
    dataViewState.entries = entries;
    // Bornée au dossier affiché — voir le commentaire sur dataViewState.selected.
    dataViewState.selected.clear();
    // Mémorisé sur l'onglet : revenir aux fichiers rouvre le dossier quitté.
    const tab = findTab(agent.id, "files");
    if (tab) {
      tab.path = path;
      persistTabs();
    }
    renderDataBreadcrumb();
    renderDataTable();
    updateDataMenuActionsState();
    applyScroll();
  } catch (err) {
    el("data-error").textContent = err.message;
    el("data-error").classList.remove("hidden");
  }
}

// ---- Menu ⋮ de l'explorateur : sélection et actions en masse ----

// Recalcule l'état (activé/désactivé) des trois actions groupées, à chaque
// changement de sélection et à chaque ouverture du menu sur cette vue.
function updateDataMenuActionsState() {
  const n = dataViewState.selected.size;
  const hasSelection = n > 0;
  el("data-delete-selected-btn").disabled = !hasSelection;
  el("data-move-selected-btn").disabled = !hasSelection;
  el("data-download-selected-btn").disabled = !hasSelection;
  el("data-select-bar").classList.toggle("hidden", !dataViewState.selectMode);
  el("data-select-count").textContent = n === 0 ? t("plugin.file-explorer.select.none") : tn("plugin.file-explorer.select.count", n);
  const visibles = entreesVisibles().length;
  el("data-select-all-btn").textContent = n >= visibles && visibles > 0 ? t("plugin.file-explorer.select.allOff") : t("plugin.file-explorer.select.all");
}

function setSelectMode(on) {
  dataViewState.selectMode = on;
  el("data-select-btn").classList.toggle("active", on);
  el("data-select-btn").setAttribute("aria-pressed", String(on));
  if (!on) dataViewState.selected.clear();
  renderDataTable();
  updateDataMenuActionsState();
}

el("data-select-btn").addEventListener("click", () => setSelectMode(!dataViewState.selectMode));
el("data-select-done-btn").addEventListener("click", () => setSelectMode(false));
el("data-select-all-btn").addEventListener("click", () => {
  const visibles = entreesVisibles().map((e) => joinDataPath(dataViewState.path, e.name));
  const tous = visibles.length > 0 && visibles.every((p) => dataViewState.selected.has(p));
  if (tous) dataViewState.selected.clear();
  else for (const p of visibles) dataViewState.selected.add(p);
  renderDataTable();
  updateDataMenuActionsState();
});

el("data-ctx-empty-trash").addEventListener("click", async () => {
  closeDataContextMenu();
  const ok = await confirmer({
    title: t("plugin.file-explorer.bin.empty"),
    text: t("plugin.file-explorer.bin.empty.text"),
    okLabel: t("plugin.file-explorer.bin.empty.ok"),
    danger: true,
  });
  if (!ok) return;
  try {
    await api(`/api/agents/${dataViewState.agent.id}/data/trash/empty`, { method: "POST" });
    await loadDataPath(dataViewState.path);
    bulle(t("plugin.file-explorer.bin.emptied"));
  } catch (err) {
    erreur(err.message);
  }
});

/* Déposer des fichiers sans glisser : le sélecteur du système, depuis le
   menu ⋮ ou le menu contextuel. Sur téléphone, c'est la seule façon. */
el("data-upload-btn").addEventListener("click", () => el("data-upload-input").click());
el("data-upload-input").addEventListener("change", async (e) => {
  const fichiers = [...e.target.files].map((fichier) => ({ chemin: fichier.name, fichier }));
  e.target.value = "";
  if (!fichiers.length || !dataViewState.agent) return;
  await deposerFichiers(dataViewState.agent.id, dataViewState.path, fichiers);
});

el("file-new-btn").addEventListener("click", () => {
  openDataNameDialog({
    title: t("plugin.file-explorer.new.file"),
    label: t("plugin.file-explorer.new.file.label"),
    placeholder: "notes.md",
    submitLabel: t("common.create"),
    onSubmit: async (name) => {
      const fileName = /\.[a-z0-9]+$/i.test(name) ? name : `${name}.md`;
      const path = joinDataPath(dataViewState.path, fileName);
      await api(`/api/agents/${dataViewState.agent.id}/data/file?path=${encodeURIComponent(path)}`, {
        method: "PUT",
        body: JSON.stringify({ content: "" }),
      });
      await loadDataPath(dataViewState.path);
      bulle(t("plugin.file-explorer.new.file.done", { name: fileName }));
      openFileTab(dataViewState.agent.id, path, fileName);
    },
  });
});

el("folder-new-btn").addEventListener("click", () => {
  openDataNameDialog({
    title: t("plugin.file-explorer.new.folder"),
    label: t("plugin.file-explorer.new.folder.label"),
    placeholder: "notes",
    submitLabel: t("common.create"),
    onSubmit: async (name) => {
      const path = joinDataPath(dataViewState.path, name);
      await api(`/api/agents/${dataViewState.agent.id}/data/mkdir`, {
        method: "POST",
        body: JSON.stringify({ path }),
      });
      await loadDataPath(dataViewState.path);
      bulle(t("plugin.file-explorer.new.folder.done", { name }));
    },
  });
});

/**
 * Boîte de dialogue générique à un champ texte — nom de fichier ou de
 * dossier. `onSubmit(name)` peut lever une erreur (message affiché dans la
 * modale) ; sinon la modale se referme.
 */
function openDataNameDialog({ title, label, placeholder, submitLabel, onSubmit }) {
  const template = el("data-name-dialog-template");
  const node = template.content.cloneNode(true);
  // La fenêtre qu'on ouvre, prise dans le fragment avant insertion : chercher
  // dans la page renverrait la première fenêtre venue, pas forcément celle-ci.
  const modalEl = node.firstElementChild;
  document.body.appendChild(node);
  const form = modalEl.querySelector("form");
  const input = modalEl.querySelector("#data-name-dialog-input");
  const errorEl = modalEl.querySelector("#data-name-dialog-error");

  modalEl.querySelector("#data-name-dialog-title").textContent = title;
  modalEl.querySelector("#data-name-dialog-label").textContent = label;
  input.placeholder = placeholder;
  modalEl.querySelector("#data-name-dialog-submit").textContent = submitLabel;
  const fermer = () => {
    document.removeEventListener("keydown", surEchap);
    modalEl.remove();
  };
  const surEchap = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      fermer();
    }
  };
  document.addEventListener("keydown", surEchap);
  modalEl.querySelector(".modal-cancel").addEventListener("click", fermer);
  modalEl.addEventListener("mousedown", (e) => {
    if (e.target === modalEl) fermer();
  });
  setTimeout(() => input.focus(), 0);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = input.value.trim();
    errorEl.classList.add("hidden");
    if (!name) return;
    if (name.includes("/")) {
      errorEl.textContent = t("plugin.file-explorer.name.noSlash");
      errorEl.classList.remove("hidden");
      return;
    }
    try {
      await onSubmit(name);
      fermer();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove("hidden");
    }
  });
}

el("data-delete-selected-btn").addEventListener("click", async () => {
  await supprimerElements([...dataViewState.selected]);
});

el("data-download-selected-btn").addEventListener("click", async () => {
  const agent = dataViewState.agent;
  const paths = [...dataViewState.selected];
  if (paths.length === 0) return;
  if (paths.length === 1) {
    window.open(dataFileUrl(agent.id, paths[0], true), "_blank");
    return;
  }
  telechargerZip(agent.id, paths);
});

/**
 * Télécharge plusieurs éléments en une archive.
 *
 * Par un FORMULAIRE, et non par fetch : `await res.blob()` chargeait l'archive
 * entière dans la mémoire de l'onglet avant de l'enregistrer. Sur un dossier de
 * quelques gigaoctets, l'onglet mourait — et le serveur, lui, streamait
 * pourtant déjà correctement (voir la route /data/zip, qui pipe l'archive dans
 * la réponse). Tout le gâchis était côté navigateur.
 *
 * Un formulaire POST rend la main au navigateur : il écrit le flux sur le
 * disque au fur et à mesure, affiche sa propre progression, et ne garde rien en
 * mémoire. Aucune limite de taille, et rien à écrire pour l'obtenir.
 */
function telechargerZip(agentId, paths) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = `/api/agents/${encodeURIComponent(agentId)}/data/zip`;
  // Le navigateur ne poste pas de JSON : la route accepte donc aussi
  // l'encodage de formulaire, un champ `paths` par élément.
  form.enctype = "application/x-www-form-urlencoded";
  form.style.display = "none";
  for (const p of paths) {
    const champ = document.createElement("input");
    champ.type = "hidden";
    champ.name = "paths";
    champ.value = p;
    form.appendChild(champ);
  }

  /* Cible : une iframe cachée, et non « _blank ».

     Avec _blank, un dépôt qui échoue ouvre un onglet blanc portant le JSON
     d'erreur — l'utilisateur voit surgir puis disparaître une fenêtre sans
     savoir ce qui s'est passé. Dans une iframe, la réponse d'erreur reste
     invisible, et le téléchargement, lui, se déclenche pareil : c'est
     l'en-tête Content-Disposition qui le décide, pas la cible.

     L'iframe et le formulaire sont retirés APRÈS un tour de boucle. Les
     retirer dans la foulée du submit() interrompt l'envoi dans certains
     navigateurs — la requête n'a pas encore quitté le document. */
  const cadre = document.createElement("iframe");
  cadre.name = `dl-${Date.now().toString(36)}`;
  cadre.style.display = "none";
  document.body.appendChild(cadre);
  form.target = cadre.name;

  document.body.appendChild(form);
  form.submit();
  setTimeout(() => {
    form.remove();
    // L'iframe survit plus longtemps : elle porte le flux jusqu'au bout.
    setTimeout(() => cadre.remove(), 60_000);
  }, 0);
}

el("data-move-selected-btn").addEventListener("click", () => {
  if (dataViewState.selected.size > 0) openDataMoveDialog();
});

/**
 * Sélecteur de dossier de destination pour Copier/Déplacer — navigation
 * indépendante de l'explorateur principal (son propre `pickerPath`), mais
 * réutilise la même route de listing, filtrée sur les dossiers.
 */
function openDataMoveDialog() {
  const agent = dataViewState.agent;
  const sourcePaths = [...dataViewState.selected];
  let pickerPath = dataViewState.path;

  const template = el("data-move-dialog-template");
  const node = template.content.cloneNode(true);
  // La fenêtre qu'on ouvre, prise dans le fragment avant insertion : chercher
  // dans la page renverrait la première fenêtre venue, pas forcément celle-ci.
  const modalEl = node.firstElementChild;
  document.body.appendChild(node);
  const breadcrumbEl = modalEl.querySelector("#data-move-breadcrumb");
  const listEl = modalEl.querySelector("#data-move-list");
  const errorEl = modalEl.querySelector("#data-move-error");
  modalEl.querySelector("#data-move-source-label").textContent =
    sourcePaths.length === 1
      ? t("plugin.file-explorer.move.sourceNamed", { name: sourcePaths[0] })
      : tn("plugin.file-explorer.move.sourceCount", sourcePaths.length);
  modalEl.querySelector(".modal-cancel").addEventListener("click", () => modalEl.remove());

  async function renderPicker() {
    errorEl.classList.add("hidden");
    breadcrumbEl.innerHTML = "";
    const segments = pickerPath ? pickerPath.split("/") : [];
    const rootBtn = document.createElement("button");
    rootBtn.type = "button";
    rootBtn.className = "data-crumb";
    rootBtn.textContent = agent.name;
    rootBtn.addEventListener("click", () => {
      pickerPath = "";
      renderPicker();
    });
    breadcrumbEl.appendChild(rootBtn);
    let acc = "";
    for (const segment of segments) {
      acc = joinDataPath(acc, segment);
      const target = acc;
      const sep = document.createElement("span");
      sep.className = "data-crumb-sep";
      sep.textContent = "/";
      breadcrumbEl.appendChild(sep);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "data-crumb";
      btn.textContent = segment;
      btn.addEventListener("click", () => {
        pickerPath = target;
        renderPicker();
      });
      breadcrumbEl.appendChild(btn);
    }

    listEl.innerHTML = "";
    try {
      const { entries } = await api(`/api/agents/${agent.id}/data?path=${encodeURIComponent(pickerPath)}`);
      const dirs = entries.filter((e) => e.type === "dir");
      if (dirs.length === 0) {
        const empty = document.createElement("p");
        empty.className = "dim";
        empty.textContent = t("plugin.file-explorer.move.noSubfolder");
        listEl.appendChild(empty);
      }
      for (const dir of dirs) {
        const row = document.createElement("button");
        row.type = "button";
        row.className = "data-move-dir-row";
        row.innerHTML = ICON_FOLDER;
        const libelle = document.createElement("span");
        libelle.textContent = dir.name;
        row.appendChild(libelle);
        row.addEventListener("click", () => {
          pickerPath = joinDataPath(pickerPath, dir.name);
          renderPicker();
        });
        listEl.appendChild(row);
      }
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove("hidden");
    }
  }

  async function runOnSelection(apiPath) {
    errorEl.classList.add("hidden");
    try {
      await Promise.all(
        sourcePaths.map((from) =>
          api(`/api/agents/${agent.id}/data/${apiPath}`, {
            method: "POST",
            body: JSON.stringify({ from, to: joinDataPath(pickerPath, from.split("/").pop()) }),
          })
        )
      );
      modalEl.remove();
      dataViewState.selected.clear();
      await loadDataPath(dataViewState.path);
      bulle(tn(apiPath === "copy" ? "plugin.file-explorer.move.copied" : "plugin.file-explorer.move.moved", sourcePaths.length));
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove("hidden");
    }
  }

  modalEl.querySelector("#data-move-copy-btn").addEventListener("click", () => runOnSelection("copy"));
  modalEl.querySelector("#data-move-move-btn").addEventListener("click", () => runOnSelection("move"));

  renderPicker();
}


/* ---- Explorateur de ~/.allkin ---------------------------------------------
   Une fenêtre sur le dossier d'installation, en lecture seule : on regarde ce
   qu'Allkin a écrit sur le disque (agents, sessions, sauvegardes, données),
   on ne le modifie pas d'ici. Les fichiers d'un agent se modifient dans son
   onglet Fichiers, la configuration dans Paramètres — c'est là que se trouvent
   les garde-fous. Voir server/allkin-fs.ts côté serveur.

   Le chemin courant vit sur l'onglet (tab.path) et non dans une variable
   globale : il est ainsi conservé au rechargement de la page, comme celui de
   l'explorateur d'un agent. */

function openExplorerView() {
  openTab(null, "explorer");
}

function explorerTab() {
  const tab = activeTab();
  return tab?.kind === "explorer" ? tab : null;
}

let explorerEntries = { path: "", entries: [], filter: "" };

async function loadExplorerPath(path) {
  const tab = explorerTab();
  if (tab) tab.path = path;
  const errorEl = el("explorer-error");
  errorEl.classList.add("hidden");
  renderExplorerBreadcrumb(path);
  try {
    const { entries } = await api(`/api/allkin/fs?path=${encodeURIComponent(path)}`);
    if (path !== explorerEntries.path) {
      explorerEntries.filter = "";
      const input = el("explorer-filter-input");
      if (input) input.value = "";
      el("explorer-filter-clear")?.classList.add("hidden");
    }
    explorerEntries = { ...explorerEntries, path, entries };
    renderExplorerEntries();
    persistTabs();
    applyScroll();
  } catch (err) {
    el("explorer-body").innerHTML = "";
    errorEl.textContent = err.message;
    errorEl.classList.remove("hidden");
  }
}

brancherFiltre("explorer-filter-input", "explorer-filter-clear", (v) => {
  explorerEntries.filter = v;
  renderExplorerEntries();
});
brancherLoupe("explorer-filter-btn", "explorer-toolbar", "explorer-filter-input", "explorer-filter-clear", (v) => {
  explorerEntries.filter = v;
  renderExplorerEntries();
});

function renderExplorerBreadcrumb(path) {
  const bar = el("explorer-breadcrumb");
  bar.innerHTML = "";
  const crumb = (label, target) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "data-crumb";
    btn.textContent = label;
    btn.addEventListener("click", () => loadExplorerPath(target));
    bar.appendChild(btn);
  };
  crumb("~/.allkin", "");
  let acc = "";
  for (const segment of path ? path.split("/") : []) {
    acc = acc ? `${acc}/${segment}` : segment;
    const sep = document.createElement("span");
    sep.className = "data-crumb-sep";
    sep.textContent = "/";
    bar.appendChild(sep);
    crumb(segment, acc);
  }
}

function renderExplorerEntries() {
  const { path } = explorerEntries;
  const body = el("explorer-body");
  body.innerHTML = "";

  if (path) {
    const parent = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
    body.appendChild(explorerRow({ name: t("plugin.file-explorer.parent.name"), type: "parent", meta: parent || "~/.allkin" }, () => loadExplorerPath(parent)));
  }

  const q = normaliser(explorerEntries.filter.trim());
  const entries = q ? explorerEntries.entries.filter((e) => normaliser(e.name).includes(q)) : explorerEntries.entries;
  if (entries.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.className = "data-table-empty dim";
    cell.textContent = q ? t("plugin.file-explorer.explorer.noMatch", { query: explorerEntries.filter.trim() }) : t("plugin.file-explorer.explorer.empty");
    row.appendChild(cell);
    body.appendChild(row);
    return;
  }

  for (const entry of entries) {
    const target = path ? `${path}/${entry.name}` : entry.name;
    body.appendChild(
      explorerRow(entry, () => {
        if (entry.type === "dir") loadExplorerPath(target);
        // A file opens in the viewer: a tab of Allkin, read-only.
        else openViewer(target, entry.name, entry.size);
      }),
    );
  }
}

/* ---- The menu of a row of ~/.allkin: read-only ---- */

let explorerMenuTarget = null;

function closeExplorerMenu() {
  el("explorer-context-menu")?.classList.add("hidden");
  explorerMenuTarget = null;
}

function openExplorerMenu(row, x, y) {
  const { entry, onOpen } = row._explorer;
  const path = explorerEntries.path ? `${explorerEntries.path}/${entry.name}` : entry.name;
  explorerMenuTarget = { entry, onOpen, path };
  el("explorer-ctx-download").classList.toggle("hidden", entry.type !== "file");
  const menu = el("explorer-context-menu");
  menu.style.left = "0px";
  menu.style.top = "0px";
  menu.classList.remove("hidden");
  const rect = menu.getBoundingClientRect();
  const safe = safeAreaInsets();
  menu.style.left = `${Math.max(8 + safe.left, Math.min(x, window.innerWidth - rect.width - 8 - safe.right))}px`;
  menu.style.top = `${Math.max(8 + safe.top, Math.min(y, window.innerHeight - rect.height - 8 - safe.bottom))}px`;
}

document.addEventListener("contextmenu", (e) => {
  if (state.view !== "explorer") return;
  const row = e.target.closest("#explorer-view .explorer-row");
  if (!row?._explorer || row._explorer.entry.type === "parent") return;
  e.preventDefault();
  openExplorerMenu(row, e.clientX, e.clientY);
});
document.addEventListener("pointerdown", (e) => {
  if (!e.target.closest("#explorer-context-menu")) closeExplorerMenu();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeExplorerMenu();
});
el("explorer-ctx-open").addEventListener("click", () => {
  const target = explorerMenuTarget;
  closeExplorerMenu();
  target?.onOpen();
});
el("explorer-ctx-download").addEventListener("click", () => {
  const target = explorerMenuTarget;
  closeExplorerMenu();
  if (target) window.open(`/api/allkin/fs/file?path=${encodeURIComponent(target.path)}&download=1`, "_blank");
});
el("explorer-ctx-copy-path").addEventListener("click", async () => {
  const target = explorerMenuTarget;
  closeExplorerMenu();
  if (!target) return;
  try {
    await navigator.clipboard.writeText(`~/.allkin/${target.path}`);
    bulle(t("plugin.file-explorer.ctx.pathCopied"));
  } catch {
    erreur(t("plugin.file-explorer.ctx.copyFailed"));
  }
});

/** Même dessin que les lignes de l'onglet Fichiers : tuile, nom, détail. */
function explorerRow(entry, onOpen) {
  const row = document.createElement("tr");
  row.className = "data-row explorer-row";
  if (entry.type === "parent") row.classList.add("is-parent");

  const nameCell = document.createElement("td");
  nameCell.className = "data-row-name";
  const icon = document.createElement("span");
  icon.className = "data-row-icon";
  poserIcone(icon, entry, "x/x");
  const text = document.createElement("span");
  text.className = "data-row-text";
  const label = document.createElement("span");
  label.className = "data-row-name-text";
  label.textContent = entry.name;
  label.title = entry.name;
  const meta = document.createElement("span");
  meta.className = "data-row-meta";
  meta.textContent =
    entry.type === "parent" ? entry.meta : [entry.type === "dir" ? t("plugin.file-explorer.kind.folder") : formatSize(entry.size), quand(entry.modifiedAt)].filter(Boolean).join(" · ");
  text.append(label, meta);
  nameCell.append(icon, text);

  const sizeCell = document.createElement("td");
  sizeCell.className = "explorer-col-size";
  sizeCell.textContent = entry.type === "dir" || entry.type === "parent" ? (entry.type === "dir" ? "—" : "") : formatSize(entry.size);

  const dateCell = document.createElement("td");
  dateCell.className = "explorer-col-date";
  if (entry.modifiedAt) {
    dateCell.textContent = formatRelativeTime(entry.modifiedAt);
    dateCell.title = new Date(entry.modifiedAt).toLocaleString(locale());
  }

  row.append(nameCell, sizeCell, dateCell);
  row._explorer = { entry, onOpen };
  row.addEventListener("click", onOpen);
  row.addEventListener("keydown", (e) => {
    if (e.key === "Enter") onOpen();
  });
  row.tabIndex = 0;
  return row;
}

window.Allkin.registerTabKind("files", {
  panels: ["data-view"],
  icon: ICON_FOLDER,
  // L'onglet porte le nom de l'agent : avoir les fichiers de plusieurs agents
  // ouverts reste lisible, l'icône dit la nature de l'onglet.
  label: (tab) => (tab.agentId === SHARE_SCOPE ? t("plugin.file-explorer.share.name") : window.Allkin.core.agentName(tab.agentId)),
  meta: t("chat.strip.files"),
  tooltip: (tab, label) => t("plugin.file-explorer.tab.files.tooltip", { name: label }),
  scroller: () => document.querySelector("#data-view .data-table-wrap"),
  activate: (tab) => openFilesTabView(tab),
});


/* ---- Viewer: a read-only file in a tab of its own ---------------------------
   The explorer of ~/.allkin opens a file here rather than in a browser tab:
   the same place as everything else, a blue ground that says "you only look".
   Text shows raw, without colouring or layout; an image and a PDF show as
   the browser renders them; an archive shows its entries, read from the
   server without extracting anything; anything else offers the download. */

const VIEWER_TEXT_EXT = new Set(["txt", "md", "markdown", "json", "jsonl", "js", "mjs", "cjs", "ts", "css", "html", "htm", "xml", "svg", "yml", "yaml", "toml", "ini", "cfg", "conf", "env", "sh", "bash", "zsh", "py", "rb", "php", "go", "rs", "java", "c", "h", "cpp", "hpp", "cs", "sql", "csv", "tsv", "log", "lock", "gitignore", "service"]);
const VIEWER_IMAGE_EXT = new Set(["png", "jpg", "jpeg", "gif", "webp", "avif", "bmp", "ico"]);
const VIEWER_ARCHIVE_EXT = new Set(["zip", "allkin", "jar", "tar", "tgz", "tbz2", "txz", "gz", "bz2", "xz"]);
/** Past this, a text is downloaded rather than read in the page. */
const VIEWER_TEXT_MAX = 2 * 1024 * 1024;

function viewerKind(name) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".tar.gz") || lower.endsWith(".tar.bz2") || lower.endsWith(".tar.xz")) return "archive";
  const ext = lower.includes(".") ? lower.slice(lower.lastIndexOf(".") + 1) : "";
  if (VIEWER_ARCHIVE_EXT.has(ext)) return "archive";
  if (VIEWER_IMAGE_EXT.has(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (VIEWER_TEXT_EXT.has(ext) || !lower.includes(".")) return "text";
  return "none";
}

function openViewer(path, name, size) {
  openTab(null, "viewer", { path, name: name || path.split("/").pop(), meta: { size } });
}

async function activateViewer(tab) {
  const name = tab.name || tab.path.split("/").pop();
  const fileUrl = `/api/allkin/fs/file?path=${encodeURIComponent(tab.path)}`;
  const body = el("viewer-body");
  el("viewer-name").textContent = name;
  el("viewer-name").title = tab.path;
  el("viewer-download").href = `${fileUrl}&download=1`;
  poserIcone(el("viewer-icon"), { name, type: "file" }, "x/x");
  const size = tab.meta?.size;
  const kind = viewerKind(name);
  el("viewer-meta").textContent = [size != null ? formatSize(size) : "", tab.path].filter(Boolean).join(" · ");
  body.replaceChildren();
  body.dataset.kind = kind;
  const note = (key, vars) => {
    const p = document.createElement("p");
    p.className = "viewer-note";
    p.textContent = t(key, vars);
    body.appendChild(p);
    return p;
  };
  if (kind === "image") {
    const img = document.createElement("img");
    img.className = "viewer-image";
    img.alt = name;
    img.src = fileUrl;
    body.appendChild(img);
    return;
  }
  if (kind === "pdf") {
    const frame = document.createElement("iframe");
    frame.className = "viewer-frame";
    frame.title = name;
    frame.src = fileUrl;
    body.appendChild(frame);
    return;
  }
  if (kind === "archive") {
    note("plugin.file-explorer.viewer.loading");
    try {
      const data = await api(`/api/allkin/fs/archive?path=${encodeURIComponent(tab.path)}`);
      if (activeTab() !== tab) return;
      body.replaceChildren();
      // A plural: the count picks the form.
      const head = document.createElement("p");
      head.className = "viewer-archive-head";
      head.textContent = tn("plugin.file-explorer.viewer.archive.count", data.total);
      body.appendChild(head);
      if (data.truncated) note("plugin.file-explorer.viewer.archive.truncated", { count: data.entries.length });
      const table = document.createElement("table");
      table.className = "data-table viewer-archive";
      const tbody = document.createElement("tbody");
      for (const entry of data.entries) {
        const tr = document.createElement("tr");
        tr.className = "data-row";
        const tdName = document.createElement("td");
        tdName.className = "data-row-name";
        const icon = document.createElement("span");
        icon.className = "data-row-icon";
        poserIcone(icon, { name: entry.name.replace(/\/$/, "").split("/").pop() || entry.name, type: entry.dir ? "dir" : "file" }, "x/x");
        const text = document.createElement("span");
        text.className = "data-row-name-text";
        text.textContent = entry.name;
        text.title = entry.name;
        tdName.append(icon, text);
        const tdSize = document.createElement("td");
        tdSize.className = "explorer-col-size";
        tdSize.textContent = entry.dir ? "—" : formatSize(entry.size);
        tr.append(tdName, tdSize);
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      body.appendChild(table);
    } catch (error) {
      if (activeTab() !== tab) return;
      body.replaceChildren();
      note("plugin.file-explorer.viewer.error", { message: error.message });
    }
    return;
  }
  if (kind === "text") {
    if (size != null && size > VIEWER_TEXT_MAX) {
      note("plugin.file-explorer.viewer.tooBig", { size: formatSize(size) });
      return;
    }
    note("plugin.file-explorer.viewer.loading");
    try {
      const res = await fetch(fileUrl, { credentials: "same-origin" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      const text = await res.text();
      if (activeTab() !== tab) return;
      body.replaceChildren();
      const pre = document.createElement("pre");
      pre.className = "viewer-raw";
      pre.textContent = text;
      if (!text.length) note("plugin.file-explorer.viewer.emptyFile");
      else body.appendChild(pre);
    } catch (error) {
      if (activeTab() !== tab) return;
      body.replaceChildren();
      note("plugin.file-explorer.viewer.error", { message: error.message });
    }
    return;
  }
  note("plugin.file-explorer.viewer.noPreview");
}

window.Allkin.registerTabKind("viewer", {
  panels: ["viewer-view"],
  byPath: true,
  icon: '<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g class="ph-light" transform="scale(0.09375)" fill="#2563eb" stroke="none"><path d="M245.48,125.57c-.34-.78-8.66-19.23-27.24-37.81C201,70.54,171.38,50,128,50S55,70.54,37.76,87.76c-18.58,18.58-26.9,37-27.24,37.81a6,6,0,0,0,0,4.88c.34.77,8.66,19.22,27.24,37.8C55,185.47,84.62,206,128,206s73-20.53,90.24-37.75c18.58-18.58,26.9-37,27.24-37.8A6,6,0,0,0,245.48,125.57ZM128,194c-31.38,0-58.78-11.42-81.45-33.93A134.77,134.77,0,0,1,22.69,128,134.56,134.56,0,0,1,46.55,95.94C69.22,73.42,96.62,62,128,62s58.78,11.42,81.45,33.94A134.56,134.56,0,0,1,233.31,128C226.94,140.21,195,194,128,194Zm0-112a46,46,0,1,0,46,46A46.06,46.06,0,0,0,128,82Zm0,80a34,34,0,1,1,34-34A34,34,0,0,1,128,162Z"/></g><g class="ph-duo" transform="scale(0.09375)" fill="#2563eb" stroke="none"><path d="M128,56C48,56,16,128,16,128s32,72,112,72,112-72,112-72S208,56,128,56Zm0,112a40,40,0,1,1,40-40A40,40,0,0,1,128,168Z" opacity="0.2"/><path d="M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.47,133.47,0,0,1,25,128,133.33,133.33,0,0,1,48.07,97.25C70.33,75.19,97.22,64,128,64s57.67,11.19,79.93,33.25A133.46,133.46,0,0,1,231.05,128C223.84,141.46,192.43,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z"/></g></svg>',
  label: (tab) => tab.name || tab.path.split("/").pop(),
  meta: t("plugin.file-explorer.tab.viewer.meta"),
  tooltip: (tab) => tab.path,
  scroller: () => document.getElementById("viewer-body"),
  activate: (tab) => void activateViewer(tab),
});

window.Allkin.registerTabKind("explorer", {
  panels: ["explorer-view"],
  icon: '<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g class="ph-light" transform="scale(0.09375)" fill="#f59e0b" stroke="none"><path d="M216,74H130.49l-27.9-27.9a13.94,13.94,0,0,0-9.9-4.1H40A14,14,0,0,0,26,56V200.62A13.39,13.39,0,0,0,39.38,214H216.89A13.12,13.12,0,0,0,230,200.89V88A14,14,0,0,0,216,74ZM40,54H92.69a2,2,0,0,1,1.41.59L113.51,74H38V56A2,2,0,0,1,40,54ZM218,200.89a1.11,1.11,0,0,1-1.11,1.11H39.38A1.4,1.4,0,0,1,38,200.62V86H216a2,2,0,0,1,2,2Z"/></g><g class="ph-duo" transform="scale(0.09375)" fill="#f59e0b" stroke="none"><path d="M128,80H32V56a8,8,0,0,1,8-8H92.69a8,8,0,0,1,5.65,2.34Z" opacity="0.2"/><path d="M216,72H131.31L104,44.69A15.86,15.86,0,0,0,92.69,40H40A16,16,0,0,0,24,56V200.62A15.4,15.4,0,0,0,39.38,216H216.89A15.13,15.13,0,0,0,232,200.89V88A16,16,0,0,0,216,72ZM92.69,56l16,16H40V56ZM216,200H40V88H216Z"/></g></svg>',
  label: () => t("tabs.group.explorer"),
  scroller: () => document.querySelector("#explorer-view .explorer-table-wrap"),
  activate: (tab) => loadExplorerPath(tab.path ?? ""),
});

// The shared folder has its entry in the Plugins list of the Allkin menu.
window.Allkin.registerApp({
  key: "share",
  get name() {
    return t("plugin.file-explorer.share.name");
  },
  get meta() {
    return t("plugin.file-explorer.share.meta");
  },
  icon: ICON_FOLDER,
  open: () => openTab(SHARE_SCOPE, "files"),
});

window.Allkin.provide("file-explorer", {
  openAgentFiles: (agentId) => openTab(agentId, "files"),
  openShare: () => openTab(SHARE_SCOPE, "files"),
  openAllkinExplorer: () => openTab(null, "explorer"),
});

})();
