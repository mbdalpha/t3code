import { useEffect, useState } from "react";
import { useControllerEnabled } from "../../input/controllerPreferences";
import { readGamepads } from "../../input/gamepad";
import { Switch } from "../ui/switch";
import { SettingsRow, SettingsSection } from "./settingsLayout";
import { searchableSetting } from "./settingsSearch";

export function ControllerSettings() {
  const [enabled, setEnabled] = useControllerEnabled();
  const [pads, setPads] = useState(readGamepads);
  const available = window.isSecureContext && typeof navigator.getGamepads === "function";
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- refreshes detected controllers on browser connection and focus events
  useEffect(() => {
    const refresh = () => setPads(readGamepads());
    window.addEventListener("gamepadconnected", refresh);
    window.addEventListener("gamepaddisconnected", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("gamepadconnected", refresh);
      window.removeEventListener("gamepaddisconnected", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return (
    <SettingsSection {...searchableSetting("controller-input")}>
      <SettingsRow
        title="Enable controller input"
        description="Use a controller in this web or desktop client. This setting stays on this device."
        control={
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            disabled={!available}
            aria-label="Enable controller input"
          />
        }
      />
      <div className="space-y-3 px-3 py-3 text-sm text-muted-foreground sm:px-4">
        <p role="status">
          {!available
            ? "Controller input needs a browser with gamepad support and HTTPS or localhost."
            : pads.length === 0
              ? "Connect a controller, then press and release a button while this window is focused."
              : pads
                  .map((pad) =>
                    pad.mapping === "standard"
                      ? `${pad.id}: ready`
                      : `${pad.id}: unsupported mapping. Use a standard gamepad profile in Steam Input.`,
                  )
                  .join(" ")}
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            D-pad or left stick moves focus. Left/right leaves vertical lists. A activates a
            control.
          </li>
          <li>B closes a menu or dialog, or goes back.</li>
          <li>LB and RB switch threads. The right stick scrolls.</li>
          <li>Menu opens the command palette.</li>
        </ul>
        <p>
          Controls use Xbox button names. Release the controls after connecting or switching
          windows.
        </p>
        <details>
          <summary className="cursor-pointer text-foreground">Set up Steam Input</summary>
          <div className="mt-2 space-y-2">
            <p>
              Add the T3 Code desktop executable as a non-Steam game and launch it through Steam.
              Enable Steam Input and select a Gamepad layout. Map trackpads to the D-pad or right
              joystick, or use a trackpad as a mouse.
            </p>
            <p>
              Give each button one output to avoid duplicate actions. A keyboard and mouse layout
              can use your existing shortcuts with controller input turned off.
            </p>
          </div>
        </details>
      </div>
    </SettingsSection>
  );
}
