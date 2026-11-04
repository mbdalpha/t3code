export type ControllerAction =
  | "up"
  | "down"
  | "left"
  | "right"
  | "activate"
  | "back"
  | "thread.previous"
  | "thread.next"
  | "commandPalette.toggle";

const BUTTON_ACTIONS = new Map<number, ControllerAction>([
  [0, "activate"],
  [1, "back"],
  [4, "thread.previous"],
  [5, "thread.next"],
  [9, "commandPalette.toggle"],
  [12, "up"],
  [13, "down"],
  [14, "left"],
  [15, "right"],
]);
const DIRECTIONS = new Set<ControllerAction>(["up", "down", "left", "right"]);
const DEAD_ZONE = 0.2;

type GamepadState = Pick<Gamepad, "buttons" | "axes" | "mapping">;

function deadZone(value: number): number {
  if (Math.abs(value) <= DEAD_ZONE) return 0;
  return (Math.sign(value) * (Math.abs(value) - DEAD_ZONE)) / (1 - DEAD_ZONE);
}

export function createGamepadReader() {
  let armed = false;
  const held = new Map<ControllerAction, number>();
  return {
    read(pad: GamepadState, now: number) {
      const actions: ControllerAction[] = [];
      if (pad.mapping !== "standard") return { actions, scroll: 0 };
      if (!armed) {
        armed =
          !pad.buttons.some((button) => button.pressed) &&
          pad.axes.every((axis) => Math.abs(axis) <= DEAD_ZONE);
        return { actions, scroll: 0 };
      }
      const pressed = new Set<ControllerAction>();
      for (const [index, action] of BUTTON_ACTIONS) {
        if (pad.buttons[index]?.pressed) pressed.add(action);
      }
      const x = pad.axes[0] ?? 0;
      const y = pad.axes[1] ?? 0;
      if (Math.abs(x) > 0.6 || Math.abs(y) > 0.6) {
        pressed.add(Math.abs(x) > Math.abs(y) ? (x < 0 ? "left" : "right") : y < 0 ? "up" : "down");
      }
      for (const action of held.keys()) {
        if (!pressed.has(action)) held.delete(action);
      }
      for (const action of pressed) {
        const nextRepeat = held.get(action);
        if (nextRepeat === undefined) {
          actions.push(action);
          held.set(action, now + 400);
        } else if (DIRECTIONS.has(action) && now >= nextRepeat) {
          actions.push(action);
          held.set(action, now + 100);
        }
      }
      return { actions, scroll: deadZone(pad.axes[3] ?? 0) };
    },
  };
}

export function readGamepads(): Gamepad[] {
  try {
    return [...navigator.getGamepads()].filter(
      (pad): pad is Gamepad => pad !== null && pad.connected,
    );
  } catch {
    // Browsers can deny gamepad access in insecure or policy-restricted contexts.
    return [];
  }
}

export function installGamepadInput(
  onAction: (action: ControllerAction) => void,
  onScroll: (pixels: number) => void,
): () => void {
  let disposed = false;
  let frame: number | undefined;
  let reader = createGamepadReader();
  let identity: string | undefined;
  let previousTime: number | undefined;

  const stop = () => {
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
    reader = createGamepadReader();
    identity = undefined;
    previousTime = undefined;
  };
  const tick = (now: number) => {
    frame = undefined;
    if (document.visibilityState !== "visible" || !document.hasFocus()) {
      stop();
      return;
    }
    const pad = readGamepads().find((candidate) => candidate.mapping === "standard");
    if (!pad) {
      stop();
      return;
    }
    const nextIdentity = `${pad.index}:${pad.id}`;
    if (identity !== nextIdentity) {
      reader = createGamepadReader();
      identity = nextIdentity;
      previousTime = undefined;
    }
    const elapsed = previousTime === undefined ? 0 : Math.min(50, now - previousTime);
    previousTime = now;
    const { actions, scroll } = reader.read(pad, now);
    for (const action of actions) onAction(action);
    if (scroll !== 0 && elapsed > 0) onScroll(scroll * elapsed * 0.9);
    if (!disposed) frame = requestAnimationFrame(tick);
  };
  const start = () => {
    if (
      frame === undefined &&
      document.visibilityState === "visible" &&
      document.hasFocus() &&
      readGamepads().some((pad) => pad.mapping === "standard")
    ) {
      frame = requestAnimationFrame(tick);
    }
  };
  const refresh = () => {
    stop();
    start();
  };
  window.addEventListener("gamepadconnected", refresh);
  window.addEventListener("gamepaddisconnected", refresh);
  window.addEventListener("focus", refresh);
  window.addEventListener("blur", stop);
  document.addEventListener("visibilitychange", refresh);
  start();
  return () => {
    disposed = true;
    stop();
    window.removeEventListener("gamepadconnected", refresh);
    window.removeEventListener("gamepaddisconnected", refresh);
    window.removeEventListener("focus", refresh);
    window.removeEventListener("blur", stop);
    document.removeEventListener("visibilitychange", refresh);
  };
}
