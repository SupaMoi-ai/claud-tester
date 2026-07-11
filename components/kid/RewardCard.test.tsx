import { describe, expect, it, jest } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { RewardCard } from "./RewardCard";

describe("RewardCard", () => {
  it("shows choice buttons and calls onChoose when unclaimed", () => {
    const onChoose = jest.fn();
    render(<RewardCard displayName="Ellie" claimedChoice={null} onChoose={onChoose} />);

    expect(screen.getByText("Godt jobba, Ellie")).toBeTruthy();
    fireEvent.press(screen.getByText("Skjermtid"));
    expect(onChoose).toHaveBeenCalledWith("screen");
  });

  it("shows the claimed choice instead of buttons once claimed", () => {
    render(<RewardCard displayName="Ellie" claimedChoice="play" onChoose={jest.fn()} />);
    expect(screen.getByText(/lek ute/)).toBeTruthy();
    expect(screen.queryByText("Skjermtid")).toBeNull();
  });
});
