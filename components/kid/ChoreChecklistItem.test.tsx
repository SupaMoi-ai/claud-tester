import { describe, expect, it, jest } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { ChoreChecklistItem } from "./ChoreChecklistItem";

describe("ChoreChecklistItem", () => {
  it("renders the title and hint, and calls onToggle when pressed", () => {
    const onToggle = jest.fn();
    render(
      <ChoreChecklistItem
        title="Re opp sengen"
        hint="Hver morgen"
        completed={false}
        onToggle={onToggle}
      />
    );
    expect(screen.getByText("Re opp sengen")).toBeTruthy();
    expect(screen.getByText("Hver morgen")).toBeTruthy();
    fireEvent.press(screen.getByText("Re opp sengen"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
