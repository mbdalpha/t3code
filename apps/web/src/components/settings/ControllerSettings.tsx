import { useEffect, useEffectEvent, useState } from "react";
import {
  assignControllerBinding,
  CONTROLLER_ACTIONS,
  DEFAULT_CONTROLLER_BINDINGS,
  type ControllerBindingAction,
  type ControllerBindings,
  type ControllerChord,
} from "../../input/controllerBindings";
import { installControllerCapture } from "../../input/controllerCapture";
import {
  controllerBindingsName,
  controllerChordName,
  controllerKey,
  controllerProfileKey,
  identifyController,
  selectController,
} from "../../input/controllerDevice";
import {
  bindingsForController,
  useControllerEnabled,
  useControllerProfiles,
  useSelectedController,
} from "../../input/controllerPreferences";
import { useControllerDevices } from "../../input/useControllerDevices";
import { Button } from "../ui/button";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { SettingsRow, SettingsSection } from "./settingsLayout";
import { searchableSetting } from "./settingsSearch";

export function ControllerSettings() {
  const [enabled, setEnabled] = useControllerEnabled();
  const pads = useControllerDevices();
  const [selectedKey, setSelectedKey] = useSelectedController();
  const [profiles, setProfiles] = useControllerProfiles();
  const [recording, setRecording] = useState<{ action: ControllerBindingAction; key: string }>();
  const [preview, setPreview] = useState<{ armed: boolean; chord: ControllerChord }>({
    armed: false,
    chord: [],
  });
  const [message, setMessage] = useState("");
  const pad = selectController(pads, selectedKey);
  const activeKey = pad ? controllerKey(pad) : "";
  const device = pad ? identifyController(pad.id) : { family: "generic" as const, name: "Gamepad" };
  const bindings = pad ? bindingsForController(profiles, pad) : DEFAULT_CONTROLLER_BINDINGS;
  const available = window.isSecureContext && typeof navigator.getGamepads === "function";
  const editable = available && pad?.mapping === "standard";

  const saveBindings = (next: ControllerBindings) => {
    if (!pad) return;
    setProfiles((previous) => ({ ...previous, [controllerProfileKey(pad)]: next }));
  };
  const complete = useEffectEvent((chord: ControllerChord) => {
    setRecording(undefined);
    if (!recording || !pad || recording.key !== controllerKey(pad)) return;
    saveBindings(assignControllerBinding(bindings, recording.action, chord));
    const label = CONTROLLER_ACTIONS.find(({ action }) => action === recording.action)?.label;
    setMessage(`${label} assigned to ${controllerChordName(chord, device.family)}.`);
  });
  const cancel = useEffectEvent(() => {
    setRecording(undefined);
    setMessage("Recording cancelled. Your binding has not changed.");
  });
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- captures physical controller input while the selected binding is being recorded
  useEffect(() => {
    if (!recording) return;
    return installControllerCapture(
      recording.key,
      (armed, chord) => setPreview({ armed, chord }),
      complete,
      cancel,
    );
  }, [recording]);

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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">
              {pad ? device.name : "No controller connected"}
            </p>
            <p role="status" className="mt-1 break-words text-xs">
              {!available
                ? "Controller input needs a browser with gamepad support and HTTPS or localhost."
                : pads.length === 0
                  ? "Connect a controller, then press and release a button while this window is focused."
                  : pad?.mapping === "standard"
                    ? `${pad.id} · ${enabled ? "Ready" : "Input disabled"}`
                    : `${pad?.id} · Unsupported mapping. Select a Gamepad layout in Steam Input.`}
            </p>
          </div>
          {pads.length > 1 && (
            <div className="w-48">
              <Select
                value={activeKey}
                onValueChange={(value) => {
                  if (value) {
                    setRecording(undefined);
                    setSelectedKey(value);
                    setMessage("");
                  }
                }}
                disabled={Boolean(recording)}
              >
                <SelectTrigger aria-label="Connected controller" size="sm">
                  <SelectValue>{`Controller ${(pad?.index ?? 0) + 1}`}</SelectValue>
                </SelectTrigger>
                <SelectPopup>
                  {pads.map((candidate) => (
                    <SelectItem
                      key={controllerKey(candidate)}
                      value={controllerKey(candidate)}
                    >{`${candidate.index + 1}. ${identifyController(candidate.id).name}`}</SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>
          )}
        </div>
        {pad && (
          <p className="text-xs">
            Detected from the device reported by your browser. Steam Input may report a virtual Xbox
            controller.
          </p>
        )}
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-medium text-foreground">Controller bindings</h4>
            <Button
              variant="outline"
              size="xs"
              disabled={!editable || Boolean(recording)}
              onClick={() => {
                saveBindings(DEFAULT_CONTROLLER_BINDINGS);
                setMessage("Default controller bindings restored.");
              }}
            >
              Reset defaults
            </Button>
          </div>
          <p className="text-xs">
            Click a binding, press a button or combination, then release to save. You can also move
            a stick. Assigning a control moves it from any other action that uses the same binding.
          </p>
          {recording && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-ring/50 bg-accent/30 p-3">
              <div role="status" aria-live="polite" className="text-foreground">
                <p className="font-medium">
                  Recording{" "}
                  {CONTROLLER_ACTIONS.find(
                    ({ action }) => action === recording.action,
                  )?.label.toLowerCase()}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {!preview.armed
                    ? "Release all controls to start."
                    : preview.chord.length > 0
                      ? `${controllerChordName(preview.chord, device.family)}. Release all controls to save.`
                      : "Press controller buttons or move a stick. Escape cancels."}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => cancel()}>
                Cancel recording
              </Button>
            </div>
          )}
          <div className="divide-y divide-border rounded-lg border border-border">
            {CONTROLLER_ACTIONS.map(({ action, label }) => (
              <div
                key={action}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
              >
                <span className="text-foreground">{label}</span>
                <div className="flex max-w-full items-center gap-1.5">
                  <Button
                    variant={recording?.action === action ? "secondary" : "outline"}
                    size="sm-multiline"
                    aria-label={`Rebind ${label}`}
                    aria-pressed={recording?.action === action}
                    data-keybinding-capture={recording?.action === action ? "true" : undefined}
                    disabled={!editable || Boolean(recording)}
                    onClick={() => {
                      setMessage("");
                      setPreview({ armed: false, chord: [] });
                      setRecording({ action, key: activeKey });
                    }}
                  >
                    {recording?.action === action
                      ? "Listening…"
                      : controllerBindingsName(bindings[action], device.family)}
                  </Button>
                  <Button
                    variant="ghost-muted"
                    size="xs"
                    aria-label={`Clear ${label}`}
                    disabled={!editable || Boolean(recording) || bindings[action].length === 0}
                    onClick={() => {
                      saveBindings({ ...bindings, [action]: [] });
                      setMessage(`${label} is now unbound.`);
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <p role="status" aria-live="polite" className="text-xs">
            {message ||
              "Bindings stay on this device and are saved separately for each reported controller type."}
          </p>
        </div>
        <p className="text-xs">
          Left/right leaves vertical lists. Release the controls after connecting or switching
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
