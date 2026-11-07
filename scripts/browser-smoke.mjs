// Compatibility entry point: the V1.7 browser suite includes the legacy
// card-first, Wire/Bribe, reaction and stale-aim regression scenarios.
if(process.env.BROWSER_OUTPUT_DIR&&!process.env.QA_OUTPUT_DIR)process.env.QA_OUTPUT_DIR=process.env.BROWSER_OUTPUT_DIR;
await import('./qa-v17.mjs');
