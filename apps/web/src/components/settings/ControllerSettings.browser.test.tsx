import { expect, it, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";
import { act, render } from "../../../test/render";
import { installGamepadInput } from "../../input/gamepad";
import { ControllerSettings } from "./ControllerSettings";

function controller(id = "Xbox Wireless Controller"): Gamepad {
  return {
    index: 0,
    id,
    connected: true,
    mapping: "standard",
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 18 }, () => ({ pressed: false, touched: false, value: 0 })),
  } as unknown as Gamepad;
}

it("saves recorded controls per controller type and cancels recording without replacing the binding", async () => {
  using cleanup = new DisposableStack();
  for (const key of ["t3code:controller-bindings-v1", "t3code:controller-selected"]) {
    const previous = localStorage.getItem(key);
    localStorage.removeItem(key);
    cleanup.defer(() =>
      previous === null ? localStorage.removeItem(key) : localStorage.setItem(key, previous),
    );
  }
  let pad = controller();
  let nextId = 0;
  const frames = new Map<number, FrameRequestCallback>();
  using _focus = vi.spyOn(document, "hasFocus").mockReturnValue(true);
  using _visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  using _pads = vi.spyOn(navigator, "getGamepads").mockImplementation(() => [pad]);
  using _request = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    frames.set(++nextId, callback);
    return nextId;
  });
  using _cancel = vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
    frames.delete(id);
  });
  const press = async (buttons: number[]) => {
    pad = {
      ...pad,
      buttons: pad.buttons.map((button, index) => ({
        ...button,
        pressed: buttons.includes(index),
        value: buttons.includes(index) ? 1 : 0,
      })),
    };
    await act(() => {
      const pending = [...frames.values()];
      frames.clear();
      for (const frame of pending) frame(0);
    });
  };
  await using screen = await render(<ControllerSettings />);
  await screen.getByRole("button", { name: "Rebind Activate", exact: true }).click();
  await press([]);
  await press([2]);
  await expect
    .element(screen.getByText("X. Release all controls to save.", { exact: true }))
    .toBeVisible();
  await press([]);
  await expect
    .element(screen.getByRole("button", { name: "Rebind Activate", exact: true }))
    .toHaveTextContent("X");
  await screen.rerender(<ControllerSettings key="remounted" />);
  await expect
    .element(screen.getByRole("button", { name: "Rebind Activate", exact: true }))
    .toHaveTextContent("X");

  await screen.getByRole("button", { name: "Rebind Activate", exact: true }).click();
  await press([]);
  await press([3]);
  await userEvent.keyboard("{Escape}");
  await expect
    .element(screen.getByRole("button", { name: "Rebind Activate", exact: true }))
    .toHaveTextContent("X");
  await expect
    .element(
      screen.getByText("Recording cancelled. Your binding has not changed.", { exact: true }),
    )
    .toBeVisible();

  pad = controller("DualSense Wireless Controller");
  await expect
    .element(screen.getByRole("button", { name: "Rebind Activate", exact: true }))
    .toHaveTextContent("Cross");
  pad = controller();
  await expect
    .element(screen.getByRole("button", { name: "Rebind Activate", exact: true }))
    .toHaveTextContent("X");
  await screen.getByRole("button", { name: "Clear Activate", exact: true }).click();
  await expect
    .element(screen.getByRole("button", { name: "Rebind Activate", exact: true }))
    .toHaveTextContent("Unbound");
  await screen.getByRole("button", { name: "Reset defaults", exact: true }).click();
  await expect
    .element(screen.getByRole("button", { name: "Rebind Activate", exact: true }))
    .toHaveTextContent("A");
});

it("shows live inputs from the selected controller and isolates test sessions from shortcuts", async () => {
  using cleanup = new DisposableStack();
  for (const key of ["t3code:controller-bindings-v1", "t3code:controller-selected"]) {
    const previous = localStorage.getItem(key);
    localStorage.removeItem(key);
    cleanup.defer(() =>
      previous === null ? localStorage.removeItem(key) : localStorage.setItem(key, previous),
    );
  }
  let pad = controller();
  let connected = true;
  let focused = true;
  let visibility: DocumentVisibilityState = "visible";
  let nextId = 0;
  const frames = new Map<number, FrameRequestCallback>();
  using _focus = vi.spyOn(document, "hasFocus").mockImplementation(() => focused);
  using _visibility = vi
    .spyOn(document, "visibilityState", "get")
    .mockImplementation(() => visibility);
  using _pads = vi
    .spyOn(navigator, "getGamepads")
    .mockImplementation(() => (connected ? [pad] : []));
  using _request = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    frames.set(++nextId, callback);
    return nextId;
  });
  using _cancel = vi
    .spyOn(window, "cancelAnimationFrame")
    .mockImplementation((id) => frames.delete(id));
  const step = async (buttons: number[] = [], axes = [0, 0, 0, 0], trigger = 0) => {
    pad = {
      ...pad,
      axes,
      buttons: pad.buttons.map((button, index) => ({
        ...button,
        pressed: buttons.includes(index),
        value: index === 6 ? trigger : buttons.includes(index) ? 1 : 0,
      })),
    };
    await act(() => {
      const pending = [...frames.values()];
      frames.clear();
      for (const frame of pending) frame(40);
    });
  };
  await using screen = await render(<ControllerSettings />);
  const actions = vi.fn();
  const scroll = vi.fn();
  using navigation = new DisposableStack();
  navigation.defer(installGamepadInput(actions, scroll));
  await step();
  await screen.getByRole("button", { name: "Test inputs", exact: true }).click();
  await step([0, 1, 4, 10, 12], [0.75, -0.5, -0.25, 0.8], 0.42);
  await expect
    .element(screen.getByRole("meter", { name: "LT pressure" }))
    .toHaveAttribute("aria-valuenow", "42");
  await expect
    .element(screen.getByLabelText("Pressed controller buttons"))
    .toHaveTextContent("ABLBLS clickD-pad up");
  await expect
    .element(screen.getByLabelText("Left stick position"))
    .toHaveTextContent("X 0.75Y -0.50");
  expect(
    screen.container.querySelector('[data-controller-button="0"]')?.getAttribute("data-pressed"),
  ).toBe("true");
  expect(
    screen.container.querySelector('[data-controller-stick="1"]')?.getAttribute("data-y"),
  ).toBe("0.8");
  expect(actions).not.toHaveBeenCalled();
  expect(scroll).not.toHaveBeenCalled();

  // Escape belongs to binding capture first, even when a test session is active.
  await step();
  await screen.getByRole("button", { name: "Rebind Activate", exact: true }).click();
  await step();
  await step([2]);
  await userEvent.keyboard("{Escape}");
  await expect
    .element(screen.getByRole("button", { name: "Rebind Activate", exact: true }))
    .toHaveTextContent("A");
  await expect
    .element(screen.getByRole("button", { name: "Done testing", exact: true }))
    .toBeVisible();
  await userEvent.keyboard("{Escape}");
  await step([2]);
  expect(actions).not.toHaveBeenCalled();
  await step();
  await step([0]);
  expect(actions).toHaveBeenLastCalledWith("activate");

  await screen.getByRole("button", { name: "Test inputs", exact: true }).click();
  await step([1], [1, 0, 0, 0]);
  focused = false;
  await act(() => window.dispatchEvent(new Event("blur")));
  await expect
    .element(screen.getByLabelText("Pressed controller buttons"))
    .toHaveTextContent("Input paused");
  expect(
    screen.container.querySelector('[data-controller-button="1"]')?.getAttribute("data-pressed"),
  ).toBe("false");
  expect(frames.size).toBe(0);
  focused = true;
  await act(() => window.dispatchEvent(new Event("focus")));
  await expect
    .element(screen.getByRole("button", { name: "Test inputs", exact: true }))
    .toBeEnabled();
  await step([1]);
  expect(actions).toHaveBeenCalledTimes(1);
  await step();

  await screen.getByRole("button", { name: "Test inputs", exact: true }).click();
  visibility = "hidden";
  await act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(frames.size).toBe(0);
  visibility = "visible";
  await act(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect
    .element(screen.getByRole("button", { name: "Test inputs", exact: true }))
    .toBeEnabled();

  await screen.getByRole("button", { name: "Test inputs", exact: true }).click();
  pad = controller("DualSense Wireless Controller");
  await act(() => window.dispatchEvent(new Event("gamepadconnected")));
  await step([0]);
  await expect
    .element(screen.getByLabelText("Pressed controller buttons"))
    .toHaveTextContent("Cross");
  await expect
    .element(screen.getByRole("button", { name: "Test inputs", exact: true }))
    .toBeEnabled();
  await step();
  await screen.getByRole("button", { name: "Test inputs", exact: true }).click();
  connected = false;
  await act(() => window.dispatchEvent(new Event("gamepaddisconnected")));
  await expect.element(screen.getByText("No controller connected", { exact: true })).toBeVisible();
  expect(frames.size).toBe(0);

  connected = true;
  await act(() => window.dispatchEvent(new Event("gamepadconnected")));
  await step();
  await screen.getByRole("button", { name: "Test inputs", exact: true }).click();
  await step([1]);
  await screen.unmount();
  const count = actions.mock.calls.length;
  await step([1]);
  expect(actions).toHaveBeenCalledTimes(count);
  await step();
  await step([1]);
  expect(actions).toHaveBeenLastCalledWith("back");
  navigation.dispose();
  expect(frames.size).toBe(0);
});
