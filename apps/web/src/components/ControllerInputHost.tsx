import { useEffect } from "react";
import { useControllerEnabled } from "../input/controllerPreferences";
import { handleControllerAction, scrollControllerViewport } from "../input/controllerNavigation";
import { installGamepadInput } from "../input/gamepad";

export function ControllerInputHost() {
  const [enabled] = useControllerEnabled();
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- owns gamepad polling and connection listeners while controller input is enabled
  useEffect(() => {
    if (!enabled) return;
    const dispose = installGamepadInput(handleControllerAction, scrollControllerViewport);
    const clearFocus = (event?: Event) => {
      if (event && !event.isTrusted) return;
      delete document.documentElement.dataset.controllerNavigation;
    };
    window.addEventListener("pointerdown", clearFocus);
    window.addEventListener("keydown", clearFocus);
    return () => {
      dispose();
      clearFocus();
      window.removeEventListener("pointerdown", clearFocus);
      window.removeEventListener("keydown", clearFocus);
    };
  }, [enabled]);
  return null;
}
