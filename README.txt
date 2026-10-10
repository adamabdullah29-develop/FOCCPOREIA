FOCC — PHASE 3: CSS + CORE JS + ISO TANK MODULE SPLIT

Files:
- index.html: original HTML with CSS link and ordered script links.
- css/focc.css: extracted original CSS.
- js/focc.js: core script through foccAutoLogin(), unchanged content.
- js/modules/iso-tank.js: ISO Tank Depot Fasa 2–5 block moved verbatim from the end of the original main script.

Load order is important: js/focc.js MUST load before js/modules/iso-tank.js.
The module relies on shared globals/functions registered by the core script.

Validation performed:
- JavaScript syntax checked independently with Node.js.
- Re-concatenating js/focc.js + js/modules/iso-tank.js reproduces the Phase 2 JS byte-for-byte.
- HTML script order checked.

Not yet browser-tested. Test on Cloudflare Pages Preview before production deployment.
Keep all original image/logo/assets at their existing paths. Do not delete other repository assets.
