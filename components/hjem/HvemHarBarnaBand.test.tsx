import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { HvemHarBarnaBand } from "./HvemHarBarnaBand";

describe("HvemHarBarnaBand", () => {
  it("renders the current home and both kid tiles", () => {
    render(
      <HvemHarBarnaBand
        currentHome="pappa"
        kids={[
          { id: "1", displayName: "Ellie", color: "#B5602F" },
          { id: "2", displayName: "Eliyah", color: "#1C4A3E" },
        ]}
        now={new Date("2026-07-09T10:00:00+02:00")}
        nextHandoverAt={new Date("2026-07-09T16:00:00+02:00")}
        nextHandoverTo="mamma"
      />
    );

    expect(screen.getByText("Hos Pappa")).toBeTruthy();
    expect(screen.getByText("Ellie")).toBeTruthy();
    expect(screen.getByText("Eliyah")).toBeTruthy();
    expect(screen.getByText(/Neste bytte:.*Mamma/)).toBeTruthy();
  });
});
