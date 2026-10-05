export type Place = {
  id: number;
  name: string;
  country: string | null;
  region: string | null;
  latitude: number;
  longitude: number;
  elevationM: number;
  timezone: string;
};

export type Fit = {
  status: "SCORED" | "NOT_APPLICABLE";
  value: number | null;
};

export type ForecastDay = {
  date: string;
  skiing: Fit;
  surfing: Fit;
  outdoor: Fit;
  indoor: Fit;
};

type GraphBody<T> = {
  data?: T;
  errors?: { message: string }[];
};

async function graphql<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const response = await fetch("/graphql", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) throw new Error(`request failed: ${response.status}`);
  const body = (await response.json()) as GraphBody<T>;
  const message = body.errors?.[0]?.message;
  if (message) throw new Error(message);
  if (!body.data) throw new Error("empty response");
  return body.data;
}

const PLACE_FIELDS = `
  id
  name
  country
  region
  latitude
  longitude
  elevationM
  timezone
`;

export function searchPlaces(name: string) {
  return graphql<{ places: Place[] }>(
    `query ($name: String!) {
      places(name: $name) { ${PLACE_FIELDS} }
    }`,
    { name },
  );
}

export function loadForecast(place: Place) {
  return graphql<{ forecast: ForecastDay[] }>(
    `query ($place: PlaceInput!) {
      forecast(place: $place) {
        date
        skiing { status value }
        surfing { status value }
        outdoor { status value }
        indoor { status value }
      }
    }`,
    { place },
  );
}
