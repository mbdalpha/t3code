import {
  DEFAULT_CONTROLLER_BINDINGS,
  inputKey,
  isControllerNeutral,
  readControllerInputs,
  type ControllerAction,
  type ControllerBindings,
  type ControllerPadState,
} from "./controllerBindings";
import { controllerKey, selectController } from "./controllerDevice";

export type { ControllerAction } from "./controllerBindings";

const DIRECTIONS = new Set<ControllerAction>(["up", "down", "left", "right"]);
let navigationSuspensions = 0;

export function suspendControllerNavigation(): () => void {
  navigationSuspensions++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    navigationSuspensions--;
  };
}

function deadZone(value: number): number {
  return Math.max(0, (value - 0.2) / 0.8);
}

export function createGamepadReader(bindings: ControllerBindings = DEFAULT_CONTROLLER_BINDINGS) {
  let armed = false;
  const held = new Map<ControllerAction, number>();
  const pending = new Set<number>();
  const consumed = new Set<number>();
  const entries = Object.entries(bindings).flatMap(([action, alternatives]) =>
    alternatives
      .filter((chord) => chord.length > 0)
      .map((chord) => ({
        action: action as keyof ControllerBindings,
        chord,
        keys: chord.map(inputKey),
      })),
  );
  const supersets = entries.map((entry) =>
    entries.flatMap((candidate, index) =>
      candidate.keys.length > entry.keys.length &&
      entry.keys.every((key) => candidate.keys.includes(key))
        ? [index]
        : [],
    ),
  );
  return {
    read(pad: ControllerPadState, now: number) {
      const actions: ControllerAction[] = [];
      if (pad.mapping !== "standard") return { actions, scroll: 0 };
      if (!armed) {
        armed = isControllerNeutral(pad);
        return { actions, scroll: 0 };
      }
      const pressed = new Set<ControllerAction>();
      const inputs = new Set(readControllerInputs(pad).map(inputKey));
      const amounts = entries.map(({ action, chord }) =>
        Math.min(
          ...chord.map((input) => {
            if (input.kind === "button") return pad.buttons[input.index]?.pressed ? 1 : 0;
            const value = (pad.axes[input.index] ?? 0) * input.direction;
            return action.startsWith("scroll.")
              ? deadZone(value)
              : inputs.has(inputKey(input))
                ? 1
                : 0;
          }),
        ),
      );
      let scroll = 0;
      entries.forEach((entry, index) => {
        const active = (amounts[index] ?? 0) > 0;
        const suppressed = supersets[index]?.some((superset) => (amounts[superset] ?? 0) > 0);
        if (suppressed) {
          consumed.add(index);
          pending.delete(index);
        }
        if (entry.action === "scroll.up" || entry.action === "scroll.down") {
          if (active && !suppressed && !consumed.has(index))
            scroll += (entry.action === "scroll.up" ? -1 : 1) * (amounts[index] ?? 0);
          if (!active) consumed.delete(index);
          return;
        }
        if (active && !suppressed && !consumed.has(index)) {
          if ((supersets[index]?.length ?? 0) > 0) pending.add(index);
          else pressed.add(entry.action);
        } else if (!active) {
          // A button that starts a chord waits for release, so its shorter binding cannot also fire.
          if (pending.delete(index) && !consumed.has(index)) actions.push(entry.action);
          consumed.delete(index);
        }
      });
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
      return { actions, scroll: Math.max(-1, Math.min(1, scroll)) };
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
  options: { selectedKey?: string; getBindings?: (pad: Gamepad) => ControllerBindings } = {},
): () => void {
  let disposed = false;
  let frame: number | undefined;
  let reader = createGamepadReader();
  let identity: string | undefined;
  let previousTime: number | undefined;
  let wasSuspended = false;
  const selectedPad = () => selectController(readGamepads(), options.selectedKey ?? "");

  const stop = () => {
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
    identity = undefined;
    previousTime = undefined;
  };
  const tick = (now: number) => {
    frame = undefined;
    if (document.visibilityState !== "visible" || !document.hasFocus()) {
      stop();
      return;
    }
    const pad = selectedPad();
    if (!pad || pad.mapping !== "standard") {
      stop();
      return;
    }
    const suspended = navigationSuspensions > 0;
    if (suspended || wasSuspended) {
      identity = undefined;
      previousTime = undefined;
    }
    wasSuspended = suspended;
    if (!suspended) {
      const bindings = options.getBindings?.(pad) ?? DEFAULT_CONTROLLER_BINDINGS;
      const nextIdentity = `${controllerKey(pad)}:${JSON.stringify(bindings)}`;
      if (identity !== nextIdentity) {
        reader = createGamepadReader(bindings);
        identity = nextIdentity;
        previousTime = undefined;
      }
      const elapsed = previousTime === undefined ? 0 : Math.min(50, now - previousTime);
      previousTime = now;
      const { actions, scroll } = reader.read(pad, now);
      for (const action of actions) onAction(action);
      if (scroll !== 0 && elapsed > 0) onScroll(scroll * elapsed * 0.9);
    }
    if (!disposed) frame = requestAnimationFrame(tick);
  };
  const start = () => {
    if (
      frame === undefined &&
      document.visibilityState === "visible" &&
      document.hasFocus() &&
      selectedPad()?.mapping === "standard"
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
  const detectionTimer = window.setInterval(start, 500);
  start();
  return () => {
    disposed = true;
    clearInterval(detectionTimer);
    stop();
    window.removeEventListener("gamepadconnected", refresh);
    window.removeEventListener("gamepaddisconnected", refresh);
    window.removeEventListener("focus", refresh);
    window.removeEventListener("blur", stop);
    document.removeEventListener("visibilitychange", refresh);
  };
}
