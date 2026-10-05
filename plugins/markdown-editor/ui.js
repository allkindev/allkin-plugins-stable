"use strict";
/* ============================================================================
   Éditeur markdown — l'interface : icônes, barre d'outils, bulles et menus.
   ----------------------------------------------------------------------------
   Rien ici ne touche au document : la barre annonce une commande
   (`run("strong")`), l'éditeur l'exécute, puis lui rend l'état du curseur
   (`update(state)`) pour qu'elle allume les bons boutons.

   Bulles et menus sont posés dans <body>, en position fixe : la barre défile
   horizontalement (overflow) et l'éditeur vit parfois dans une modale, tout ce
   qui s'ouvrirait à l'intérieur serait rogné.
   ========================================================================== */
(() => {

const MDE = (window.AllkinMde = window.AllkinMde || {});

const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "");
const MOD = IS_MAC ? "⌘" : Allkin.t("plugin.markdown-editor.key.ctrl");
const ALT = Allkin.t("plugin.markdown-editor.key.alt");
const keys = (...parts) => parts.join(IS_MAC ? "" : "+");

/* Tracés 24×24, trait de 2, sans fond : ils prennent la couleur du texte. */
const ICONS = {
  undo: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M230,144a62.07,62.07,0,0,1-62,62H80a6,6,0,0,1,0-12h88a50,50,0,0,0,0-100H46.49l37.75,37.76a6,6,0,1,1-8.48,8.48l-48-48a6,6,0,0,1,0-8.48l48-48a6,6,0,0,1,8.48,8.48L46.49,82H168A62.07,62.07,0,0,1,230,144Z"/></g>',
  redo: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M171.76,131.76,209.51,94H88a50,50,0,0,0,0,100h88a6,6,0,0,1,0,12H88A62,62,0,0,1,88,82H209.51L171.76,44.24a6,6,0,0,1,8.48-8.48l48,48a6,6,0,0,1,0,8.48l-48,48a6,6,0,0,1-8.48-8.48Z"/></g>',
  strong: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M174.69,116.41A42,42,0,0,0,148,42H80a6,6,0,0,0-6,6V200a6,6,0,0,0,6,6h80a46,46,0,0,0,14.69-89.59ZM86,54h62a30,30,0,0,1,0,60H86Zm74,140H86V126h74a34,34,0,0,1,0,68Z"/></g>',
  em: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M198,56a6,6,0,0,1-6,6H156.32l-44,132H144a6,6,0,0,1,0,12H64a6,6,0,0,1,0-12H99.68l44-132H112a6,6,0,0,1,0-12h80A6,6,0,0,1,198,56Z"/></g>',
  del: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M222,128a6,6,0,0,1-6,6H169.45c11.28,6.92,20.55,17.38,20.55,34,0,25.36-27.81,46-62,46s-62-20.64-62-46a6,6,0,0,1,12,0c0,18.75,22.43,34,50,34s50-15.25,50-34c0-18.23-15.46-26.59-40.47-34H40a6,6,0,0,1,0-12H216A6,6,0,0,1,222,128ZM76.33,102a6.2,6.2,0,0,0,1.88-.3A6,6,0,0,0,82,94.13,19.74,19.74,0,0,1,81.11,88c0-19.38,20.16-34,46.89-34,19.58,0,35.56,7.81,42.74,20.89a6,6,0,0,0,10.52-5.78C171.94,52.13,152,42,128,42,94.43,42,69.11,61.77,69.11,88a31.62,31.62,0,0,0,1.52,9.87A6,6,0,0,0,76.33,102Z"/></g>',
  code: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M67.84,92.61,25.37,128l42.47,35.39a6,6,0,1,1-7.68,9.22l-48-40a6,6,0,0,1,0-9.22l48-40a6,6,0,0,1,7.68,9.22Zm176,30.78-48-40a6,6,0,1,0-7.68,9.22L230.63,128l-42.47,35.39a6,6,0,1,0,7.68,9.22l48-40a6,6,0,0,0,0-9.22Zm-81.79-89A6,6,0,0,0,154.36,38l-64,176A6,6,0,0,0,94,221.64a6.15,6.15,0,0,0,2,.36,6,6,0,0,0,5.64-3.95l64-176A6,6,0,0,0,162.05,34.36Z"/></g>',
  link: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M238,88.18a52.42,52.42,0,0,1-15.4,35.66l-34.75,34.75A52.28,52.28,0,0,1,150.62,174h-.05A52.63,52.63,0,0,1,98,119.9a6,6,0,0,1,6-5.84h.17a6,6,0,0,1,5.83,6.16A40.62,40.62,0,0,0,150.58,162h0a40.4,40.4,0,0,0,28.73-11.9l34.75-34.74A40.63,40.63,0,0,0,156.63,57.9l-11,11a6,6,0,0,1-8.49-8.49l11-11a52.62,52.62,0,0,1,74.43,0A52.83,52.83,0,0,1,238,88.18Zm-127.62,98.9-11,11A40.36,40.36,0,0,1,70.6,210h0a40.63,40.63,0,0,1-28.7-69.36L76.62,105.9A40.63,40.63,0,0,1,146,135.77a6,6,0,0,0,5.83,6.16H152a6,6,0,0,0,6-5.84A52.63,52.63,0,0,0,68.14,97.42L33.38,132.16A52.63,52.63,0,0,0,70.56,222h0a52.26,52.26,0,0,0,37.22-15.42l11-11a6,6,0,1,0-8.49-8.48Z"/></g>',
  unlink: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M200,56a34,34,0,0,0-48-.05L140.34,68.14a6,6,0,1,1-8.68-8.28l11.71-12.28.1-.11a46,46,0,0,1,65.06,65.06l-.11.1-12.28,11.71a6,6,0,1,1-8.28-8.68L200.09,104A34,34,0,0,0,200,56Zm-84.38,131.9L104,200.09A34,34,0,0,1,55.91,152l12.23-11.67a6,6,0,0,0-8.28-8.68L47.58,143.37l-.11.1a46,46,0,0,0,65.06,65.06l.1-.11,11.71-12.28a6,6,0,1,0-8.68-8.28ZM216,154H192a6,6,0,0,0,0,12h24a6,6,0,0,0,0-12ZM40,102H64a6,6,0,0,0,0-12H40a6,6,0,0,0,0,12Zm120,84a6,6,0,0,0-6,6v24a6,6,0,0,0,12,0V192A6,6,0,0,0,160,186ZM96,70a6,6,0,0,0,6-6V40a6,6,0,0,0-12,0V64A6,6,0,0,0,96,70Z"/></g>',
  ul: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M82,64a6,6,0,0,1,6-6H216a6,6,0,0,1,0,12H88A6,6,0,0,1,82,64Zm134,58H88a6,6,0,0,0,0,12H216a6,6,0,0,0,0-12Zm0,64H88a6,6,0,0,0,0,12H216a6,6,0,0,0,0-12ZM44,54A10,10,0,1,0,54,64,10,10,0,0,0,44,54Zm0,128a10,10,0,1,0,10,10A10,10,0,0,0,44,182Zm0-64a10,10,0,1,0,10,10A10,10,0,0,0,44,118Z"/></g>',
  ol: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M222,128a6,6,0,0,1-6,6H104a6,6,0,0,1,0-12H216A6,6,0,0,1,222,128ZM104,70H216a6,6,0,0,0,0-12H104a6,6,0,0,0,0,12ZM216,186H104a6,6,0,0,0,0,12H216a6,6,0,0,0,0-12ZM42.68,53.37,50,49.71V104a6,6,0,0,0,12,0V40a6,6,0,0,0-8.68-5.37l-16,8a6,6,0,0,0,5.36,10.74ZM72,202H52l21.48-28.74A21.5,21.5,0,0,0,77.79,157,21.75,21.75,0,0,0,69,142.38a22.86,22.86,0,0,0-31.35,4.31,22.18,22.18,0,0,0-3.28,5.92,6,6,0,0,0,11.28,4.11,9.87,9.87,0,0,1,1.48-2.67,10.78,10.78,0,0,1,14.78-2,9.89,9.89,0,0,1,4,6.61,9.64,9.64,0,0,1-2,7.28l-.06.09L35.2,204.41A6,6,0,0,0,40,214H72a6,6,0,0,0,0-12Z"/></g>',
  task: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M222,128a6,6,0,0,1-6,6H128a6,6,0,0,1,0-12h88A6,6,0,0,1,222,128ZM128,70h88a6,6,0,0,0,0-12H128a6,6,0,0,0,0,12Zm88,116H128a6,6,0,0,0,0,12h88a6,6,0,0,0,0-12ZM83.76,43.76,56,71.51,44.24,59.76a6,6,0,0,0-8.48,8.48l16,16a6,6,0,0,0,8.48,0l32-32a6,6,0,0,0-8.48-8.48Zm0,64L56,135.51,44.24,123.76a6,6,0,1,0-8.48,8.48l16,16a6,6,0,0,0,8.48,0l32-32a6,6,0,0,0-8.48-8.48Zm0,64L56,199.51,44.24,187.76a6,6,0,0,0-8.48,8.48l16,16a6,6,0,0,0,8.48,0l32-32a6,6,0,0,0-8.48-8.48Z"/></g>',
  quote: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M100,58H40A14,14,0,0,0,26,72v64a14,14,0,0,0,14,14h62v10a34,34,0,0,1-34,34,6,6,0,0,0,0,12,46.06,46.06,0,0,0,46-46V72A14,14,0,0,0,100,58Zm2,80H40a2,2,0,0,1-2-2V72a2,2,0,0,1,2-2h60a2,2,0,0,1,2,2ZM216,58H156a14,14,0,0,0-14,14v64a14,14,0,0,0,14,14h62v10a34,34,0,0,1-34,34,6,6,0,0,0,0,12,46.06,46.06,0,0,0,46-46V72A14,14,0,0,0,216,58Zm2,80H156a2,2,0,0,1-2-2V72a2,2,0,0,1,2-2h60a2,2,0,0,1,2,2Z"/></g>',
  pre: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M59.76,100.24l-32-32a6,6,0,0,1,0-8.48l32-32a6,6,0,1,1,8.48,8.48L40.49,64,68.24,91.76a6,6,0,1,1-8.48,8.48Zm40,0a6,6,0,0,0,8.48,0l32-32a6,6,0,0,0,0-8.48l-32-32a6,6,0,1,0-8.48,8.48L127.51,64,99.76,91.76A6,6,0,0,0,99.76,100.24ZM200,42H176a6,6,0,0,0,0,12h24a2,2,0,0,1,2,2V200a2,2,0,0,1-2,2H56a2,2,0,0,1-2-2V136a6,6,0,0,0-12,0v64a14,14,0,0,0,14,14H200a14,14,0,0,0,14-14V56A14,14,0,0,0,200,42Z"/></g>',
  table: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M224,50H32a6,6,0,0,0-6,6V192a14,14,0,0,0,14,14H216a14,14,0,0,0,14-14V56A6,6,0,0,0,224,50ZM38,110H82v36H38Zm56,0H218v36H94ZM218,62V98H38V62ZM38,192V158H82v36H40A2,2,0,0,1,38,192Zm178,2H94V158H218v34A2,2,0,0,1,216,194Z"/></g>',
  hr: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M222,128a6,6,0,0,1-6,6H40a6,6,0,0,1,0-12H216A6,6,0,0,1,222,128Z"/></g>',
  image: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M216,42H40A14,14,0,0,0,26,56V200a14,14,0,0,0,14,14H216a14,14,0,0,0,14-14V56A14,14,0,0,0,216,42ZM40,54H216a2,2,0,0,1,2,2V163.57L188.53,134.1a14,14,0,0,0-19.8,0l-21.42,21.42L101.9,110.1a14,14,0,0,0-19.8,0L38,154.2V56A2,2,0,0,1,40,54ZM38,200V171.17l52.58-52.58a2,2,0,0,1,2.84,0L176.83,202H40A2,2,0,0,1,38,200Zm178,2H193.8l-38-38,21.41-21.42a2,2,0,0,1,2.83,0l38,38V200A2,2,0,0,1,216,202ZM146,100a10,10,0,1,1,10,10A10,10,0,0,1,146,100Z"/></g>',
  file: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M208.25,123.76a6,6,0,0,1,0,8.49l-82.06,82a54,54,0,0,1-76.36-76.39L149.1,37.14a38,38,0,1,1,53.77,53.72L103.59,191.54a22,22,0,1,1-31.15-31.09l83.28-84.67a6,6,0,0,1,8.56,8.42L81,168.91a10,10,0,1,0,14.11,14.18L194.35,82.4a26,26,0,1,0-36.74-36.8L58.33,146.28a42,42,0,1,0,59.37,59.44l82.06-82A6,6,0,0,1,208.25,123.76Z"/></g>',
  source: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M232,50H24A14,14,0,0,0,10,64V192a14,14,0,0,0,14,14H232a14,14,0,0,0,14-14V64A14,14,0,0,0,232,50Zm2,142a2,2,0,0,1-2,2H24a2,2,0,0,1-2-2V64a2,2,0,0,1,2-2H232a2,2,0,0,1,2,2ZM126,104v48a6,6,0,0,1-12,0V118.49L92.24,140.24a6,6,0,0,1-8.48,0L62,118.49V152a6,6,0,0,1-12,0V104a6,6,0,0,1,10.24-4.24L88,127.51l27.76-27.75A6,6,0,0,1,126,104Zm78.24,19.76a6,6,0,0,1,0,8.48l-24,24a6,6,0,0,1-8.48,0l-24-24a6,6,0,1,1,8.48-8.48L170,137.51V104a6,6,0,0,1,12,0v33.51l13.76-13.75A6,6,0,0,1,204.24,123.76Z"/></g>',
  chevron: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M212.24,100.24l-80,80a6,6,0,0,1-8.48,0l-80-80a6,6,0,0,1,8.48-8.48L128,167.51l75.76-75.75a6,6,0,0,1,8.48,8.48Z"/></g>',
  trash: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M216,50H174V40a22,22,0,0,0-22-22H104A22,22,0,0,0,82,40V50H40a6,6,0,0,0,0,12H50V208a14,14,0,0,0,14,14H192a14,14,0,0,0,14-14V62h10a6,6,0,0,0,0-12ZM94,40a10,10,0,0,1,10-10h48a10,10,0,0,1,10,10V50H94ZM194,208a2,2,0,0,1-2,2H64a2,2,0,0,1-2-2V62H194ZM110,104v64a6,6,0,0,1-12,0V104a6,6,0,0,1,12,0Zm48,0v64a6,6,0,0,1-12,0V104a6,6,0,0,1,12,0Z"/></g>',
  open: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M222,104a6,6,0,0,1-12,0V54.49l-69.75,69.75a6,6,0,0,1-8.48-8.48L201.51,46H152a6,6,0,0,1,0-12h64a6,6,0,0,1,6,6Zm-38,26a6,6,0,0,0-6,6v72a2,2,0,0,1-2,2H48a2,2,0,0,1-2-2V80a2,2,0,0,1,2-2h72a6,6,0,0,0,0-12H48A14,14,0,0,0,34,80V208a14,14,0,0,0,14,14H176a14,14,0,0,0,14-14V136A6,6,0,0,0,184,130Z"/></g>',
  check: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M228.24,76.24l-128,128a6,6,0,0,1-8.48,0l-56-56a6,6,0,0,1,8.48-8.48L96,191.51,219.76,67.76a6,6,0,0,1,8.48,8.48Z"/></g>',
  text: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M206,56V88a6,6,0,0,1-12,0V62H134V194h26a6,6,0,0,1,0,12H96a6,6,0,0,1,0-12h26V62H62V88a6,6,0,0,1-12,0V56a6,6,0,0,1,6-6H200A6,6,0,0,1,206,56Z"/></g>',
  eye: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M245.48,125.57c-.34-.78-8.66-19.23-27.24-37.81C201,70.54,171.38,50,128,50S55,70.54,37.76,87.76c-18.58,18.58-26.9,37-27.24,37.81a6,6,0,0,0,0,4.88c.34.77,8.66,19.22,27.24,37.8C55,185.47,84.62,206,128,206s73-20.53,90.24-37.75c18.58-18.58,26.9-37,27.24-37.8A6,6,0,0,0,245.48,125.57ZM128,194c-31.38,0-58.78-11.42-81.45-33.93A134.77,134.77,0,0,1,22.69,128,134.56,134.56,0,0,1,46.55,95.94C69.22,73.42,96.62,62,128,62s58.78,11.42,81.45,33.94A134.56,134.56,0,0,1,233.31,128C226.94,140.21,195,194,128,194Zm0-112a46,46,0,1,0,46,46A46.06,46.06,0,0,0,128,82Zm0,80a34,34,0,1,1,34-34A34,34,0,0,1,128,162Z"/></g>',
  upload: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M222,144v64a6,6,0,0,1-6,6H40a6,6,0,0,1-6-6V144a6,6,0,0,1,12,0v58H210V144a6,6,0,0,1,12,0ZM92.24,76.24,122,46.49V144a6,6,0,0,0,12,0V46.49l29.76,29.75a6,6,0,0,0,8.48-8.48l-40-40a6,6,0,0,0-8.48,0l-40,40a6,6,0,0,0,8.48,8.48Z"/></g>',
  rowAdd: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M208,114H48a14,14,0,0,0-14,14v24a14,14,0,0,0,14,14H208a14,14,0,0,0,14-14V128A14,14,0,0,0,208,114Zm2,38a2,2,0,0,1-2,2H48a2,2,0,0,1-2-2V128a2,2,0,0,1,2-2H208a2,2,0,0,1,2,2ZM208,42H48A14,14,0,0,0,34,56V80A14,14,0,0,0,48,94H208a14,14,0,0,0,14-14V56A14,14,0,0,0,208,42Zm2,38a2,2,0,0,1-2,2H48a2,2,0,0,1-2-2V56a2,2,0,0,1,2-2H208a2,2,0,0,1,2,2ZM158,216a6,6,0,0,1-6,6H134v18a6,6,0,0,1-12,0V222H104a6,6,0,0,1,0-12h18V192a6,6,0,0,1,12,0v18h18A6,6,0,0,1,158,216Z"/></g>',
  colAdd: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M80,34H56A14,14,0,0,0,42,48V208a14,14,0,0,0,14,14H80a14,14,0,0,0,14-14V48A14,14,0,0,0,80,34Zm2,174a2,2,0,0,1-2,2H56a2,2,0,0,1-2-2V48a2,2,0,0,1,2-2H80a2,2,0,0,1,2,2ZM152,34H128a14,14,0,0,0-14,14V208a14,14,0,0,0,14,14h24a14,14,0,0,0,14-14V48A14,14,0,0,0,152,34Zm2,174a2,2,0,0,1-2,2H128a2,2,0,0,1-2-2V48a2,2,0,0,1,2-2h24a2,2,0,0,1,2,2Zm92-80a6,6,0,0,1-6,6H222v18a6,6,0,0,1-12,0V134H192a6,6,0,0,1,0-12h18V104a6,6,0,0,1,12,0v18h18A6,6,0,0,1,246,128Z"/></g>',
  rowDel: '<rect x="3" y="4" width="18" height="8" rx="2"/><path d="M9.5 18h5"/>',
  colDel: '<rect x="4" y="3" width="8" height="18" rx="2"/><path d="M15.5 12h5"/>',
  rowAddAbove: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M208,162H48a14,14,0,0,0-14,14v24a14,14,0,0,0,14,14H208a14,14,0,0,0,14-14V176A14,14,0,0,0,208,162Zm2,38a2,2,0,0,1-2,2H48a2,2,0,0,1-2-2V176a2,2,0,0,1,2-2H208a2,2,0,0,1,2,2ZM208,90H48a14,14,0,0,0-14,14v24a14,14,0,0,0,14,14H208a14,14,0,0,0,14-14V104A14,14,0,0,0,208,90Zm2,38a2,2,0,0,1-2,2H48a2,2,0,0,1-2-2V104a2,2,0,0,1,2-2H208a2,2,0,0,1,2,2ZM98,40a6,6,0,0,1,6-6h18V16a6,6,0,0,1,12,0V34h18a6,6,0,0,1,0,12H134V64a6,6,0,0,1-12,0V46H104A6,6,0,0,1,98,40Z"/></g>',
  colAddLeft: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M128,34H104A14,14,0,0,0,90,48V208a14,14,0,0,0,14,14h24a14,14,0,0,0,14-14V48A14,14,0,0,0,128,34Zm2,174a2,2,0,0,1-2,2H104a2,2,0,0,1-2-2V48a2,2,0,0,1,2-2h24a2,2,0,0,1,2,2ZM200,34H176a14,14,0,0,0-14,14V208a14,14,0,0,0,14,14h24a14,14,0,0,0,14-14V48A14,14,0,0,0,200,34Zm2,174a2,2,0,0,1-2,2H176a2,2,0,0,1-2-2V48a2,2,0,0,1,2-2h24a2,2,0,0,1,2,2ZM70,128a6,6,0,0,1-6,6H46v18a6,6,0,0,1-12,0V134H16a6,6,0,0,1,0-12H34V104a6,6,0,0,1,12,0v18H64A6,6,0,0,1,70,128Z"/></g>',
  more: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M138,128a10,10,0,1,1-10-10A10,10,0,0,1,138,128ZM60,118a10,10,0,1,0,10,10A10,10,0,0,0,60,118Zm136,0a10,10,0,1,0,10,10A10,10,0,0,0,196,118Z"/></g>',
  alignLeft: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M34,64a6,6,0,0,1,6-6H216a6,6,0,0,1,0,12H40A6,6,0,0,1,34,64Zm6,46H168a6,6,0,0,0,0-12H40a6,6,0,0,0,0,12Zm176,28H40a6,6,0,0,0,0,12H216a6,6,0,0,0,0-12Zm-48,40H40a6,6,0,0,0,0,12H168a6,6,0,0,0,0-12Z"/></g>',
  alignCenter: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M34,64a6,6,0,0,1,6-6H216a6,6,0,0,1,0,12H40A6,6,0,0,1,34,64ZM64,98a6,6,0,0,0,0,12H192a6,6,0,0,0,0-12Zm152,40H40a6,6,0,0,0,0,12H216a6,6,0,0,0,0-12Zm-24,40H64a6,6,0,0,0,0,12H192a6,6,0,0,0,0-12Z"/></g>',
  alignRight: '<g transform="scale(0.09375)" fill="currentColor" stroke="none"><path d="M34,64a6,6,0,0,1,6-6H216a6,6,0,0,1,0,12H40A6,6,0,0,1,34,64ZM216,98H88a6,6,0,0,0,0,12H216a6,6,0,0,0,0-12Zm0,40H40a6,6,0,0,0,0,12H216a6,6,0,0,0,0-12Zm0,40H88a6,6,0,0,0,0,12H216a6,6,0,0,0,0-12Z"/></g>',
};

function icon(name) {
  // Une constante de ce fichier, jamais du texte reçu : innerHTML est sans risque.
  return `<svg class="mde-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] ?? ""}</svg>`;
}

function make(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text != null) el.textContent = text;
  return el;
}

/** Un bouton de l'éditeur. Le clic ne doit jamais prendre le focus : c'est le
 *  texte sélectionné qui reçoit la commande, il ne faut pas le perdre. */
function button({ icon: name, label, tip, shortcut, className, text }) {
  const btn = make("button", `mde-btn${className ? ` ${className}` : ""}`);
  btn.type = "button";
  if (name) btn.innerHTML = icon(name);
  if (text) btn.appendChild(make("span", "mde-btn-text", text));
  btn.setAttribute("aria-label", label ?? tip ?? text ?? "");
  if (tip ?? label) btn.dataset.tip = tip ?? label;
  if (shortcut) btn.dataset.keys = shortcut;
  btn.addEventListener("mousedown", (event) => event.preventDefault());
  return btn;
}

/* ---- Infobulle ----------------------------------------------------------- */

let tipEl = null;
let tipTimer = null;

function hideTip() {
  clearTimeout(tipTimer);
  tipEl?.remove();
  tipEl = null;
}

function showTip(target) {
  hideTip();
  if (!target.isConnected || !target.dataset.tip) return;
  tipEl = make("div", "mde-tip");
  tipEl.appendChild(make("span", null, target.dataset.tip));
  if (target.dataset.keys) tipEl.appendChild(make("kbd", null, target.dataset.keys));
  document.body.appendChild(tipEl);
  place(tipEl, target.getBoundingClientRect(), "center", 8);
}

function bindTips(container) {
  const over = (event) => {
    const target = event.target.closest?.("[data-tip]");
    if (!target || !container.contains(target) || event.pointerType === "touch") return;
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => showTip(target), 450);
  };
  container.addEventListener("pointerover", over);
  container.addEventListener("pointerout", hideTip);
  container.addEventListener("pointerdown", hideTip);
  return () => {
    container.removeEventListener("pointerover", over);
    container.removeEventListener("pointerout", hideTip);
    container.removeEventListener("pointerdown", hideTip);
    hideTip();
  };
}

/* ---- Bulles -------------------------------------------------------------- */

function place(el, rect, align = "start", gap = 6) {
  const margin = 8;
  const width = el.offsetWidth;
  const height = el.offsetHeight;
  let left = align === "end" ? rect.right - width : align === "center" ? rect.left + rect.width / 2 - width / 2 : rect.left;
  let top = rect.bottom + gap;
  if (top + height > window.innerHeight - margin && rect.top - gap - height >= margin) top = rect.top - gap - height;
  left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
  top = Math.max(margin, Math.min(top, window.innerHeight - height - margin));
  el.style.left = `${Math.round(left)}px`;
  el.style.top = `${Math.round(top)}px`;
}

const openPopovers = new Set();

/**
 * Ouvre une bulle ancrée à un élément ou à un rectangle.
 *   anchor   élément, DOMRect, ou fonction qui rend l'un des deux ;
 *   build    (el, close) => void : remplit la bulle ;
 *   owner    élément dont un clic ne ferme pas la bulle (le bouton qui l'ouvre).
 */
function popover({ anchor, build, className, align = "start", owner, onClose }) {
  const el = make("div", `mde-pop${className ? ` ${className}` : ""}`);
  let closed = false;

  const rectOf = () => {
    const target = typeof anchor === "function" ? anchor() : anchor;
    if (!target) return null;
    if (target instanceof Element) return target.isConnected ? target.getBoundingClientRect() : null;
    return target;
  };
  const reposition = () => {
    const rect = rectOf();
    if (!rect) return close();
    place(el, rect, align);
  };

  function close() {
    if (closed) return;
    closed = true;
    openPopovers.delete(handle);
    document.removeEventListener("pointerdown", onPointerDown, true);
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("resize", reposition);
    window.removeEventListener("scroll", reposition, true);
    el.remove();
    onClose?.();
  }
  const onPointerDown = (event) => {
    if (el.contains(event.target) || owner?.contains(event.target)) return;
    close();
  };
  const onKeyDown = (event) => {
    if (event.key !== "Escape") return;
    // Arrêtée ici : sinon la modale qui héberge l'éditeur se fermerait avec.
    event.preventDefault();
    event.stopPropagation();
    close();
  };

  const handle = { el, close, reposition, contains: (node) => el.contains(node) };
  build(el, close);
  document.body.appendChild(el);
  reposition();
  if (closed) return handle;
  openPopovers.add(handle);
  document.addEventListener("pointerdown", onPointerDown, true);
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("resize", reposition);
  window.addEventListener("scroll", reposition, true);
  return handle;
}

const closeAllPopovers = () => [...openPopovers].forEach((pop) => pop.close());
const focusInPopover = () => [...openPopovers].some((pop) => pop.contains(document.activeElement));

/* ---- Menu ---------------------------------------------------------------- */

const fold = (text) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/**
 * Une liste d'entrées à choisir. `keyboard: false` la laisse sans focus — le
 * menu « / » est piloté par l'éditeur, le curseur reste dans le texte.
 * Entrée : { id, label, hint?, icon?, sample?, active?, words? }.
 */
function menu({ anchor, items, onPick, owner, align, className, onClose, title }) {
  let shown = items;
  let index = Math.max(0, items.findIndex((item) => item.active));
  let listEl;

  const paint = () => {
    listEl.replaceChildren();
    if (!shown.length) {
      listEl.appendChild(make("div", "mde-menu-empty", Allkin.t("plugin.markdown-editor.menu.empty")));
      return;
    }
    shown.forEach((item, i) => {
      if (i > 0 && item.group !== shown[i - 1].group) listEl.appendChild(make("div", "mde-menu-rule"));
      const row = make("button", `mde-menu-item${i === index ? " is-current" : ""}${item.active ? " is-active" : ""}${item.danger ? " is-danger" : ""}`);
      row.type = "button";
      row.setAttribute("role", "option");
      const glyph = make("span", "mde-menu-glyph");
      if (item.icon) glyph.innerHTML = icon(item.icon);
      else glyph.textContent = item.sample ?? "";
      const text = make("span", "mde-menu-text");
      text.appendChild(make("span", "mde-menu-label", item.label));
      if (item.hint) text.appendChild(make("span", "mde-menu-hint", item.hint));
      row.append(glyph, text);
      if (item.keys) row.appendChild(make("kbd", "mde-menu-keys", item.keys));
      row.addEventListener("mousedown", (event) => event.preventDefault());
      row.addEventListener("mousemove", () => {
        if (index === i) return;
        index = i;
        paint();
      });
      row.addEventListener("click", () => pick(i));
      listEl.appendChild(row);
    });
    listEl.querySelector(".is-current")?.scrollIntoView({ block: "nearest" });
  };

  const pick = (i = index) => {
    const item = shown[i];
    if (!item) return false;
    pop.close();
    onPick(item);
    return true;
  };

  const pop = popover({
    anchor,
    owner,
    align,
    onClose,
    className: `mde-menu${className ? ` ${className}` : ""}`,
    build: (el) => {
      if (title) el.appendChild(make("div", "mde-menu-title", title));
      listEl = el.appendChild(make("div", "mde-menu-list"));
      listEl.setAttribute("role", "listbox");
      paint();
    },
  });

  return {
    close: pop.close,
    reposition: pop.reposition,
    pick,
    get empty() {
      return shown.length === 0;
    },
    move(delta) {
      if (!shown.length) return;
      index = (index + delta + shown.length) % shown.length;
      paint();
    },
    filter(query) {
      const q = fold(query);
      shown = q ? items.filter((item) => fold(`${item.label} ${item.words ?? ""}`).includes(q)) : items;
      index = 0;
      paint();
      pop.reposition();
    },
  };
}

/* ---- Barre d'outils ------------------------------------------------------ */

const BLOCK_LABELS = {
  p: Allkin.t("plugin.markdown-editor.block.text"),
  h1: Allkin.t("plugin.markdown-editor.block.heading", { level: 1 }),
  h2: Allkin.t("plugin.markdown-editor.block.heading", { level: 2 }),
  h3: Allkin.t("plugin.markdown-editor.block.heading", { level: 3 }),
  h4: Allkin.t("plugin.markdown-editor.block.heading", { level: 4 }),
  h5: Allkin.t("plugin.markdown-editor.block.heading", { level: 5 }),
  h6: Allkin.t("plugin.markdown-editor.block.heading", { level: 6 }),
  ul: Allkin.t("plugin.markdown-editor.block.list"),
  ol: Allkin.t("plugin.markdown-editor.block.ol"),
  task: Allkin.t("plugin.markdown-editor.block.task"),
  quote: Allkin.t("plugin.markdown-editor.block.quote"),
  pre: Allkin.t("plugin.markdown-editor.block.pre"),
  table: Allkin.t("plugin.markdown-editor.block.table"),
};

const BLOCK_CHOICES = [
  { id: "p", label: Allkin.t("plugin.markdown-editor.block.text"), sample: "T", hint: Allkin.t("plugin.markdown-editor.hint.text"), keys: keys(MOD, ALT, "0") },
  { id: "h1", label: Allkin.t("plugin.markdown-editor.block.heading", { level: 1 }), sample: "H1", hint: Allkin.t("plugin.markdown-editor.hint.h1"), keys: keys(MOD, ALT, "1") },
  { id: "h2", label: Allkin.t("plugin.markdown-editor.block.heading", { level: 2 }), sample: "H2", hint: Allkin.t("plugin.markdown-editor.hint.h2"), keys: keys(MOD, ALT, "2") },
  { id: "h3", label: Allkin.t("plugin.markdown-editor.block.heading", { level: 3 }), sample: "H3", hint: Allkin.t("plugin.markdown-editor.hint.h3"), keys: keys(MOD, ALT, "3") },
];

/** Les blocs du menu « / » — et, pour moitié, ceux de la barre. */
const INSERT_CHOICES = [
  { id: "p", label: Allkin.t("plugin.markdown-editor.block.text"), icon: "text", hint: Allkin.t("plugin.markdown-editor.hint.text"), words: Allkin.t("plugin.markdown-editor.words.text") },
  { id: "h1", label: Allkin.t("plugin.markdown-editor.block.heading", { level: 1 }), sample: "H1", hint: Allkin.t("plugin.markdown-editor.hint.h1"), words: Allkin.t("plugin.markdown-editor.words.heading") },
  { id: "h2", label: Allkin.t("plugin.markdown-editor.block.heading", { level: 2 }), sample: "H2", hint: Allkin.t("plugin.markdown-editor.hint.h2"), words: Allkin.t("plugin.markdown-editor.words.heading") },
  { id: "h3", label: Allkin.t("plugin.markdown-editor.block.heading", { level: 3 }), sample: "H3", hint: Allkin.t("plugin.markdown-editor.hint.h3"), words: Allkin.t("plugin.markdown-editor.words.heading") },
  { id: "ul", label: Allkin.t("plugin.markdown-editor.block.ul"), icon: "ul", hint: Allkin.t("plugin.markdown-editor.hint.ul"), words: Allkin.t("plugin.markdown-editor.words.ul") },
  { id: "ol", label: Allkin.t("plugin.markdown-editor.block.ol"), icon: "ol", hint: Allkin.t("plugin.markdown-editor.hint.ol"), words: Allkin.t("plugin.markdown-editor.words.ol") },
  { id: "task", label: Allkin.t("plugin.markdown-editor.block.task"), icon: "task", hint: Allkin.t("plugin.markdown-editor.hint.task"), words: Allkin.t("plugin.markdown-editor.words.task") },
  { id: "quote", label: Allkin.t("plugin.markdown-editor.block.quote"), icon: "quote", hint: Allkin.t("plugin.markdown-editor.hint.quote"), words: Allkin.t("plugin.markdown-editor.words.quote") },
  { id: "pre", label: Allkin.t("plugin.markdown-editor.block.pre"), icon: "pre", hint: Allkin.t("plugin.markdown-editor.hint.pre"), words: Allkin.t("plugin.markdown-editor.words.pre") },
  { id: "table", label: Allkin.t("plugin.markdown-editor.block.table"), icon: "table", hint: Allkin.t("plugin.markdown-editor.hint.table"), words: Allkin.t("plugin.markdown-editor.words.table") },
  { id: "hr", label: Allkin.t("plugin.markdown-editor.block.hr"), icon: "hr", hint: Allkin.t("plugin.markdown-editor.hint.hr"), words: Allkin.t("plugin.markdown-editor.words.hr") },
  { id: "image", label: Allkin.t("plugin.markdown-editor.block.image"), icon: "image", hint: Allkin.t("plugin.markdown-editor.hint.image"), words: Allkin.t("plugin.markdown-editor.words.image") },
  { id: "file", label: Allkin.t("plugin.markdown-editor.block.file"), icon: "file", hint: Allkin.t("plugin.markdown-editor.hint.file"), words: Allkin.t("plugin.markdown-editor.words.file") },
  { id: "link", label: Allkin.t("plugin.markdown-editor.block.link"), icon: "link", hint: Allkin.t("plugin.markdown-editor.hint.link"), words: Allkin.t("plugin.markdown-editor.words.link") },
];

/* Quand la barre manque de place, ses outils se replient dans le menu « ⋯ »,
   des moins courants aux plus courants. Ce qui reste visible en dernier : le
   style du bloc, gras, italique, lien — et le markdown brut, toujours. */
const COLLAPSE_ORDER = [["blocks", "media"], ["lists"], ["history"], ["marks-more"]];

const MORE_ITEMS = [
  { id: "undo", group: "history", label: Allkin.t("plugin.markdown-editor.toolbar.undo"), icon: "undo" },
  { id: "redo", group: "history", label: Allkin.t("plugin.markdown-editor.toolbar.redo"), icon: "redo" },
  { id: "del", group: "marks-more", label: Allkin.t("plugin.markdown-editor.toolbar.del"), icon: "del" },
  { id: "code", group: "marks-more", label: Allkin.t("plugin.markdown-editor.toolbar.code"), icon: "code" },
  { id: "ul", group: "lists", label: Allkin.t("plugin.markdown-editor.block.ul"), icon: "ul" },
  { id: "ol", group: "lists", label: Allkin.t("plugin.markdown-editor.block.ol"), icon: "ol" },
  { id: "task", group: "lists", label: Allkin.t("plugin.markdown-editor.block.task"), icon: "task" },
  { id: "quote", group: "blocks", label: Allkin.t("plugin.markdown-editor.block.quote"), icon: "quote" },
  { id: "pre", group: "blocks", label: Allkin.t("plugin.markdown-editor.block.pre"), icon: "pre" },
  { id: "table", group: "blocks", label: Allkin.t("plugin.markdown-editor.block.table"), icon: "table" },
  { id: "hr", group: "blocks", label: Allkin.t("plugin.markdown-editor.block.hr"), icon: "hr" },
  { id: "image", group: "media", label: Allkin.t("plugin.markdown-editor.block.image"), icon: "image" },
  { id: "file", group: "media", label: Allkin.t("plugin.markdown-editor.toolbar.attachFile"), icon: "file" },
];

/**
 * Peuple la barre d'outils.
 *   run(id, arg)   exécute une commande ;
 *   withFiles      l'éditeur sait-il recevoir des fichiers (bouton trombone).
 * Rend { update(state), anchorFor(id), destroy() }.
 */
function buildToolbar(container, { run, withFiles }) {
  container.replaceChildren();
  container.classList.add("mde-toolbar");
  container.setAttribute("role", "toolbar");
  container.setAttribute("aria-label", Allkin.t("plugin.markdown-editor.toolbar.label"));
  const buttons = new Map();
  let blockMenu = null;
  let tableMenu = null;
  let moreMenu = null;
  let collapsed = new Set();
  let lastState = {};
  let group = "";

  const put = (el) => {
    if (group) el.dataset.group = group;
    container.appendChild(el);
    return el;
  };
  /** Ouvre un groupe : le filet qui le précède se replie avec lui. */
  const open = (name) => {
    group = name;
    put(make("span", "mde-sep"));
  };
  const add = (id, options) => {
    const btn = button(options);
    btn.dataset.cmd = id;
    btn.addEventListener("click", () => run(id));
    buttons.set(id, btn);
    return put(btn);
  };
  const shift = IS_MAC ? "⇧" : Allkin.t("plugin.markdown-editor.key.shift");

  group = "history";
  add("undo", { icon: "undo", tip: Allkin.t("plugin.markdown-editor.toolbar.undo"), shortcut: keys(MOD, "Z") });
  add("redo", { icon: "redo", tip: Allkin.t("plugin.markdown-editor.toolbar.redo"), shortcut: keys(MOD, shift, "Z") });

  // Le style du bloc : un seul bouton qui dit où l'on est, plutôt que trois
  // « H1 H2 H3 » dont aucun ne dit qu'on est dans du texte courant.
  open("history");
  group = "";
  const block = put(button({ className: "mde-select", tip: Allkin.t("plugin.markdown-editor.toolbar.blockStyle"), text: Allkin.t("plugin.markdown-editor.block.text") }));
  block.insertAdjacentHTML("beforeend", icon("chevron"));
  block.setAttribute("aria-haspopup", "listbox");
  const blockLabel = block.querySelector(".mde-btn-text");
  block.addEventListener("click", () => {
    if (blockMenu) return blockMenu.close();
    const current = block.dataset.block;
    blockMenu = menu({
      anchor: block,
      owner: block,
      className: "mde-menu-blocks",
      items: BLOCK_CHOICES.map((item) => ({ ...item, active: item.id === current })),
      onPick: (item) => run("block", item.id),
      onClose: () => {
        blockMenu = null;
        block.classList.remove("is-open");
      },
    });
    block.classList.add("is-open");
  });
  buttons.set("block", block);

  put(make("span", "mde-sep"));
  add("strong", { icon: "strong", tip: Allkin.t("plugin.markdown-editor.toolbar.strong"), shortcut: keys(MOD, "B") });
  add("em", { icon: "em", tip: Allkin.t("plugin.markdown-editor.toolbar.em"), shortcut: keys(MOD, "I") });
  group = "marks-more";
  add("del", { icon: "del", tip: Allkin.t("plugin.markdown-editor.toolbar.del"), shortcut: keys(MOD, shift, "X") });
  add("code", { icon: "code", tip: Allkin.t("plugin.markdown-editor.toolbar.code"), shortcut: keys(MOD, "E") });
  group = "";
  add("link", { icon: "link", tip: Allkin.t("plugin.markdown-editor.block.link"), shortcut: keys(MOD, "K") });

  open("lists");
  add("ul", { icon: "ul", tip: Allkin.t("plugin.markdown-editor.block.ul") });
  add("ol", { icon: "ol", tip: Allkin.t("plugin.markdown-editor.block.ol") });
  add("task", { icon: "task", tip: Allkin.t("plugin.markdown-editor.block.task") });

  open("blocks");
  add("quote", { icon: "quote", tip: Allkin.t("plugin.markdown-editor.block.quote") });
  add("pre", { icon: "pre", tip: Allkin.t("plugin.markdown-editor.block.pre") });
  const table = put(button({ icon: "table", tip: Allkin.t("plugin.markdown-editor.block.table") }));
  table.dataset.cmd = "table";
  table.setAttribute("aria-haspopup", "dialog");
  table.addEventListener("click", () => {
    if (tableMenu) return tableMenu.close();
    tableMenu = tablePicker({
      anchor: table,
      onPick: (rows, cols) => run("table", { rows, cols }),
      onClose: () => {
        tableMenu = null;
        table.classList.remove("is-open");
      },
    });
    table.classList.add("is-open");
  });
  buttons.set("table", table);
  add("hr", { icon: "hr", tip: Allkin.t("plugin.markdown-editor.block.hr") });

  open("media");
  add("image", { icon: "image", tip: Allkin.t("plugin.markdown-editor.block.image") });
  if (withFiles) add("file", { icon: "file", tip: Allkin.t("plugin.markdown-editor.toolbar.attachFile") });

  group = "";
  put(make("span", "mde-sep")).dataset.group = "more";
  const more = put(button({ icon: "more", tip: Allkin.t("plugin.markdown-editor.toolbar.more") }));
  more.dataset.group = "more";
  more.setAttribute("aria-haspopup", "menu");
  more.addEventListener("click", () => {
    if (moreMenu) return moreMenu.close();
    moreMenu = menu({
      anchor: more,
      owner: more,
      align: "end",
      className: "mde-menu-compact",
      items: MORE_ITEMS.filter((item) => collapsed.has(item.group) && buttons.has(item.id) && !buttons.get(item.id).disabled).map((item) => ({
        ...item,
        active: Boolean(lastState.marks?.has(item.id)) || lastState.block === item.id,
      })),
      onPick: (item) => run(item.id),
      onClose: () => {
        moreMenu = null;
        more.classList.remove("is-open");
      },
    });
    more.classList.add("is-open");
  });

  put(make("span", "mde-spacer"));
  add("source", { icon: "source", tip: Allkin.t("plugin.markdown-editor.toolbar.source"), className: "mde-btn-source" });

  function collapse(level) {
    collapsed = new Set(COLLAPSE_ORDER.slice(0, level).flat());
    for (const el of container.children) {
      if (el.dataset.group === "more") el.hidden = level === 0;
      else if (el.dataset.group) el.hidden = collapsed.has(el.dataset.group);
    }
    // Dernier recours, sur un téléphone : on resserre ce qui reste.
    container.classList.toggle("is-tight", level > COLLAPSE_ORDER.length);
  }
  function fit() {
    if (!container.clientWidth) return;
    let level = 0;
    collapse(level);
    while (level <= COLLAPSE_ORDER.length && container.scrollWidth > container.clientWidth + 1) collapse(++level);
  }
  let fitQueued = false;
  const resize = new ResizeObserver(() => {
    if (fitQueued) return;
    fitQueued = true;
    requestAnimationFrame(() => {
      fitQueued = false;
      if (container.isConnected) fit();
    });
  });
  resize.observe(container);
  fit();

  const unbindTips = bindTips(container);

  // En mode brut, la mise en forme n'a plus de prise : seul le bouton qui en
  // fait sortir reste actif.
  return {
    /** Le bouton d'une commande — ou « ⋯ » s'il est replié dedans. */
    anchorFor: (id) => {
      const btn = buttons.get(id);
      return btn && !btn.hidden ? btn : more.hidden ? container : more;
    },
    update(state) {
      lastState = state;
      for (const [id, btn] of buttons) {
        const on =
          (state.marks?.has(id) ?? false) ||
          (id === "link" && state.link) ||
          (id === "source" && state.source) ||
          (id === state.block && id !== "block");
        btn.classList.toggle("is-on", Boolean(on));
        btn.setAttribute("aria-pressed", String(Boolean(on)));
        let disabled = state.source && id !== "source";
        if (id === "undo") disabled ||= !state.canUndo;
        if (id === "redo") disabled ||= !state.canRedo;
        if (state.inCode && ["strong", "em", "del", "code", "link", "image", "table"].includes(id)) disabled = true;
        btn.disabled = Boolean(disabled);
      }
      more.disabled = Boolean(state.source);
      const kind = state.block ?? "p";
      block.dataset.block = kind;
      blockLabel.textContent = BLOCK_LABELS[kind] ?? Allkin.t("plugin.markdown-editor.block.text");
    },
    destroy() {
      resize.disconnect();
      blockMenu?.close();
      tableMenu?.close();
      moreMenu?.close();
      unbindTips();
      container.classList.remove("mde-toolbar", "is-tight");
      container.removeAttribute("role");
      container.removeAttribute("aria-label");
      container.replaceChildren();
    },
  };
}

/** La grille où l'on choisit la taille du tableau en la survolant. */
function tablePicker({ anchor, onPick, onClose }) {
  const SIZE = 6;
  // One whole sentence per case: the number of rows picks the key, the number
  // of columns picks the plural form.
  const sizeText = (rows, cols) =>
    rows === 1
      ? Allkin.tn("plugin.markdown-editor.table.sizeOneRow", cols, { rows })
      : Allkin.tn("plugin.markdown-editor.table.sizeRows", cols, { rows });
  const cellText = (rows, cols) =>
    rows === 1
      ? Allkin.tn("plugin.markdown-editor.table.cellOneRow", cols, { rows })
      : Allkin.tn("plugin.markdown-editor.table.cellRows", cols, { rows });
  return popover({
    anchor,
    owner: anchor,
    onClose,
    className: "mde-grid-pop",
    build: (el, close) => {
      const label = make("div", "mde-grid-label", Allkin.t("plugin.markdown-editor.block.table"));
      const grid = make("div", "mde-grid");
      const cells = [];
      const light = (rows, cols) => {
        cells.forEach((cell) => cell.classList.toggle("is-lit", cell.row <= rows && cell.col <= cols));
        label.textContent = rows ? sizeText(rows, cols) : Allkin.t("plugin.markdown-editor.block.table");
      };
      for (let row = 1; row <= SIZE; row++) {
        for (let col = 1; col <= SIZE; col++) {
          const cell = make("button", "mde-grid-cell");
          cell.type = "button";
          cell.row = row;
          cell.col = col;
          cell.setAttribute("aria-label", cellText(row, col));
          cell.addEventListener("mousedown", (event) => event.preventDefault());
          cell.addEventListener("pointerenter", () => light(row, col));
          cell.addEventListener("focus", () => light(row, col));
          cell.addEventListener("click", () => {
            close();
            onPick(row, col);
          });
          cells.push(cell);
          grid.appendChild(cell);
        }
      }
      grid.addEventListener("pointerleave", () => light(0, 0));
      el.append(grid, label);
    },
  });
}

/* ---- Formulaires de bulle ------------------------------------------------ */

function field(labelText, { value = "", placeholder = "", type = "text" } = {}) {
  const wrap = make("label", "mde-field");
  wrap.appendChild(make("span", "mde-field-label", labelText));
  const input = wrap.appendChild(make("input", "mde-input"));
  input.type = type;
  input.value = value;
  input.placeholder = placeholder;
  input.autocomplete = "off";
  input.spellcheck = false;
  return { wrap, input };
}

function action(label, { primary = false, icon: name, danger = false } = {}) {
  const btn = make("button", `mde-action${primary ? " is-primary" : ""}${danger ? " is-danger" : ""}`);
  btn.type = "button";
  if (name) btn.innerHTML = icon(name);
  btn.appendChild(make("span", null, label));
  return btn;
}

/** Soumet un formulaire de bulle à Entrée, depuis n'importe lequel de ses champs. */
function submitOnEnter(el, submit) {
  el.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.isComposing || event.target.tagName !== "INPUT") return;
    event.preventDefault();
    submit();
  });
}

Object.assign(MDE, {
  IS_MAC,
  icon,
  make,
  button,
  popover,
  menu,
  buildToolbar,
  bindTips,
  field,
  action,
  submitOnEnter,
  closeAllPopovers,
  focusInPopover,
  fold,
  INSERT_CHOICES,
});

})();
