// When CONSTRUCTION_MODE=true (set in deploy.yml), only the index page is emitted.
// Local dev (quartz serve) is unaffected — all pages build normally.
export const isConstructionMode = process.env.CONSTRUCTION_MODE === "true"
