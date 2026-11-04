import { controllerKey } from "./controllerDevice";
import { readGamepads } from "./gamepad";

export interface ControllerLiveState {
  buttons: readonly { pressed: boolean; value: number }[];
  axes: readonly number[];
}

export function installControllerMonitor(
  selectedKey: string,
  onChange: (state: ControllerLiveState | null) => void,
): () => void {
  let frame: number | undefined;
  let previous = "";
  let disposed = false;
  const publish = (state: ControllerLiveState | null) => {
    const next = JSON.stringify(state);
    if (next === previous) return;
    previous = next;
    onChange(state);
  };
  const stop = () => {
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
    publish(null);
  };
  const tick = () => {
    frame = undefined;
    const pad = readGamepads().find((candidate) => controllerKey(candidate) === selectedKey);
    if (
      !pad ||
      pad.mapping !== "standard" ||
      !document.hasFocus() ||
      document.visibilityState !== "visible"
    ) {
      stop();
      return;
    }
    const round = (value: number, minimum: number) =>
      Number.isFinite(value) ? Math.round(Math.max(minimum, Math.min(1, value)) * 100) / 100 : 0;
    publish({
      buttons: pad.buttons.map(({ pressed, value }) => ({ pressed, value: round(value, 0) })),
      axes: pad.axes.map((value) => round(value, -1)),
    });
    if (!disposed) frame = requestAnimationFrame(tick);
  };
  const refresh = () => {
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
    tick();
  };
  window.addEventListener("focus", refresh);
  window.addEventListener("blur", stop);
  window.addEventListener("gamepadconnected", refresh);
  window.addEventListener("gamepaddisconnected", refresh);
  document.addEventListener("visibilitychange", refresh);
  tick();
  return () => {
    disposed = true;
    if (frame !== undefined) cancelAnimationFrame(frame);
    window.removeEventListener("focus", refresh);
    window.removeEventListener("blur", stop);
    window.removeEventListener("gamepadconnected", refresh);
    window.removeEventListener("gamepaddisconnected", refresh);
    document.removeEventListener("visibilitychange", refresh);
  };
}
