"use strict";
/* ============================================================================
   Promptr — les blocs d'un plan.
   ----------------------------------------------------------------------------
   Un plan décrit un agent en blocs : rôle, personnalité, compétences… Chaque
   nature de bloc déclare ici ses champs, une fois pour toutes. Tout le reste
   en découle :
     · la fenêtre de réglage d'un bloc est construite depuis ses champs ;
     · le résumé affiché sur la carte du plan aussi ;
     · la description du format que reçoit l'agent de Promptr, quand il doit
       convertir un prompt en plan, est générée depuis ces mêmes champs —
       l'interface et l'agent parlent donc toujours du même plan ;
     · un plan venu d'ailleurs (fichier, réponse de l'agent) est ramené à ces
       champs par normalizePlan : ce qui n'y entre pas est écarté.

   Kinds de champ :
     text      une ligne            textarea  un paragraphe
     list      une liste de lignes  pairs     une liste de paires (deux champs)
     select    un choix             scale     un curseur de -2 à +2
   ========================================================================== */
(() => {

// Names, hints, labels, placeholders and options are in the language of the
// interface (see locales.js): read once, when this script loads — the page is
// reloaded when the language changes. Option values and cursor readings are
// also written into the plan, hence into the prompt the user builds.
const t = (key) => window.Allkin.t(key);

const BLOCK_TYPES = {
  role: {
    label: t("plugin.promptr.block.role.label"),
    hint: t("plugin.promptr.block.role.hint"),
    color: "#8b5cf6",
    icon: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M229.19,213c-15.81-27.32-40.63-46.49-69.47-54.62a70,70,0,1,0-63.44,0C67.44,166.5,42.62,185.67,26.81,213a6,6,0,1,0,10.38,6C56.4,185.81,90.34,166,128,166s71.6,19.81,90.81,53a6,6,0,1,0,10.38-6ZM70,96a58,58,0,1,1,58,58A58.07,58.07,0,0,1,70,96Z"/></g>',
    fields: [
      { key: "role", label: t("plugin.promptr.block.role.field.role.label"), kind: "text", placeholder: t("plugin.promptr.block.role.field.role.placeholder") },
      { key: "mission", label: t("plugin.promptr.block.role.field.mission.label"), kind: "textarea", placeholder: t("plugin.promptr.block.role.field.mission.placeholder") },
      { key: "audience", label: t("plugin.promptr.block.role.field.audience.label"), kind: "text", placeholder: t("plugin.promptr.block.role.field.audience.placeholder") },
    ],
  },
  personality: {
    label: t("plugin.promptr.block.personality.label"),
    hint: t("plugin.promptr.block.personality.hint"),
    color: "#ec4899",
    icon: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M173.19,155c-9.92,17.16-26.39,27-45.19,27s-35.27-9.84-45.19-27a6,6,0,0,1,10.38-6c7.84,13.54,20.2,21,34.81,21s27-7.46,34.81-21a6,6,0,1,1,10.38,6ZM230,128A102,102,0,1,1,128,26,102.12,102.12,0,0,1,230,128Zm-12,0a90,90,0,1,0-90,90A90.1,90.1,0,0,0,218,128ZM92,118a10,10,0,1,0-10-10A10,10,0,0,0,92,118Zm72-20a10,10,0,1,0,10,10A10,10,0,0,0,164,98Z"/></g>',
    fields: [
      {
        key: "tone",
        label: t("plugin.promptr.block.personality.field.tone.label"),
        kind: "select",
        options: ["", t("plugin.promptr.block.personality.field.tone.option.warm"), t("plugin.promptr.block.personality.field.tone.option.calm"), t("plugin.promptr.block.personality.field.tone.option.direct"), t("plugin.promptr.block.personality.field.tone.option.playful"), t("plugin.promptr.block.personality.field.tone.option.teaching"), t("plugin.promptr.block.personality.field.tone.option.solemn")],
      },
      { key: "formality", label: t("plugin.promptr.block.personality.field.formality.label"), kind: "scale", ends: [t("plugin.promptr.block.personality.field.formality.low"), t("plugin.promptr.block.personality.field.formality.high")],
        readings: { lowStrong: t("plugin.promptr.block.personality.field.formality.reading.lowStrong"), low: t("plugin.promptr.block.personality.field.formality.reading.low"), high: t("plugin.promptr.block.personality.field.formality.reading.high"), highStrong: t("plugin.promptr.block.personality.field.formality.reading.highStrong") } },
      { key: "concision", label: t("plugin.promptr.block.personality.field.concision.label"), kind: "scale", ends: [t("plugin.promptr.block.personality.field.concision.low"), t("plugin.promptr.block.personality.field.concision.high")],
        readings: { lowStrong: t("plugin.promptr.block.personality.field.concision.reading.lowStrong"), low: t("plugin.promptr.block.personality.field.concision.reading.low"), high: t("plugin.promptr.block.personality.field.concision.reading.high"), highStrong: t("plugin.promptr.block.personality.field.concision.reading.highStrong") } },
      { key: "humor", label: t("plugin.promptr.block.personality.field.humor.label"), kind: "scale", ends: [t("plugin.promptr.block.personality.field.humor.low"), t("plugin.promptr.block.personality.field.humor.high")],
        readings: { lowStrong: t("plugin.promptr.block.personality.field.humor.reading.lowStrong"), low: t("plugin.promptr.block.personality.field.humor.reading.low"), high: t("plugin.promptr.block.personality.field.humor.reading.high"), highStrong: t("plugin.promptr.block.personality.field.humor.reading.highStrong") } },
      { key: "assertiveness", label: t("plugin.promptr.block.personality.field.assertiveness.label"), kind: "scale", ends: [t("plugin.promptr.block.personality.field.assertiveness.low"), t("plugin.promptr.block.personality.field.assertiveness.high")],
        readings: { lowStrong: t("plugin.promptr.block.personality.field.assertiveness.reading.lowStrong"), low: t("plugin.promptr.block.personality.field.assertiveness.reading.low"), high: t("plugin.promptr.block.personality.field.assertiveness.reading.high"), highStrong: t("plugin.promptr.block.personality.field.assertiveness.reading.highStrong") } },
      { key: "notes", label: t("plugin.promptr.block.personality.field.notes.label"), kind: "textarea", placeholder: t("plugin.promptr.block.personality.field.notes.placeholder") },
    ],
  },
  skills: {
    label: t("plugin.promptr.block.skills.label"),
    hint: t("plugin.promptr.block.skills.hint"),
    color: "#f59e0b",
    icon: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M237.28,97.87A14.18,14.18,0,0,0,224.76,88l-60.25-4.87-23.22-56.2a14.37,14.37,0,0,0-26.58,0L91.49,83.11,31.24,88a14.18,14.18,0,0,0-12.52,9.89A14.43,14.43,0,0,0,23,113.32L69,152.93l-14,59.25a14.4,14.4,0,0,0,5.59,15,14.1,14.1,0,0,0,15.91.6L128,196.12l51.58,31.71a14.1,14.1,0,0,0,15.91-.6,14.4,14.4,0,0,0,5.59-15l-14-59.25L233,113.32A14.43,14.43,0,0,0,237.28,97.87Zm-12.14,6.37-48.69,42a6,6,0,0,0-1.92,5.92l14.88,62.79a2.35,2.35,0,0,1-.95,2.57,2.24,2.24,0,0,1-2.6.1L131.14,184a6,6,0,0,0-6.28,0L70.14,217.61a2.24,2.24,0,0,1-2.6-.1,2.35,2.35,0,0,1-1-2.57l14.88-62.79a6,6,0,0,0-1.92-5.92l-48.69-42a2.37,2.37,0,0,1-.73-2.65,2.28,2.28,0,0,1,2.07-1.65l63.92-5.16a6,6,0,0,0,5.06-3.69l24.63-59.6a2.35,2.35,0,0,1,4.38,0l24.63,59.6a6,6,0,0,0,5.06,3.69l63.92,5.16a2.28,2.28,0,0,1,2.07,1.65A2.37,2.37,0,0,1,225.14,104.24Z"/></g>',
    fields: [
      {
        key: "level",
        label: t("plugin.promptr.block.skills.field.level.label"),
        kind: "select",
        options: ["", t("plugin.promptr.block.skills.field.level.option.generalist"), t("plugin.promptr.block.skills.field.level.option.experienced"), t("plugin.promptr.block.skills.field.level.option.expert"), t("plugin.promptr.block.skills.field.level.option.authority")],
      },
      { key: "items", label: t("plugin.promptr.block.skills.field.items.label"), kind: "list", placeholder: t("plugin.promptr.block.skills.field.items.placeholder") },
    ],
  },
  knowledge: {
    label: t("plugin.promptr.block.knowledge.label"),
    hint: t("plugin.promptr.block.knowledge.hint"),
    color: "#0ea5e9",
    icon: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M208,26H72A30,30,0,0,0,42,56V224a6,6,0,0,0,6,6H192a6,6,0,0,0,0-12H54v-2a18,18,0,0,1,18-18H208a6,6,0,0,0,6-6V32A6,6,0,0,0,208,26Zm-6,160H72a29.87,29.87,0,0,0-18,6V56A18,18,0,0,1,72,38H202Z"/></g>',
    fields: [
      { key: "domains", label: t("plugin.promptr.block.knowledge.field.domains.label"), kind: "list", placeholder: t("plugin.promptr.block.knowledge.field.domains.placeholder") },
      { key: "context", label: t("plugin.promptr.block.knowledge.field.context.label"), kind: "textarea", placeholder: t("plugin.promptr.block.knowledge.field.context.placeholder") },
      { key: "glossary", label: t("plugin.promptr.block.knowledge.field.glossary.label"), kind: "pairs", pair: [t("plugin.promptr.block.knowledge.field.glossary.a"), t("plugin.promptr.block.knowledge.field.glossary.b")],
        addLabel: t("plugin.promptr.block.knowledge.field.glossary.add"), countKey: "plugin.promptr.block.knowledge.field.glossary.count" },
    ],
  },
  method: {
    label: t("plugin.promptr.block.method.label"),
    hint: t("plugin.promptr.block.method.hint"),
    color: "#10b981",
    icon: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M222,128a6,6,0,0,1-6,6H128a6,6,0,0,1,0-12h88A6,6,0,0,1,222,128ZM128,70h88a6,6,0,0,0,0-12H128a6,6,0,0,0,0,12Zm88,116H128a6,6,0,0,0,0,12h88a6,6,0,0,0,0-12ZM83.76,43.76,56,71.51,44.24,59.76a6,6,0,0,0-8.48,8.48l16,16a6,6,0,0,0,8.48,0l32-32a6,6,0,0,0-8.48-8.48Zm0,64L56,135.51,44.24,123.76a6,6,0,1,0-8.48,8.48l16,16a6,6,0,0,0,8.48,0l32-32a6,6,0,0,0-8.48-8.48Zm0,64L56,199.51,44.24,187.76a6,6,0,0,0-8.48,8.48l16,16a6,6,0,0,0,8.48,0l32-32a6,6,0,0,0-8.48-8.48Z"/></g>',
    fields: [
      { key: "steps", label: t("plugin.promptr.block.method.field.steps.label"), kind: "list", placeholder: t("plugin.promptr.block.method.field.steps.placeholder") },
      {
        key: "clarify",
        label: t("plugin.promptr.block.method.field.clarify.label"),
        kind: "select",
        options: ["", t("plugin.promptr.block.method.field.clarify.option.never"), t("plugin.promptr.block.method.field.clarify.option.ifAmbiguous"), t("plugin.promptr.block.method.field.clarify.option.always")],
      },
      { key: "uncertainty", label: t("plugin.promptr.block.method.field.uncertainty.label"), kind: "text", placeholder: t("plugin.promptr.block.method.field.uncertainty.placeholder") },
      { key: "done", label: t("plugin.promptr.block.method.field.done.label"), kind: "text", placeholder: t("plugin.promptr.block.method.field.done.placeholder") },
    ],
  },
  format: {
    label: t("plugin.promptr.block.format.label"),
    hint: t("plugin.promptr.block.format.hint"),
    color: "#6366f1",
    icon: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M34,64a6,6,0,0,1,6-6H216a6,6,0,0,1,0,12H40A6,6,0,0,1,34,64Zm6,46H168a6,6,0,0,0,0-12H40a6,6,0,0,0,0,12Zm176,28H40a6,6,0,0,0,0,12H216a6,6,0,0,0,0-12Zm-48,40H40a6,6,0,0,0,0,12H168a6,6,0,0,0,0-12Z"/></g>',
    fields: [
      { key: "language", label: t("plugin.promptr.block.format.field.language.label"), kind: "text", placeholder: t("plugin.promptr.block.format.field.language.placeholder") },
      {
        key: "address",
        label: t("plugin.promptr.block.format.field.address.label"),
        kind: "select",
        options: ["", t("plugin.promptr.block.format.field.address.option.informal"), t("plugin.promptr.block.format.field.address.option.formal")],
      },
      {
        key: "length",
        label: t("plugin.promptr.block.format.field.length.label"),
        kind: "select",
        options: ["", t("plugin.promptr.block.format.field.length.option.short"), t("plugin.promptr.block.format.field.length.option.medium"), t("plugin.promptr.block.format.field.length.option.detailed"), t("plugin.promptr.block.format.field.length.option.adaptive")],
      },
      {
        key: "structure",
        label: t("plugin.promptr.block.format.field.structure.label"),
        kind: "select",
        options: ["", t("plugin.promptr.block.format.field.structure.option.prose"), t("plugin.promptr.block.format.field.structure.option.bullets"), t("plugin.promptr.block.format.field.structure.option.sections"), t("plugin.promptr.block.format.field.structure.option.tables")],
      },
      { key: "notes", label: t("plugin.promptr.block.format.field.notes.label"), kind: "textarea", placeholder: t("plugin.promptr.block.format.field.notes.placeholder") },
    ],
  },
  scope: {
    label: t("plugin.promptr.block.scope.label"),
    hint: t("plugin.promptr.block.scope.hint"),
    color: "#ef4444",
    icon: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M208,42H48A14,14,0,0,0,34,56v56c0,51.94,25.12,83.4,46.2,100.64,22.73,18.6,45.27,24.89,46.22,25.15a6,6,0,0,0,3.16,0c.95-.26,23.49-6.55,46.22-25.15C196.88,195.4,222,163.94,222,112V56A14,14,0,0,0,208,42Zm2,70c0,37.76-13.94,68.39-41.44,91.06A131.17,131.17,0,0,1,128,225.72a130.94,130.94,0,0,1-40.56-22.66C59.94,180.39,46,149.76,46,112V56a2,2,0,0,1,2-2H208a2,2,0,0,1,2,2Z"/></g>',
    fields: [
      { key: "inScope", label: t("plugin.promptr.block.scope.field.inScope.label"), kind: "list", placeholder: t("plugin.promptr.block.scope.field.inScope.placeholder") },
      { key: "outOfScope", label: t("plugin.promptr.block.scope.field.outOfScope.label"), kind: "list", placeholder: t("plugin.promptr.block.scope.field.outOfScope.placeholder") },
      { key: "redLines", label: t("plugin.promptr.block.scope.field.redLines.label"), kind: "list", placeholder: t("plugin.promptr.block.scope.field.redLines.placeholder") },
      { key: "offTopic", label: t("plugin.promptr.block.scope.field.offTopic.label"), kind: "text", placeholder: t("plugin.promptr.block.scope.field.offTopic.placeholder") },
    ],
  },
  examples: {
    label: t("plugin.promptr.block.examples.label"),
    hint: t("plugin.promptr.block.examples.hint"),
    color: "#14b8a6",
    icon: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M128,26A102,102,0,0,0,38.35,176.69L26.73,211.56a14,14,0,0,0,17.71,17.71l34.87-11.62A102,102,0,1,0,128,26Zm0,192a90,90,0,0,1-45.06-12.08,6.09,6.09,0,0,0-3-.81,6.2,6.2,0,0,0-1.9.31L40.65,217.88a2,2,0,0,1-2.53-2.53L50.58,178a6,6,0,0,0-.5-4.91A90,90,0,1,1,128,218Z"/></g>',
    fields: [
      { key: "items", label: t("plugin.promptr.block.examples.field.items.label"), kind: "pairs", pair: [t("plugin.promptr.block.examples.field.items.a"), t("plugin.promptr.block.examples.field.items.b")],
        addLabel: t("plugin.promptr.block.examples.field.items.add"), countKey: "plugin.promptr.block.examples.field.items.count", long: true },
    ],
  },
  greeting: {
    label: t("plugin.promptr.block.greeting.label"),
    hint: t("plugin.promptr.block.greeting.hint"),
    color: "#84cc16",
    icon: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M188,50a25.8,25.8,0,0,0-14,4.11V44a26,26,0,0,0-51.41-5.51A26,26,0,0,0,82,60v71l-7.53-12.1a26,26,0,0,0-45.11,25.87C60.76,211,78.51,238,128,238a86.1,86.1,0,0,0,86-86V76A26,26,0,0,0,188,50Zm14,102a74.09,74.09,0,0,1-74,74c-21,0-34.51-5.05-46.75-17.45C67.81,195,55.54,172,40.1,139.43l-.23-.43a14,14,0,0,1,24.25-14l.1.17,18.68,30A6,6,0,0,0,94,152V60a14,14,0,0,1,28,0v60a6,6,0,0,0,12,0V44a14,14,0,0,1,28,0v76a6,6,0,0,0,12,0V76a14,14,0,0,1,28,0Z"/></g>',
    fields: [
      { key: "message", label: t("plugin.promptr.block.greeting.field.message.label"), kind: "textarea", placeholder: t("plugin.promptr.block.greeting.field.message.placeholder") },
      { key: "starters", label: t("plugin.promptr.block.greeting.field.starters.label"), kind: "list", placeholder: t("plugin.promptr.block.greeting.field.starters.placeholder") },
    ],
  },
  custom: {
    label: t("plugin.promptr.block.custom.label"),
    hint: t("plugin.promptr.block.custom.hint"),
    color: "#64748b",
    icon: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M225.91,74.79,181.22,30.1a14,14,0,0,0-19.8,0L38.1,153.41a13.94,13.94,0,0,0-4.1,9.9V208a14,14,0,0,0,14,14H216a6,6,0,0,0,0-12H110.49L225.91,94.59A14,14,0,0,0,225.91,74.79ZM93.52,210H48a2,2,0,0,1-2-2V163.31a2,2,0,0,1,.59-1.41L136,72.49,183.52,120ZM217.42,86.1,192,111.52,144.49,64,169.9,38.59a2,2,0,0,1,2.83,0l44.69,44.68A2,2,0,0,1,217.42,86.1Z"/></g>',
    multiple: true,
    fields: [
      { key: "title", label: t("plugin.promptr.block.custom.field.title.label"), kind: "text", placeholder: t("plugin.promptr.block.custom.field.title.placeholder") },
      { key: "content", label: t("plugin.promptr.block.custom.field.content.label"), kind: "textarea", placeholder: t("plugin.promptr.block.custom.field.content.placeholder") },
    ],
  },
};

const BLOCK_ORDER = ["role", "personality", "skills", "knowledge", "method", "format", "scope", "examples", "greeting", "custom"];

let seq = 0;
function newId() {
  seq += 1;
  return `b${Date.now().toString(36)}${seq.toString(36)}`;
}

/* ---- Valeurs ------------------------------------------------------------- */

function cleanText(value, max = 4000) {
  return typeof value === "string" ? value.replace(/\r\n?/g, "\n").trim().slice(0, max) : "";
}

function cleanField(field, value) {
  switch (field.kind) {
    case "list":
      return (Array.isArray(value) ? value : typeof value === "string" ? value.split("\n") : [])
        .map((v) => cleanText(v, 400))
        .filter(Boolean)
        .slice(0, 40);
    case "pairs":
      return (Array.isArray(value) ? value : [])
        .filter((p) => p && typeof p === "object")
        .map((p) => {
          const a = cleanText(p.a ?? p[0] ?? p.term ?? p.user ?? p.question ?? "", 2000);
          const b = cleanText(p.b ?? p[1] ?? p.definition ?? p.assistant ?? p.answer ?? "", 4000);
          return { a, b };
        })
        .filter((p) => p.a || p.b)
        .slice(0, 20);
    case "select": {
      const v = cleanText(value, 200);
      if (field.options.includes(v)) return v;
      // L'agent peut répondre avec une valeur approchante : on retient la
      // première option qui la contient, sinon rien.
      const lower = v.toLowerCase();
      // Compared in lower case: German options start with a capital letter.
      return (lower && field.options.find((o) => o && (o.toLowerCase().includes(lower) || lower.includes(o.toLowerCase())))) || "";
    }
    case "scale": {
      const n = Math.round(Number(value));
      return Number.isFinite(n) ? Math.max(-2, Math.min(2, n)) : 0;
    }
    default:
      return cleanText(value, field.kind === "textarea" ? 6000 : 300);
  }
}

function emptyData(type) {
  const data = {};
  for (const field of BLOCK_TYPES[type].fields) data[field.key] = cleanField(field, undefined);
  return data;
}

function createBlock(type, data = {}) {
  const def = BLOCK_TYPES[type] ? type : "custom";
  const block = { id: newId(), type: def, data: emptyData(def) };
  for (const field of BLOCK_TYPES[def].fields) {
    if (data[field.key] !== undefined) block.data[field.key] = cleanField(field, data[field.key]);
  }
  return block;
}

function isBlockEmpty(block) {
  return BLOCK_TYPES[block.type].fields.every((f) => {
    const v = block.data[f.key];
    return Array.isArray(v) ? v.length === 0 : f.kind === "scale" ? v === 0 : !v;
  });
}

/* ---- Plan ---------------------------------------------------------------- */

function emptyPlan() {
  return {
    format: "promptr",
    version: 1,
    name: "",
    description: "",
    blocks: [],
    deploy: { model: "", effort: "", thinking: "" },
    prompt: null, // dernier prompt généré (ou retouché), texte Markdown
    promptFrom: null, // empreinte du plan qui l'a produit
    promptEdited: false, // retouché à la main depuis la génération
    updatedAt: null,
  };
}

/**
 * Ramène n'importe quel objet (fichier, stockage, réponse de l'agent) à un plan
 * valide : champs connus seulement, types corrigés, blocs inconnus convertis en
 * bloc libre. Une nature unique (tout sauf « custom ») n'apparaît qu'une fois :
 * les doublons sont fusionnés en blocs libres, rien n'est perdu.
 */
function normalizePlan(raw) {
  const plan = emptyPlan();
  if (!raw || typeof raw !== "object") return plan;
  plan.name = cleanText(raw.name, 60);
  plan.description = cleanText(raw.description, 100);
  if (raw.deploy && typeof raw.deploy === "object") {
    plan.deploy.model = cleanText(raw.deploy.model, 80);
    plan.deploy.effort = cleanText(raw.deploy.effort, 20);
    plan.deploy.thinking = cleanText(raw.deploy.thinking, 20);
  }
  if (typeof raw.prompt === "string") plan.prompt = raw.prompt;
  if (typeof raw.promptFrom === "string") plan.promptFrom = raw.promptFrom;
  plan.promptEdited = raw.promptEdited === true;
  plan.updatedAt = typeof raw.updatedAt === "string" ? raw.updatedAt : null;

  const seen = new Set();
  for (const b of Array.isArray(raw.blocks) ? raw.blocks : []) {
    if (!b || typeof b !== "object") continue;
    let type = typeof b.type === "string" && BLOCK_TYPES[b.type] ? b.type : "custom";
    let data = b.data && typeof b.data === "object" ? b.data : b;
    if (type === "custom" && !BLOCK_TYPES[b.type] && typeof b.type === "string") {
      // Nature inconnue : on la garde comme bloc libre, titre compris.
      const title = data.title ?? b.type.replace(/[-_]+/g, " ");
      data = { title: title.charAt(0).toUpperCase() + title.slice(1), content: data.content ?? JSON.stringify(data) };
    }
    if (type !== "custom" && seen.has(type)) {
      data = { title: BLOCK_TYPES[type].label, content: describeBlockData(type, data) };
      type = "custom";
    }
    seen.add(type);
    const block = createBlock(type, data);
    if (typeof b.id === "string" && /^[\w-]{1,40}$/.test(b.id)) block.id = b.id;
    plan.blocks.push(block);
  }
  return plan;
}

/* ---- Lecture humaine ------------------------------------------------------ */

function scaleWord(field, v) {
  if (!v) return "";
  // One whole reading per position of the cursor (see locales.js).
  const strong = Math.abs(v) === 2;
  if (v < 0) return strong ? field.readings.lowStrong : field.readings.low;
  return strong ? field.readings.highStrong : field.readings.high;
}

/** Le résumé d'un bloc, sur sa carte : quelques fragments, dans l'ordre. */
function blockSummary(block) {
  const def = BLOCK_TYPES[block.type];
  const parts = [];
  for (const field of def.fields) {
    // Le titre d'un bloc libre est déjà celui de sa carte.
    if (block.type === "custom" && field.key === "title") continue;
    const v = block.data[field.key];
    if (field.kind === "list" && v.length) parts.push(v.slice(0, 4).join(" · ") + (v.length > 4 ? ` · +${v.length - 4}` : ""));
    else if (field.kind === "pairs" && v.length) parts.push(window.Allkin.tn(field.countKey, v.length));
    else if (field.kind === "scale" && v) parts.push(scaleWord(field, v));
    else if (typeof v === "string" && v) parts.push(v);
  }
  return parts.join(" — ");
}

/** Le contenu d'un bloc en texte, pour le convertir en bloc libre. */
// These lines end up in the plan, hence in the prompt: in the user's language.
const t_ = (key, vars) => window.Allkin.t(key, vars);
function describeBlockData(type, data) {
  const block = createBlock(type, data);
  const lines = [];
  for (const field of BLOCK_TYPES[type].fields) {
    const v = block.data[field.key];
    if (field.kind === "list" && v.length) lines.push(t_("plugin.promptr.inserted.fieldList", { label: field.label, items: v.map((x) => `- ${x}`).join("\n") }));
    else if (field.kind === "pairs" && v.length) lines.push(t_("plugin.promptr.inserted.fieldList", { label: field.label, items: v.map((p) => `- ${p.a} → ${p.b}`).join("\n") }));
    else if (field.kind === "scale" && v) lines.push(scaleWord(field, v));
    else if (typeof v === "string" && v) lines.push(t_("plugin.promptr.inserted.fieldValue", { label: field.label, value: v }));
  }
  return lines.join("\n");
}

/* ---- Pour l'agent --------------------------------------------------------- */

/**
 * Le format d'un plan, décrit pour l'agent de Promptr : il le reçoit dans la
 * tâche « analyser », pour rendre un plan que normalizePlan saura lire.
 */
function planFormatForAgent() {
  const lines = [
    "Un plan est un objet JSON :",
    '{ "name": texte (60 car. max), "description": texte (100 car. max), "blocks": [ { "type": …, "data": { … } } ] }',
    "",
    "Natures de bloc, chacune au plus une fois sauf « custom », dans l'ordre qui sert le mieux l'agent :",
  ];
  for (const type of BLOCK_ORDER) {
    const def = BLOCK_TYPES[type];
    const fields = def.fields.map((f) => {
      if (f.kind === "list") return `"${f.key}": [textes]  (${f.label})`;
      if (f.kind === "pairs") return `"${f.key}": [{ "a": ${f.pair[0].toLowerCase()}, "b": ${f.pair[1].toLowerCase()} }]`;
      if (f.kind === "scale") return `"${f.key}": entier de -2 (${f.ends[0].toLowerCase()}) à 2 (${f.ends[1].toLowerCase()}), 0 = neutre`;
      if (f.kind === "select") return `"${f.key}": une valeur parmi ${f.options.filter(Boolean).map((o) => `"${o}"`).join(", ")} ou ""`;
      return `"${f.key}": texte  (${f.label})`;
    });
    lines.push(`- "${type}" — ${def.label}${def.multiple ? " (plusieurs possibles)" : ""} : { ${fields.join(", ")} }`);
  }
  return lines.join("\n");
}

/** Le plan tel qu'on le confie à l'agent pour qu'il écrive le prompt : les
 *  blocs vides n'ont rien à lui dire. */
function planForAgent(plan) {
  return {
    name: plan.name,
    description: plan.description,
    blocks: plan.blocks
      .filter((b) => !isBlockEmpty(b))
      .map((b) => ({ type: b.type, label: BLOCK_TYPES[b.type].label, data: b.data })),
  };
}

/** Empreinte courte : le prompt généré correspond-il encore au plan ? */
function planFingerprint(plan) {
  const text = JSON.stringify(planForAgent(plan));
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

window.PromptrBlocks = Object.freeze({
  BLOCK_TYPES,
  BLOCK_ORDER,
  createBlock,
  emptyPlan,
  normalizePlan,
  blockSummary,
  isBlockEmpty,
  planFormatForAgent,
  planForAgent,
  planFingerprint,
  cleanField,
});
})();
