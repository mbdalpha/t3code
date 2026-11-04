import { describe, expect, it } from "vite-plus/test";
import { createGamepadReader } from "./gamepad";
import {
  assignControllerBinding,
  createControllerCapture,
  DEFAULT_CONTROLLER_BINDINGS,
} from "./controllerBindings";

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

  it("records a released chord and runs it without also triggering its individual buttons", () => {
    const capture = createControllerCapture();
    expect(capture(pad([0])).armed).toBe(false);
    expect(capture(pad()).armed).toBe(true);
    capture(pad([0]));
    capture(pad([0, 4]));
    expect(capture(pad([4])).complete).toBe(false);
    const result = capture(pad());
    expect(result.complete).toBe(true);
    const bindings = assignControllerBinding(
      DEFAULT_CONTROLLER_BINDINGS,
      "commandPalette.toggle",
      result.chord,
    );
    const reader = createGamepadReader(bindings);
    reader.read(pad(), 0);
    expect(reader.read(pad([4]), 10).actions).toEqual([]);
    expect(reader.read(pad([0, 4]), 20).actions).toEqual(["commandPalette.toggle"]);
    expect(reader.read(pad([4]), 30).actions).toEqual([]);
    expect(reader.read(pad(), 40).actions).toEqual([]);
    expect(reader.read(pad([0]), 50).actions).toEqual([]);
    expect(reader.read(pad(), 60).actions).toEqual(["activate"]);
    expect(reader.read(pad([4]), 70).actions).toEqual([]);
    expect(reader.read(pad(), 80).actions).toEqual(["thread.previous"]);

    const scrolling = assignControllerBinding(DEFAULT_CONTROLLER_BINDINGS, "scroll.down", [
      { kind: "button", index: 2 },
    ]);
    const scrollReader = createGamepadReader(
      assignControllerBinding(scrolling, "commandPalette.toggle", [
        { kind: "button", index: 2 },
        { kind: "button", index: 4 },
      ]),
    );
    scrollReader.read(pad(), 0);
    scrollReader.read(pad([4]), 10);
    expect(scrollReader.read(pad([2, 4]), 20)).toEqual({
      actions: ["commandPalette.toggle"],
      scroll: 0,
    });
    expect(scrollReader.read(pad([2]), 30)).toEqual({ actions: [], scroll: 0 });
    expect(scrollReader.read(pad([2]), 40)).toEqual({ actions: [], scroll: 0 });
    scrollReader.read(pad(), 50);
    expect(scrollReader.read(pad([2]), 60)).toEqual({ actions: [], scroll: 1 });
  });

  it("moves conflicting bindings, keeps other alternatives, and supports remapped analog and button scrolling", () => {
    const capture = createControllerCapture();
    capture(pad());
    capture(pad([], [0, 0.9, 0, 0]));
    const recorded = capture(pad());
    let bindings = assignControllerBinding(
      DEFAULT_CONTROLLER_BINDINGS,
      "scroll.down",
      recorded.chord,
    );
    expect(bindings.down).toEqual([[{ kind: "button", index: 13 }]]);
    bindings = assignControllerBinding(bindings, "scroll.up", [{ kind: "button", index: 0 }]);
    expect(bindings.activate).toEqual([]);
    const reader = createGamepadReader(bindings);
    reader.read(pad(), 0);
    const down = reader.read(pad([], [0, 0.6, 0, 0]), 10);
    expect(down.actions).toEqual([]);
    expect(down.scroll).toBeCloseTo(0.5);
    expect(reader.read(pad([0]), 20)).toEqual({ actions: [], scroll: -1 });
    expect(reader.read(pad([13]), 30).actions).toEqual(["down"]);
    const cleared = createGamepadReader(assignControllerBinding(bindings, "down", []));
    cleared.read(pad(), 0);
    expect(cleared.read(pad([13]), 10).actions).toEqual([]);
  });
});
