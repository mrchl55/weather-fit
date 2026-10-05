import { describe, expect, it } from "vitest";
import { scoreSkiing } from "./activities/skiing.js";
import { createApp } from "./graphql.js";
import { mapDays, type Place } from "./open-meteo.js";

const alps: Place = {
  id: 1,
  name: "Andermatt",
  country: "Switzerland",
  region: "Uri",
  latitude: 46.5,
  longitude: 8,
  elevationM: 2958,
  timezone: "Europe/Zurich",
};

function forecastBody() {
  return {
    daily: {
      time: ["2026-10-05"],
      temperature_2m_max: [2.9],
      precipitation_sum: [0],
      snowfall_sum: [0],
      snow_depth_mean: [0.87],
      wind_speed_10m_max: [21],
      weather_code: [3],
      cloud_cover_mean: [21],
      uv_index_max: [3.95],
      visibility_mean: [35358.33],
    },
  };
}

const inland = {
  daily: {
    time: ["2026-10-05"],
    wave_height_max: [null],
    wave_period_max: [null],
  },
};

function town(id: number, region: string) {
  return {
    id,
    name: "Springfield",
    latitude: 37.2,
    longitude: -93.3,
    elevation: 396,
    country: "United States",
    admin1: region,
    timezone: "America/Chicago",
  };
}

function stubFetch(routes: { includes: string; body: unknown }[]) {
  return async (url: string): Promise<Response> => {
    const route = routes.find((item) => url.includes(item.includes));
    if (!route) throw new Error(`unexpected ${url}`);
    return new Response(JSON.stringify(route.body), { status: 200 });
  };
}

async function query(
  fetchImpl: (url: string) => Promise<Response>,
  source: string,
  variables?: Record<string, unknown>,
) {
  const response = await createApp(fetchImpl).fetch("http://localhost/graphql", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: source, variables }),
  });
  return response.json() as Promise<{
    data?: Record<string, unknown>;
    errors?: unknown[];
  }>;
}

describe("places", () => {
  it("returns an empty list for an unknown name", async () => {
    const body = await query(
      stubFetch([{ includes: "geocoding-api", body: { results: [] } }]),
      `query { places(name: "Nowhere") { name } }`,
    );
    expect(body.errors).toBeUndefined();
    expect(body.data).toEqual({ places: [] });
  });

  it("returns every match and does not pick one", async () => {
    const body = await query(
      stubFetch([
        {
          includes: "geocoding-api",
          body: { results: [town(1, "Missouri"), town(2, "Illinois")] },
        },
      ]),
      `query { places(name: "Springfield") { name region } }`,
    );
    expect(body.data).toEqual({
      places: [
        { name: "Springfield", region: "Missouri" },
        { name: "Springfield", region: "Illinois" },
      ],
    });
  });
});

describe("forecast", () => {
  it("scores the mapped week for the place that was picked", async () => {
    const weather = forecastBody();
    const day = mapDays(weather, inland, alps.elevationM)[0];
    if (!day) throw new Error("expected a day");
    const skiing = scoreSkiing(day.skiing);
    if (skiing.status !== "scored") throw new Error("expected a ski score");

    const body = await query(
      stubFetch([
        { includes: "api.open-meteo.com/v1/forecast", body: weather },
        { includes: "marine-api", body: inland },
      ]),
      `query ($place: PlaceInput!) {
        forecast(place: $place) {
          date
          skiing { status value }
          surfing { status value }
        }
      }`,
      { place: alps },
    );

    expect(body.errors).toBeUndefined();
    expect(body.data).toEqual({
      forecast: [
        {
          date: "2026-10-05",
          skiing: { status: "SCORED", value: skiing.value },
          surfing: { status: "NOT_APPLICABLE", value: null },
        },
      ],
    });
  });
});
