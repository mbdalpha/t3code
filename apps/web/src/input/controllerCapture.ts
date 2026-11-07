import { createControllerCapture, chordKey, type ControllerChord } from "./controllerBindings";
import { controllerKey } from "./controllerDevice";
import { readGamepads, suspendControllerNavigation } from "./gamepad";

export function installControllerCapture(
  selectedKey: string,
  onPreview: (armed: boolean, chord: ControllerChord) => void,
  onComplete: (chord: ControllerChord) => void,
  onCancel: () => void,
): () => void {
  const resume = suspendControllerNavigation();
  const capture = createControllerCapture();
  let frame: number | undefined;
  let disposed = false;
  let preview = "";
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (frame !== undefined) cancelAnimationFrame(frame);
    resume();
    window.removeEventListener("keydown", keydown, true);
    window.removeEventListener("blur", cancel);
    window.removeEventListener("gamepaddisconnected", disconnected);
    document.removeEventListener("visibilitychange", visibility);
  };
  const cancel = () => {
    dispose();
    onCancel();
  };
  const disconnected = () => {
    if (!readGamepads().some((pad) => controllerKey(pad) === selectedKey)) cancel();
  };
  const visibility = () => {
    if (document.visibilityState !== "visible") cancel();
  };
  const keydown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    cancel();
  };
  const tick = () => {
    const pad = readGamepads().find((candidate) => controllerKey(candidate) === selectedKey);
    if (
      !pad ||
      pad.mapping !== "standard" ||
      !document.hasFocus() ||
      document.visibilityState !== "visible"
    ) {
      cancel();
      return;
    }
    const result = capture(pad);
    if (result.complete) {
      dispose();
      onComplete(result.chord);
      return;
    }
    const nextPreview = `${result.armed}:${chordKey(result.chord)}`;
    if (nextPreview !== preview) {
      preview = nextPreview;
      onPreview(result.armed, result.chord);
    }
    if (!disposed) frame = requestAnimationFrame(tick);
  };
  window.addEventListener("keydown", keydown, true);
  window.addEventListener("blur", cancel);
  window.addEventListener("gamepaddisconnected", disconnected);
  document.addEventListener("visibilitychange", visibility);
  frame = requestAnimationFrame(tick);
  return dispose;
}
