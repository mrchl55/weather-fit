# Weather fit

A town name goes in. The next 7 days come back, ranked for skiing, surfing, outdoor sightseeing, and indoor sightseeing.

Open-Meteo supplies the weather. The server decides what a good day means and exposes it over GraphQL. The page searches, asks you to pick when several towns match, and shows the scores. A day that does not apply to the place is not shown as zero.

The bands and weights are in `src/activities`. The product calls are in `docs/DECISIONS.md`.

## Run

Node 20 or newer. Two terminals.

```sh
npm install
npm start
```

The API listens at http://localhost:4000/graphql.

```sh
cd web
npm install
npm run dev
```

The page is at http://localhost:5173. It proxies `/graphql` to the API.

## Tests

```sh
npm test
cd web && npm test
```

## Cut for time

- The GraphQL day is a status and a number. The component bands are not in the response.
- Each lookup calls Open-Meteo. There is no forecast cache.
- Later days are not marked less certain than tomorrow.
- Surf wind direction is not scored. A shoreline would be required, and a city search does not have one.
- Indoor does not check that the town has a museum.
