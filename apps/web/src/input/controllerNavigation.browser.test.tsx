import { expect, it, vi } from "vite-plus/test";
import { act, render } from "../../test/render";
import { registerCommands } from "../shortcuts/dispatcher";
import { handleControllerAction, scrollControllerViewport } from "./controllerNavigation";

it("moves focus past disabled controls and activates the selected control", async () => {
  const activate = vi.fn();
  await using screen = await render(
    <div role="dialog">
      <button>First</button>
      <button disabled>Unavailable</button>
      <div role="tree">
        <button onClick={activate}>Last</button>
      </div>
    </div>,
  );
  const first = screen.container.querySelector<HTMLButtonElement>("button")!;
  first.focus();
  handleControllerAction("down");
  expect(document.activeElement?.textContent).toBe("Last");
  await act(() => handleControllerAction("activate"));
  expect(activate).toHaveBeenCalledOnce();
  handleControllerAction("right");
  expect(document.activeElement).toBe(first);
});

it.each(["up", "down", "left", "right"] as const)(
  "leaves an empty, closed combobox when moving %s",
  async (direction) => {
    await using screen = await render(
      <div role="dialog">
        <button>Before</button>
        <input role="combobox" aria-expanded="false" />
        <button>After</button>
      </div>,
    );
    screen.container.querySelector<HTMLInputElement>("input")!.focus();
    handleControllerAction(direction);
    expect(document.activeElement?.textContent).toBe(
      direction === "up" || direction === "left" ? "Before" : "After",
    );
  },
);

it("keeps navigation and app actions inside the top dialog, including when focus is outside it", async () => {
  const background = vi.fn();
  const dismiss = vi.fn();
  await using screen = await render(
    <>
      <button>Background</button>
      <div role="alertdialog" onKeyDown={(event) => event.key === "Escape" && dismiss()}>
        <button>Cancel</button>
        <button>Confirm</button>
      </div>
    </>,
  );
  using stack = new DisposableStack();
  stack.defer(
    registerCommands({
      "thread.next": background,
      "commandPalette.toggle": background,
      "navigation.back": background,
    }),
  );
  screen.container.querySelector<HTMLButtonElement>("button")!.focus();
  handleControllerAction("thread.next");
  handleControllerAction("activate");
  expect(document.activeElement?.textContent).toBe("Cancel");
  handleControllerAction("back");
  handleControllerAction("commandPalette.toggle");
  expect(dismiss).toHaveBeenCalledTimes(2);
  expect(background).not.toHaveBeenCalled();
});

it("sends navigation keys to an open picker and calls named actions outside it", async () => {
  const keys: string[] = [];
  const next = vi.fn();
  const palette = vi.fn();
  await using screen = await render(
    <>
      <input
        role="combobox"
        aria-expanded="true"
        onKeyDown={(event) => {
          keys.push(event.key);
          event.preventDefault();
        }}
      />
      <button>After picker</button>
    </>,
  );
  using stack = new DisposableStack();
  stack.defer(registerCommands({ "thread.next": next, "commandPalette.toggle": palette }));
  screen.container.querySelector<HTMLInputElement>("input")!.focus();
  handleControllerAction("down");
  handleControllerAction("activate");
  expect(keys).toEqual(["ArrowDown", "Enter"]);
  handleControllerAction("right");
  expect(document.activeElement?.textContent).toBe("After picker");
  expect(keys).toEqual(["ArrowDown", "Enter"]);
  handleControllerAction("thread.next");
  handleControllerAction("commandPalette.toggle");
  expect(next).toHaveBeenCalledOnce();
  expect(palette).toHaveBeenCalledOnce();
});

it("scrolls the dialog instead of the conversation behind it", async () => {
  await using screen = await render(
    <>
      <div data-workspace-area="conversation">
        <div data-controller-scroll style={{ height: 50, overflowY: "auto" }}>
          <div style={{ height: 500 }}>Conversation</div>
        </div>
      </div>
      <div role="dialog">
        <div data-slot="scroll-area-viewport" style={{ height: 50, overflowY: "auto" }}>
          <div style={{ height: 500 }}>Dialog content</div>
        </div>
      </div>
    </>,
  );
  scrollControllerViewport(40);
  expect(screen.container.querySelector('[data-slot="scroll-area-viewport"]')!.scrollTop).toBe(40);
  expect(screen.container.querySelector("[data-controller-scroll]")!.scrollTop).toBe(0);
});
