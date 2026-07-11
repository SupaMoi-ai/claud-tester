import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { AgendaList } from "./AgendaList";

describe("AgendaList", () => {
  it("renders event titles and a fallback when empty", () => {
    render(
      <AgendaList
        entries={[
          {
            id: "1",
            title: "Fotballtrening",
            startsAt: new Date("2026-07-14T17:00:00+02:00"),
            home: "pappa",
            isHandover: false,
          },
          {
            id: "handover",
            title: "Bytte",
            startsAt: new Date("2026-07-09T16:00:00+02:00"),
            home: "mamma",
            isHandover: true,
          },
        ]}
      />
    );

    expect(screen.getByText("Fotballtrening")).toBeTruthy();
    expect(screen.getByText("Bytte")).toBeTruthy();
  });

  it("shows a fallback message when there are no entries", () => {
    render(<AgendaList entries={[]} />);
    expect(screen.getByText("Ingenting i kalenderen ennå.")).toBeTruthy();
  });
});
