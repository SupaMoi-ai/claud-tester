import { describe, expect, it, jest } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { EventReviewCard } from "./EventReviewCard";

describe("EventReviewCard", () => {
  it("renders the event and calls onChangeHome when a chip is pressed", () => {
    const onChangeHome = jest.fn();
    render(
      <EventReviewCard
        event={{
          title: "Fotballtrening Madla IL",
          starts_at: "2026-07-14T17:00:00+02:00",
          location: "Madla stadion",
          home_suggestion: "pappa",
          home_reason: "14. juli er en tirsdag, som er en Pappa-dag i bytteplanen.",
        }}
        selectedHome="pappa"
        onChangeHome={onChangeHome}
      />
    );

    expect(screen.getByText("Fotballtrening Madla IL")).toBeTruthy();
    expect(
      screen.getByText("14. juli er en tirsdag, som er en Pappa-dag i bytteplanen.")
    ).toBeTruthy();

    fireEvent.press(screen.getByText("Mamma"));
    expect(onChangeHome).toHaveBeenCalledWith("mamma");
  });
});
