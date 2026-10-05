import { useRef, useState } from "react";
import {
  loadForecast,
  searchPlaces,
  type Fit,
  type ForecastDay,
  type Place,
} from "./api";

const ACTIVITIES = {
  skiing: "Skiing",
  surfing: "Surfing",
  outdoor: "Outdoor sightseeing",
  indoor: "Indoor sightseeing",
} as const;

type Activity = keyof typeof ACTIVITIES;

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "not-found"; name: string }
  | { kind: "choices"; places: Place[] }
  | { kind: "week"; place: Place; days: ForecastDay[] };

export function App() {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const busy = useRef(false);

  async function run(task: () => Promise<Status>) {
    // blocks a second submit before the loading render lands
    if (busy.current) return;
    busy.current = true;
    setStatus({ kind: "loading" });
    try {
      setStatus(await task());
    } catch (error) {
      const message = error instanceof Error ? error.message : "request failed";
      setStatus({ kind: "error", message });
    } finally {
      busy.current = false;
    }
  }

  function lookup() {
    const query = name.trim();
    if (query === "") return;
    void run(async () => {
      const { places } = await searchPlaces(query);
      const only = places.length === 1 ? places[0] : undefined;
      if (!only) {
        return places.length === 0
          ? { kind: "not-found", name: query }
          : { kind: "choices", places };
      }
      const { forecast } = await loadForecast(only);
      return { kind: "week", place: only, days: forecast };
    });
  }

  function pick(place: Place) {
    void run(async () => {
      const { forecast } = await loadForecast(place);
      return { kind: "week", place, days: forecast };
    });
  }

  return (
    <main>
      <h1>Weather fit</h1>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          lookup();
        }}
      >
        <label>
          Town
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <button type="submit" disabled={status.kind === "loading"}>
          Look up
        </button>
      </form>
      <Result status={status} onPick={pick} />
    </main>
  );
}

function Result({
  status,
  onPick,
}: {
  status: Status;
  onPick: (place: Place) => void;
}) {
  if (status.kind === "loading") return <p role="status">Loading</p>;
  if (status.kind === "error") return <p role="alert">{status.message}</p>;
  if (status.kind === "not-found") {
    return <p>No place matched {status.name}</p>;
  }
  if (status.kind === "choices") {
    return (
      <ul>
        {status.places.map((place) => (
          <li key={place.id}>
            <button type="button" onClick={() => onPick(place)}>
              {placeLabel(place)}
            </button>
          </li>
        ))}
      </ul>
    );
  }
  if (status.kind === "week") return <Week place={status.place} days={status.days} />;
  return null;
}

function Week({ place, days }: { place: Place; days: ForecastDay[] }) {
  const best = bestScores(days);
  return (
    <section>
      <h2>{placeLabel(place)}</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            {activityNames().map((activity) => (
              <th key={activity}>{ACTIVITIES[activity]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.date}>
              <th scope="row">{day.date}</th>
              {activityNames().map((activity) => {
                const fit = day[activity];
                const marked = fit.value != null && fit.value === best[activity];
                return (
                  <td key={activity}>
                    {fitText(fit)}
                    {marked ? (
                      <>
                        {" "}
                        <span className="best">best</span>
                      </>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function activityNames(): Activity[] {
  return Object.keys(ACTIVITIES) as Activity[];
}

function bestScores(days: ForecastDay[]): Partial<Record<Activity, number>> {
  const best: Partial<Record<Activity, number>> = {};
  for (const activity of activityNames()) {
    for (const day of days) {
      const fit = day[activity];
      if (fit.status !== "SCORED" || fit.value == null) continue;
      const current = best[activity];
      if (current == null || fit.value > current) best[activity] = fit.value;
    }
  }
  return best;
}

function fitText(fit: Fit): string {
  if (fit.status === "NOT_APPLICABLE" || fit.value == null) return "not for this place";
  return String(fit.value);
}

function placeLabel(place: Place): string {
  return [place.name, place.region, place.country].filter(Boolean).join(", ");
}
