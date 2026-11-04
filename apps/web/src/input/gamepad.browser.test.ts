import { expect, it, vi } from "vite-plus/test";
import { installGamepadInput } from "./gamepad";

function gamepad(pressed: number[] = [], scroll = 0): Gamepad {
  return {
    index: 0,
    id: "Test Xbox controller",
    connected: true,
    mapping: "standard",
    timestamp: 0,
    axes: [0, 0, 0, scroll],
    buttons: Array.from({ length: 17 }, (_, index) => ({
      pressed: pressed.includes(index),
      touched: false,
      value: pressed.includes(index) ? 1 : 0,
    })),
  } as unknown as Gamepad;
}

it("pauses on blur, hiding, and disconnection, and requires neutral controls before resuming", () => {
  let focused = true;
  let visibility: DocumentVisibilityState = "visible";
  let pads: Gamepad[] = [gamepad()];
  let nextId = 0;
  const callbacks = new Map<number, FrameRequestCallback>();
  using _focus = vi.spyOn(document, "hasFocus").mockImplementation(() => focused);
  using _visibility = vi
    .spyOn(document, "visibilityState", "get")
    .mockImplementation(() => visibility);
  using _pads = vi.spyOn(navigator, "getGamepads").mockImplementation(() => pads);
  using _request = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    callbacks.set(++nextId, callback);
    return nextId;
  });
  using _cancel = vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
    callbacks.delete(id);
  });
  const step = (now: number) => {
    const pending = [...callbacks.values()];
    callbacks.clear();
    for (const callback of pending) callback(now);
  };
  const action = vi.fn();
  const scroll = vi.fn();
  using cleanup = new DisposableStack();
  const dispose = installGamepadInput(action, scroll);
  cleanup.defer(dispose);

  step(0);
  pads = [gamepad([5], 1)];
  step(16);
  expect(action).toHaveBeenLastCalledWith("thread.next");
  expect(scroll).toHaveBeenLastCalledWith(14.4);
  step(800);
  expect(action).toHaveBeenCalledOnce();
  expect(scroll).toHaveBeenLastCalledWith(45);

  focused = false;
  window.dispatchEvent(new Event("blur"));
  expect(callbacks.size).toBe(0);
  focused = true;
  window.dispatchEvent(new Event("focus"));
  step(900);
  expect(action).toHaveBeenCalledOnce();
  pads = [gamepad()];
  step(910);
  pads = [gamepad([5])];
  step(920);
  expect(action).toHaveBeenCalledTimes(2);

  visibility = "hidden";
  document.dispatchEvent(new Event("visibilitychange"));
  expect(callbacks.size).toBe(0);
  visibility = "visible";
  document.dispatchEvent(new Event("visibilitychange"));
  step(930);
  expect(action).toHaveBeenCalledTimes(2);

  pads = [];
  window.dispatchEvent(new Event("gamepaddisconnected"));
  expect(callbacks.size).toBe(0);
  pads = [gamepad()];
  window.dispatchEvent(new Event("gamepadconnected"));
  step(940);
  pads = [gamepad([0])];
  step(950);
  expect(action).toHaveBeenLastCalledWith("activate");

  dispose();
  expect(callbacks.size).toBe(0);
  window.dispatchEvent(new Event("focus"));
  expect(callbacks.size).toBe(0);
});
