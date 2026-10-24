# Marine biology additions

Five free Science books are defined in `data/marine-biology.json`. Each includes
a cover URL, original overview, five insights, and a full original thematic
summary. English content uses the existing localization fallback. Audio remains
on demand through the existing voice endpoint.

## Applying the content

Vercel runs the import **after a successful production build**, using the existing
server-side `SUPABASE_SERVICE_ROLE_KEY` and optional `SUPABASE_URL`.
Preview and local builds never import automatically. A missing credential,
rejected insert, or missing catalog entry fails the production build instead
of silently publishing without the requested content.

For an explicit manual import against the configured Supabase database:

```sh
npm run seed:marine-biology -- --dry-run
npm run seed:marine-biology
```

Supply credentials through your local environment or deployment settings, never
in source control. The importer preserves existing records, matches title and
author before inserting, reuses the existing Science category capitalization,
and uses stable UUIDs with conflict-ignore for simultaneous builds. It verifies
the result through `books_catalog`, the view the library uses. No schema, RLS,
premium content, or existing summaries are changed. Reruns are safe.

`hob_books_cache_v4` retires the previous catalog cache so returning readers
load the new titles. Landing-page counts include the five additions.

## Validation

```sh
npm run test:marine-biology
npm run build
```

Tests use an in-memory database substitute; they never write to production.

## Editorial references

These publisher pages were used to confirm bibliographic details and scope.
The summaries are original commentary, not copied excerpts.

- [Other Minds](https://us.macmillan.com/books/9780374537197/otherminds/)
- [The Soul of an Octopus](https://www.simonandschuster.com/books/The-Soul-of-an-Octopus/Sy-Montgomery/9781451697728)
- [The Brilliant Abyss](https://groveatlantic.com/book/the-brilliant-abyss/)
- [Under the Sea-Wind](https://www.penguinrandomhouse.com/books/327544/under-the-sea-wind-by-rachel-l-carson/)
- [The Edge of the Sea](https://canongate.co.uk/books/3084-the-edge-of-the-sea/)
