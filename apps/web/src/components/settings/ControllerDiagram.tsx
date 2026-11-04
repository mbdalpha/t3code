import { ActivityIcon, CheckIcon } from "lucide-react";
import { useEffect, useEffectEvent, useId, useState } from "react";
import {
  type ControllerBindingAction,
  type ControllerBindings,
} from "../../input/controllerBindings";
import {
  controllerBindingsName,
  controllerButtonName,
  type ControllerFamily,
} from "../../input/controllerDevice";
import { installControllerMonitor, type ControllerLiveState } from "../../input/controllerMonitor";
import { suspendControllerNavigation } from "../../input/gamepad";
import { Button } from "../ui/button";
import { controllerArtwork } from "./controllerArtwork";

export function ControllerDiagram({
  family,
  name,
  bindings,
  connected,
  selectedKey,
  recording,
}: {
  family: ControllerFamily;
  name: string;
  bindings: ControllerBindings;
  connected: boolean;
  selectedKey: string;
  recording: boolean;
}) {
  const artwork = controllerArtwork(family, name);
  const artworkMask = useId();
  const [live, setLive] = useState<ControllerLiveState | null>(null);
  const [testing, setTesting] = useState(false);
  const escape = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== "Escape" || recording) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    setTesting(false);
  });
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- sample physical inputs only while this controller diagram is mounted
  useEffect(() => {
    if (!selectedKey) return;
    return installControllerMonitor(selectedKey, (state) => {
      setLive(state);
      if (!state) setTesting(false);
    });
  }, [selectedKey]);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- a test session temporarily owns controller input and releases it on exit or unmount
  useEffect(() => {
    if (!testing) return;
    const resume = suspendControllerNavigation();
    window.addEventListener("keydown", escape, true);
    return () => {
      resume();
      window.removeEventListener("keydown", escape, true);
    };
  }, [testing]);

  const callout = (action: ControllerBindingAction, label: string) => (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-foreground">
        {controllerBindingsName(bindings[action], family)}
      </p>
    </div>
  );
  const highlight = (index: number, x: number, y: number, rx: number, ry = rx) => {
    const button = live?.buttons[index];
    const active = Boolean(button?.pressed || (button?.value ?? 0) > 0);
    return (
      <g
        key={index}
        data-controller-button={index}
        data-pressed={active}
        opacity={active ? 1 : 0}
        stroke="none"
      >
        <ellipse cx={x} cy={y} rx={rx} ry={ry} fillOpacity=".2" />
        <rect
          x={x - rx - 1}
          y={y - ry - 1}
          width={(rx + 1) * 2}
          height={(ry + 1) * 2}
          mask={`url(#${artworkMask})`}
        />
      </g>
    );
  };
  const [fx, fy, spacing, radius] = artwork.face;
  const [dx, dy, dSpacing, dRadius] = artwork.dpad;
  const pressed =
    live?.buttons.flatMap((button, index) =>
      button.pressed ? [controllerButtonName(index, family)] : [],
    ) ?? [];

  return (
    <figure
      className="@container overflow-hidden rounded-xl border border-border/60 bg-linear-to-b from-muted/40 to-muted/10"
      data-controller-family={family}
    >
      <figcaption className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 px-4 py-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium text-foreground">
            <ActivityIcon
              className={`size-3.5 ${live ? "text-primary" : "text-muted-foreground"}`}
              aria-hidden="true"
            />
            Live input
          </p>
          <p role="status" className="mt-1 text-xs text-muted-foreground">
            {testing
              ? "Shortcuts paused. Press controls freely. Escape finishes."
              : recording
                ? "Recording your binding. Release controls to save."
                : live
                  ? "Test inputs to pause shortcuts while you check your controller."
                  : selectedKey
                    ? "Focus this window to see controller input."
                    : "Connect a supported controller to see live input."}
          </p>
        </div>
        <Button
          variant={testing ? "default" : "outline"}
          size="xs"
          aria-pressed={testing}
          disabled={!live || recording}
          onClick={() => setTesting((value) => !value)}
        >
          {testing && <CheckIcon aria-hidden="true" />}
          {testing ? "Done testing" : "Test inputs"}
        </Button>
      </figcaption>
      <div className="grid grid-cols-2 items-center gap-x-4 gap-y-5 px-5 py-4 @min-[600px]:grid-cols-[minmax(0,1fr)_minmax(0,3.2fr)_minmax(0,1fr)] @min-[600px]:gap-x-4">
        <div className="order-2 space-y-5 @min-[600px]:order-1">
          {callout("thread.previous", "Previous thread")}
          {callout("commandPalette.toggle", "Command palette")}
        </div>
        <div className="relative order-1 col-span-2 mx-auto aspect-[10/7] w-full max-w-110 @min-[600px]:order-2 @min-[600px]:col-span-1">
          <img
            src={artwork.src}
            alt={connected ? `${name} layout` : "Connect a controller to see its layout"}
            className={`absolute inset-0 size-full object-contain invert dark:invert-0 ${connected ? "opacity-80" : "opacity-30"}`}
            draggable={false}
          />
          <svg
            viewBox="0 0 100 70"
            className="pointer-events-none absolute inset-0 size-full fill-current stroke-current text-primary"
            aria-hidden="true"
          >
            <defs>
              <mask id={artworkMask} x="0" y="0" width="100" height="70" maskUnits="userSpaceOnUse">
                <image href={artwork.src} width="100" height="70" />
              </mask>
            </defs>
            {highlight(0, fx, fy + spacing, radius)}
            {highlight(1, fx + spacing, fy, radius)}
            {highlight(2, fx - spacing, fy, radius)}
            {highlight(3, fx, fy - spacing, radius)}
            {highlight(12, dx, dy - dSpacing, dRadius)}
            {highlight(13, dx, dy + dSpacing, dRadius)}
            {highlight(14, dx - dSpacing, dy, dRadius)}
            {highlight(15, dx + dSpacing, dy, dRadius)}
            {artwork.buttons.map(([index, x, y, rx, ry]) => highlight(index, x, y, rx, ry))}
            {artwork.sticks.map(([x, y, r], index) => {
              const axisX = live?.axes[index * 2] ?? 0;
              const axisY = live?.axes[index * 2 + 1] ?? 0;
              const moved = axisX !== 0 || axisY !== 0;
              const cx = x + axisX * r * 0.65;
              const cy = y + axisY * r * 0.65;
              return (
                <g
                  key={`${x}:${y}`}
                  data-controller-stick={index}
                  data-x={axisX}
                  data-y={axisY}
                  opacity={live ? 1 : 0}
                >
                  {highlight(index + 10, x, y, r)}
                  <line x1={x} y1={y} x2={cx} y2={cy} strokeWidth=".6" />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={moved ? r * 0.35 : 0.55}
                    strokeWidth=".3"
                    fillOpacity={moved ? 0.8 : 0.5}
                  />
                </g>
              );
            })}
          </svg>
        </div>
        <div className="order-3 space-y-5">
          {callout("thread.next", "Next thread")}
          {callout("activate", "Activate")}
          {callout("back", "Back / close")}
        </div>
      </div>
      {selectedKey && (
        <div className="space-y-3 border-t border-border/40 px-4 py-3">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 @min-[600px]:grid-cols-4">
            {[0, 1].map((index) => (
              <div key={index}>
                <p className="mb-1.5 text-xs text-muted-foreground">
                  {index === 0
                    ? "Left stick"
                    : family === "steam" && name !== "Steam Deck"
                      ? "Right pad"
                      : "Right stick"}
                </p>
                <p
                  className="flex gap-3 font-mono text-xs tabular-nums text-foreground"
                  aria-label={`${index === 0 ? "Left" : "Right"} stick position`}
                >
                  <span>X {live ? (live.axes[index * 2] ?? 0).toFixed(2) : "n/a"}</span>
                  <span>Y {live ? (live.axes[index * 2 + 1] ?? 0).toFixed(2) : "n/a"}</span>
                </p>
              </div>
            ))}
            {[6, 7].map((index) => {
              const value = Math.round((live?.buttons[index]?.value ?? 0) * 100);
              const label = controllerButtonName(index, family);
              return (
                <div key={index}>
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span>{label}</span>
                    <span className="font-mono tabular-nums text-foreground">
                      {live ? `${value}%` : "n/a"}
                    </span>
                  </div>
                  <div
                    role="meter"
                    aria-label={`${label} pressure`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={value}
                    className="h-1.5 overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex min-h-7 items-center gap-3 border-t border-border/40 pt-2.5 text-xs">
            <span className="shrink-0 text-muted-foreground">Pressed</span>
            <output
              aria-label="Pressed controller buttons"
              aria-live="off"
              className="flex flex-wrap items-center gap-1.5 text-foreground"
            >
              {!live
                ? "Input paused"
                : pressed.length === 0
                  ? "None"
                  : pressed.map((label) => (
                      <span
                        key={label}
                        className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-medium text-primary"
                      >
                        {label}
                      </span>
                    ))}
            </output>
          </div>
        </div>
      )}
    </figure>
  );
}
