import { Gamepad2Icon, PencilIcon, RotateCcwIcon, XIcon } from "lucide-react";
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
import { ControllerDiagram } from "./ControllerDiagram";
import { SettingsRow, SettingsSection } from "./settingsLayout";
import { searchableSetting } from "./settingsSearch";

const BINDING_GROUPS = [
  { label: "Actions", actions: ["activate", "back", "commandPalette.toggle"] },
  { label: "Navigation", actions: ["up", "down", "left", "right"] },
  { label: "Threads", actions: ["thread.previous", "thread.next"] },
  { label: "Scrolling", actions: ["scroll.up", "scroll.down"] },
] as const;

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
        description="Navigate and use shortcuts with a controller. Saved on this device."
        control={
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            disabled={!available}
            aria-label="Enable controller input"
          />
        }
      />
      <div className="space-y-5 px-3 py-4 text-sm text-muted-foreground sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/50 text-foreground">
              <Gamepad2Icon className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-foreground">
                {pad ? device.name : "No controller connected"}
              </p>
              <p role="status" className="mt-1 flex items-center gap-1.5 text-xs">
                <span
                  aria-hidden="true"
                  className={`size-1.5 shrink-0 rounded-full ${editable && enabled ? "bg-success" : "bg-muted-foreground/60"}`}
                />
                {pad
                  ? !editable
                    ? "Unsupported mapping"
                    : enabled
                      ? "Connected"
                      : "Connected · Input paused"
                  : "Waiting for a controller"}
              </p>
            </div>
          </div>
          {pads.length > 1 && (
            <div className="w-44">
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
        {!available ? (
          <p className="text-xs">
            Controller input needs a browser with gamepad support and HTTPS or localhost.
          </p>
        ) : !pad ? (
          <p className="text-xs">
            Connect a controller, then press and release a button while this window is focused.
          </p>
        ) : !editable ? (
          <p className="text-xs">Select a Gamepad layout in Steam Input to use this controller.</p>
        ) : null}
        <ControllerDiagram
          family={device.family}
          name={device.name}
          bindings={bindings}
          connected={Boolean(pad)}
        />
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 className="font-medium text-foreground">Controller bindings</h4>
              <p className="mt-1 text-xs">
                Click a binding, press your controls, then release to save.
              </p>
            </div>
            <Button
              variant="ghost-muted"
              size="xs"
              disabled={!editable || Boolean(recording)}
              onClick={() => {
                saveBindings(DEFAULT_CONTROLLER_BINDINGS);
                setMessage("Default controller bindings restored.");
              }}
            >
              <RotateCcwIcon aria-hidden="true" />
              Reset defaults
            </Button>
          </div>
          <div className="space-y-4">
            {BINDING_GROUPS.map((group) => (
              <section key={group.label} aria-label={group.label}>
                <h5 className="mb-2 px-1 text-xs font-medium text-muted-foreground">
                  {group.label}
                </h5>
                <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70">
                  {group.actions.map((action) => {
                    const label = CONTROLLER_ACTIONS.find((item) => item.action === action)!.label;
                    const listening = recording?.action === action;
                    return (
                      <div key={action} className={listening ? "bg-primary/5" : undefined}>
                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-2.5">
                          <span className="text-foreground">{label}</span>
                          <div className="flex min-w-0 max-w-full items-center gap-2">
                            <button
                              type="button"
                              className="group/binding flex min-h-8 min-w-0 items-center gap-2.5 rounded-md border border-input bg-background/60 px-2.5 py-1 text-left text-xs text-foreground outline-none hover:border-ring/50 hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-default disabled:opacity-50 aria-pressed:border-primary/60 aria-pressed:text-primary aria-pressed:opacity-100"
                              aria-label={`Rebind ${label}`}
                              aria-pressed={listening}
                              data-keybinding-capture={listening ? "true" : undefined}
                              disabled={!editable || Boolean(recording)}
                              onClick={() => {
                                setMessage("");
                                setPreview({ armed: false, chord: [] });
                                setRecording({ action, key: activeKey });
                              }}
                            >
                              <span className="min-w-0 break-words">
                                {listening
                                  ? "Listening…"
                                  : controllerBindingsName(bindings[action], device.family)}
                              </span>
                              <PencilIcon
                                className="size-3 shrink-0 text-muted-foreground/60 group-hover/binding:text-foreground"
                                aria-hidden="true"
                              />
                            </button>
                            <Button
                              variant="ghost-muted"
                              size="icon-xs"
                              aria-label={`Clear ${label}`}
                              title={`Clear ${label}`}
                              disabled={
                                !editable || Boolean(recording) || bindings[action].length === 0
                              }
                              onClick={() => {
                                saveBindings({ ...bindings, [action]: [] });
                                setMessage(`${label} is now unbound.`);
                              }}
                            >
                              <XIcon aria-hidden="true" />
                            </Button>
                          </div>
                        </div>
                        {listening && (
                          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-primary/15 px-3 py-3">
                            <div
                              role="status"
                              aria-live="polite"
                              className="min-w-0 text-xs text-foreground"
                            >
                              <p className="font-medium">Recording {label.toLowerCase()}</p>
                              <p className="mt-1 text-muted-foreground">
                                {!preview.armed
                                  ? "Release all controls to start."
                                  : preview.chord.length > 0
                                    ? `${controllerChordName(preview.chord, device.family)}. Release all controls to save.`
                                    : "Press controller buttons or move a stick. Escape cancels."}
                              </p>
                            </div>
                            <Button variant="outline" size="xs" onClick={() => cancel()}>
                              Cancel recording
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
          <p role="status" aria-live="polite" className="text-xs">
            {message || "Saved on this device, separately for each controller type."}
          </p>
        </div>
        <details className="group border-t border-border/60 pt-3 text-xs">
          <summary className="cursor-pointer py-1 text-foreground outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
            Controller details & tips
          </summary>
          <div className="mt-3 space-y-3 leading-relaxed">
            {pad && (
              <p className="break-words">
                {pad.id}. Steam Input may report a virtual Xbox controller.
              </p>
            )}
            <p>
              Bindings can use a button, a stick direction, or a combination. Assigning the same
              binding to another action moves it there. Left/right leaves vertical lists. Release
              the controls after connecting or switching windows.
            </p>
            <div>
              <p className="mb-1 font-medium text-foreground">Set up Steam Input</p>
              <p>
                Add T3 Code as a non-Steam game and launch it through Steam. Enable Steam Input and
                select a Gamepad layout. Map trackpads to the D-pad or right joystick, or use a
                trackpad as a mouse.
              </p>
            </div>
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
