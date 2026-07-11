import { describe, expect, it, jest } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { PengerList } from "./PengerList";

describe("PengerList", () => {
  it("renders the split amounts and calls onTogglePaid per party", () => {
    const onTogglePaid = jest.fn();
    render(
      <PengerList
        items={[
          {
            id: "1",
            title: "Dugnad SFO",
            amountNok: 150,
            split: "50/50",
            dueDate: "2026-09-05",
            paidMamma: false,
            paidPappa: false,
          },
        ]}
        onTogglePaid={onTogglePaid}
      />
    );

    expect(screen.getByText("Dugnad SFO")).toBeTruthy();
    expect(screen.getByText("Mamma kr 75")).toBeTruthy();
    expect(screen.getByText("Pappa kr 75")).toBeTruthy();

    fireEvent.press(screen.getByText("Mamma kr 75"));
    expect(onTogglePaid).toHaveBeenCalledWith("1", "mamma", true);
  });

  it("renders nothing when there are no items", () => {
    const { toJSON } = render(<PengerList items={[]} onTogglePaid={jest.fn()} />);
    expect(toJSON()).toBeNull();
  });
});
