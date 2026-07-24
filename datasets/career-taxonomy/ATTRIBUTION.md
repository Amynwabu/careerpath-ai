# Career Taxonomy Source Attribution

No third-party authoritative source files are committed in this repository by
default. The ingestion pipeline reads authorised source files from
`.local-data/taxonomy-sources`, which is ignored by Git.

Before using a real source file, update
`datasets/career-taxonomy/sources/source-manifest.json` with:

- source version
- file name and checksum
- retrieval method
- licence name and URL
- attribution requirement
- whether raw redistribution is allowed
- whether derived CareerPathX outputs may be committed

## Supported Source Systems

### UK SOC 2020

Publisher: UK Office for National Statistics.

Status: supported by local CSV adapter. No raw UK SOC files are committed here.

### ESCO

Publisher: European Commission.

Status: supported by local CSV adapter. No raw ESCO files are committed here.

### O\*NET

Publisher: U.S. Department of Labor, Employment and Training Administration.

Status: supported by local CSV adapter. No raw O\*NET files are committed here.

### Professional Bodies

Initial bodies: PMI, APM, IET, ICE.

Status: controlled local imports only. The repository must not download,
scrape, copy, or redistribute restricted professional-body framework content
unless the source terms explicitly permit that use. Competency CSVs should store
concise normalised statements and source references rather than substantial
copied passages.
