# Frontend bundle analysis

## Result

- Original main JavaScript: 707.85 KB minified, 201.50 KB gzip.
- New main JavaScript: 341.22 KB minified, 108.89 KB gzip.
- Reduction: 366.63 KB minified (51.8%).
- Build warning above 500 KB: cleared.

All 25 page entry points now use route-level `React.lazy` loading. Opportunity,
CV, interview, advisor, career-data, and public/auth routes load on demand.

Largest remaining JavaScript chunks:

- main shared chunk: 341.22 KB;
- form dependencies: 87.14 KB;
- application layout: 43.28 KB;
- onboarding: 40.89 KB.

The component source-map diagnostic was removed by dropping inapplicable
framework-only module directives from the Vite UI components. Source maps must not
be publicly served; privately upload them when an error-monitoring provider is
selected. Browser regression remains required against hosted private staging.
