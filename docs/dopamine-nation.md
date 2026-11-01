# Dopamine Nation

Added as a free Psychology title, with cover metadata, an original overview,
five key insights, and a full thematic summary. Bibliographic details and scope
were checked against the [publisher](https://www.penguinrandomhouse.com/books/624957/dopamine-nation-by-anna-lembke-md/9781524746735/).

The production build imports `data/dopamine-nation.json` through
`scripts/seed-dopamine-nation.mjs` after the existing marine biology import.
It reuses the existing category capitalization, recognizes the author with or
without the Dr/MD honorific, preserves existing records, ignores UUID conflicts,
and verifies visibility through `books_catalog`. Preview builds skip the import.
The library cache is bumped to v5 and the display counts include this addition.

Checks: `node scripts/seed-dopamine-nation.mjs --dry-run`,
`node --test scripts/seed-dopamine-nation.test.mjs`, and `npm run build`.
Narration uses the existing first-listen generation and caching flow.
