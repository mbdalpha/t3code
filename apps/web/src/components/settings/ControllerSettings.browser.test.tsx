import { expect, it, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";
import { act, render } from "../../../test/render";
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
