import { describe, expect, it } from "vite-plus/test";
import { createGamepadReader } from "./gamepad";

function pad(
  pressed: number[] = [],
  axes = [0, 0, 0, 0],
  mapping: GamepadMappingType = "standard",
) {
  return {
    mapping,
    axes,
    buttons: Array.from({ length: 17 }, (_, index) => ({
      pressed: pressed.includes(index),
      touched: pressed.includes(index),
      value: pressed.includes(index) ? 1 : 0,
    })),
  };
}

describe("gamepad reader", () => {
  it("waits for neutral input and triggers held action buttons once until released", () => {
    const reader = createGamepadReader();
    expect(reader.read(pad([0, 5]), 0).actions).toEqual([]);
    reader.read(pad(), 10);
    expect(reader.read(pad([0, 5, 9]), 20).actions).toEqual([
      "activate",
      "thread.next",
      "commandPalette.toggle",
    ]);
    expect(reader.read(pad([0, 5, 9]), 1000).actions).toEqual([]);
    reader.read(pad(), 1100);
    expect(reader.read(pad([0]), 1200).actions).toEqual(["activate"]);
  });

  it("repeats only navigation and chooses the dominant left-stick direction", () => {
    const reader = createGamepadReader();
    reader.read(pad(), 0);
    expect(reader.read(pad([1, 4, 12]), 10).actions).toEqual(["back", "thread.previous", "up"]);
    expect(reader.read(pad([1, 4, 12]), 409).actions).toEqual([]);
    expect(reader.read(pad([1, 4, 12]), 410).actions).toEqual(["up"]);
    expect(reader.read(pad([1, 4, 12]), 509).actions).toEqual([]);
    expect(reader.read(pad([1, 4, 12]), 510).actions).toEqual(["up"]);
    expect(reader.read(pad([], [0.9, 0.7, 0, 0]), 600).actions).toEqual(["right"]);
    expect(reader.read(pad([], [-0.8, 0, 0, 0]), 610).actions).toEqual(["left"]);
    expect(reader.read(pad([13]), 620).actions).toEqual(["down"]);
  });

  it("ignores drift and unsupported mappings, and scales right-stick scrolling", () => {
    const reader = createGamepadReader();
    reader.read(pad(), 0);
    expect(reader.read(pad([], [0.1, -0.1, 0, 0.2]), 10)).toEqual({ actions: [], scroll: 0 });
    expect(reader.read(pad([], [0, 0, 0, 0.6]), 20).scroll).toBeCloseTo(0.5);
    expect(reader.read(pad([], [0, 0, 0, -1]), 30).scroll).toBe(-1);
    expect(reader.read(pad([0], [0, 0, 0, 1], ""), 40)).toEqual({ actions: [], scroll: 0 });
  });
});
