import { useEffect, useEffectEvent } from "react";
import {
  bindingsForController,
  useControllerEnabled,
  useControllerProfiles,
  useSelectedController,
} from "../input/controllerPreferences";
import { handleControllerAction, scrollControllerViewport } from "../input/controllerNavigation";
import { installGamepadInput } from "../input/gamepad";

export function ControllerInputHost() {
  const [enabled] = useControllerEnabled();
  const [profiles] = useControllerProfiles();
  const [selectedKey] = useSelectedController();
  const getBindings = useEffectEvent((pad: Gamepad) =>
    bindingsForController(profiles, {
      index: pad.index,
      mapping: pad.mapping,
      id: pad.id,
      buttons: pad.buttons.length,
      axes: pad.axes.length,
    }),
  );
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- owns gamepad polling and connection listeners while controller input is enabled
  useEffect(() => {
    if (!enabled) return;
    const dispose = installGamepadInput(handleControllerAction, scrollControllerViewport, {
      selectedKey,
      getBindings,
    });
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
  }, [enabled, selectedKey]);
  return null;
}
