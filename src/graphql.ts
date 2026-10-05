import { createSchema, createYoga } from "graphql-yoga";
import { scoreIndoor } from "./activities/indoor.js";
import { scoreOutdoor } from "./activities/outdoor.js";
import { scoreSkiing } from "./activities/skiing.js";
import { scoreSurfing } from "./activities/surfing.js";
import {
  loadForecast,
  searchPlaces,
  type ForecastDay,
  type Place,
} from "./open-meteo.js";
import type { Fit } from "./scoring.js";

const typeDefs = /* GraphQL */ `
  type Query {
    places(name: String!): [Place!]!
    forecast(place: PlaceInput!): [ForecastDay!]!
  }

  type Place {
    id: Int!
    name: String!
    country: String
    region: String
    latitude: Float!
    longitude: Float!
    elevationM: Float!
    timezone: String!
  }

  input PlaceInput {
    id: Int!
    name: String!
    country: String
    region: String
    latitude: Float!
    longitude: Float!
    elevationM: Float!
    timezone: String!
  }

  enum FitStatus {
    SCORED
    NOT_APPLICABLE
  }

  type Fit {
    status: FitStatus!
    value: Int
  }

  type ForecastDay {
    date: String!
    skiing: Fit!
    surfing: Fit!
    outdoor: Fit!
    indoor: Fit!
  }
`;

type FetchLike = (url: string) => Promise<Response>;

export function createApp(fetchImpl: FetchLike = fetch) {
  return createYoga({
    schema: createSchema({
      typeDefs,
      resolvers: {
        Query: {
          places: (_parent: unknown, args: { name: string }) =>
            searchPlaces(args.name, fetchImpl),
          forecast: async (_parent: unknown, args: { place: Place }) => {
            const days = await loadForecast(placeFrom(args.place), fetchImpl);
            return days.map(scoredDay);
          },
        },
      },
    }),
    graphqlEndpoint: "/graphql",
  });
}

function placeFrom(place: Place): Place {
  return {
    ...place,
    country: place.country ?? null,
    region: place.region ?? null,
  };
}

function scoredDay(day: ForecastDay) {
  return {
    date: day.date,
    skiing: graphFit(scoreSkiing(day.skiing)),
    surfing: graphFit(scoreSurfing(day.surfing)),
    outdoor: graphFit(scoreOutdoor(day.outdoor)),
    indoor: graphFit(scoreIndoor(day.indoor)),
  };
}

function graphFit(fit: Fit) {
  if (fit.status === "not_applicable") {
    return { status: "NOT_APPLICABLE" as const, value: null };
  }
  return { status: "SCORED" as const, value: fit.value };
}
