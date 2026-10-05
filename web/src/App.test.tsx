import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import type { ForecastDay, Place } from "./api";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const lisbon: Place = {
  id: 1,
  name: "Lisbon",
  country: "Portugal",
  region: "Lisbon",
  latitude: 38.72,
  longitude: -9.14,
  elevationM: 45,
  timezone: "Europe/Lisbon",
};

const week: ForecastDay[] = [
  {
    date: "2026-10-05",
    skiing: { status: "SCORED", value: 80 },
    surfing: { status: "NOT_APPLICABLE", value: null },
    outdoor: { status: "SCORED", value: 60 },
    indoor: { status: "SCORED", value: 70 },
  },
  {
    date: "2026-10-06",
    skiing: { status: "SCORED", value: 40 },
    surfing: { status: "NOT_APPLICABLE", value: null },
    outdoor: { status: "SCORED", value: 90 },
    indoor: { status: "SCORED", value: 70 },
  },
];

function json(data: unknown): Response {
  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("App", () => {
  it("shows loading and ignores a second submit", async () => {
    const calls: string[] = [];
    let release: (response: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      (_url: string, init?: RequestInit) => {
        calls.push(String(init?.body));
        return new Promise<Response>((resolve) => {
          release = resolve;
        });
      },
    );
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText("Town"), "Lisbon");
    await user.click(screen.getByRole("button", { name: "Look up" }));
    expect((await screen.findByRole("status")).textContent).toContain("Loading");
    expect(screen.getByRole("button", { name: "Look up" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(calls).toHaveLength(1);
    release(json({ places: [] }));
    expect(await screen.findByText("No place matched Lisbon")).toBeTruthy();
  });

  it("says when the town was not found", async () => {
    vi.stubGlobal("fetch", async () => json({ places: [] }));
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText("Town"), "Nope");
    await user.click(screen.getByRole("button", { name: "Look up" }));
    expect(await screen.findByText("No place matched Nope")).toBeTruthy();
    expect(screen.getByLabelText("Town")).toHaveProperty("value", "Nope");
  });

  it("lists matching towns before scoring any of them", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => {
      calls.push(String(init?.body));
      return json({
        places: [
          { ...lisbon, id: 1, name: "Springfield", region: "Missouri", country: "United States" },
          { ...lisbon, id: 2, name: "Springfield", region: "Illinois", country: "United States" },
        ],
      });
    });
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText("Town"), "Springfield");
    await user.click(screen.getByRole("button", { name: "Look up" }));
    expect(await screen.findByRole("button", { name: "Springfield, Missouri, United States" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Springfield, Illinois, United States" })).toBeTruthy();
    expect(calls.some((call) => call.includes("forecast"))).toBe(false);
  });

  it("shows the week for a single town, with surfing not for this place", async () => {
    vi.stubGlobal("fetch", async (_url: string, init?: RequestInit) => {
      const body = String(init?.body);
      if (body.includes("forecast")) return json({ forecast: week });
      return json({ places: [lisbon] });
    });
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText("Town"), "Lisbon");
    await user.click(screen.getByRole("button", { name: "Look up" }));
    expect(await screen.findByRole("heading", { name: "Lisbon, Lisbon, Portugal" })).toBeTruthy();
    expect(screen.getAllByText("not for this place").length).toBeGreaterThan(0);
    expect(screen.getByRole("cell", { name: "80 best" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "90 best" })).toBeTruthy();
    expect(screen.getAllByRole("cell", { name: "70 best" })).toHaveLength(2);
  });
});
