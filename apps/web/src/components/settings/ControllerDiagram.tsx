import { useId } from "react";
import {
  CONTROLLER_ACTIONS,
  type ControllerBindings,
  type ControllerInput,
} from "../../input/controllerBindings";
import {
  controllerBindingsName,
  controllerButtonName,
  type ControllerFamily,
} from "../../input/controllerDevice";

function controlPosition(
  input: ControllerInput | undefined,
  family: ControllerFamily,
): [number, number] {
  const symmetric = family === "playstation";
  const steam = family === "steam";
  if (!input) return [360, 245];
  if (input.kind === "axis") {
    return input.index < 2
      ? [symmetric ? 310 : steam ? 294 : 277, symmetric || steam ? 310 : 238]
      : [steam ? 444 : 412, steam ? 238 : 310];
  }
  const positions: [number, number][] = [
    ...(steam
      ? ([
          [382, 295],
          [403, 274],
          [361, 274],
          [382, 253],
        ] as [number, number][])
      : ([
          [446, 270],
          [469, 246],
          [423, 246],
          [446, 222],
        ] as [number, number][])),
    [269, 169],
    [451, 169],
    [264, 147],
    [456, 147],
    [335, 239],
    [385, 239],
    [symmetric ? 310 : steam ? 294 : 277, symmetric || steam ? 310 : 238],
    [steam ? 444 : 412, steam ? 238 : 310],
    [symmetric ? 272 : steam ? 276 : 319, symmetric || steam ? 231 : 293],
    [symmetric ? 272 : steam ? 276 : 319, symmetric || steam ? 261 : 323],
    [symmetric ? 257 : steam ? 261 : 304, symmetric || steam ? 246 : 308],
    [symmetric ? 287 : steam ? 291 : 334, symmetric || steam ? 246 : 308],
    [360, 208],
    [360, 205],
  ];
  return positions[input.index] ?? [360, 330];
}

export function ControllerDiagram({
  family,
  name,
  bindings,
  connected,
}: {
  family: ControllerFamily;
  name: string;
  bindings: ControllerBindings;
  connected: boolean;
}) {
  const titleId = useId();
  const symmetric = family === "playstation";
  const steam = family === "steam";
  const nintendo = family === "nintendo";
  const leftStick: [number, number] = symmetric ? [310, 310] : steam ? [294, 305] : [277, 238];
  const rightStick: [number, number] = [steam ? 444 : 412, steam ? 238 : 310];
  const dpad: [number, number] = symmetric ? [272, 246] : [319, 308];
  const faceLabels =
    family === "playstation"
      ? ["×", "○", "□", "△"]
      : family === "generic"
        ? ["1", "2", "3", "4"]
        : nintendo
          ? ["B", "A", "Y", "X"]
          : ["A", "B", "X", "Y"];
  const faceColors =
    family === "xbox" || steam
      ? ["#73c991", "#f48771", "#75beff", "#e5c07b"]
      : ["currentColor", "currentColor", "currentColor", "currentColor"];
  const callouts = [
    { action: "thread.previous", x: 18, y: 80, side: "left" },
    { action: "up", x: 18, y: 151, side: "left" },
    { action: "left", x: 18, y: 222, side: "left" },
    { action: "down", x: 18, y: 293, side: "left" },
    { action: "scroll.up", x: 18, y: 364, side: "left" },
    { action: "thread.next", x: 550, y: 80, side: "right" },
    { action: "activate", x: 550, y: 151, side: "right" },
    { action: "back", x: 550, y: 222, side: "right" },
    { action: "right", x: 550, y: 293, side: "right" },
    { action: "scroll.down", x: 550, y: 364, side: "right" },
  ] as const;
  return (
    <figure
      className="overflow-hidden rounded-lg border border-border/70 bg-muted/20"
      data-controller-family={family}
    >
      <svg
        viewBox="0 0 720 438"
        role="img"
        aria-labelledby={titleId}
        fill="currentColor"
        className="h-auto w-full text-muted-foreground"
      >
        <title id={titleId}>
          {connected ? `${name} layout` : "Connect a controller to see its layout"}
        </title>
        <g opacity={connected ? 1 : 0.45}>
          <g fill="var(--muted)" stroke="var(--muted-foreground)" strokeWidth="1.5">
            <path
              d={
                symmetric
                  ? "M244 179 Q231 153 260 149 L460 149 Q489 153 476 179 L514 331 Q524 379 490 378 Q473 378 433 340 L287 340 Q247 378 230 378 Q196 379 206 331 Z"
                  : "M240 181 Q232 151 265 147 L455 147 Q488 151 480 181 L514 330 Q528 384 489 377 Q470 373 434 337 L286 337 Q250 373 231 377 Q192 384 206 330 Z"
              }
            />
            <path d="M242 183 Q359 163 478 183" fill="none" strokeOpacity="0.5" />
            <rect x="245" y="157" width="48" height="19" rx="8" />
            <rect x="427" y="157" width="48" height="19" rx="8" />
            <rect x="247" y="131" width="34" height="15" rx="6" />
            <rect x="439" y="131" width="34" height="15" rx="6" />
            {symmetric && (
              <rect x="314" y="185" width="92" height="42" rx="7" fill="var(--background)" />
            )}
            {steam && <circle cx="276" cy="236" r="37" fill="var(--background)" />}
            {[leftStick, rightStick].map(([x, y], index) => (
              <g key={`${x}:${y}`}>
                <circle cx={x} cy={y} r={steam && index === 1 ? 37 : 29} fill="var(--background)" />
                <circle cx={x} cy={y} r={steam && index === 1 ? 30 : 21} strokeOpacity="0.6" />
                {!(steam && index === 1) && (
                  <circle cx={x} cy={y} r="15" fill="var(--background)" />
                )}
              </g>
            ))}
            {!steam && (
              <path
                d={`M${dpad[0] - 9} ${dpad[1] - 25} h18 v16 h16 v18 h-16 v16 h-18 v-16 h-16 v-18 h16 Z`}
                fill="var(--background)"
              />
            )}
            <circle cx="335" cy="239" r="9" fill="var(--background)" />
            <circle cx="385" cy="239" r="9" fill="var(--background)" />
            {!symmetric && <circle cx="360" cy="208" r="12" fill="var(--background)" />}
            {(!steam
              ? [
                  [446, 270],
                  [469, 246],
                  [423, 246],
                  [446, 222],
                ]
              : [
                  [382, 295],
                  [403, 274],
                  [361, 274],
                  [382, 253],
                ]
            ).map(([x, y], index) => (
              <g key={`${x}:${y}`}>
                <circle cx={x} cy={y} r="13" fill="var(--background)" />
                <text
                  x={x}
                  y={(y ?? 0) + 5}
                  textAnchor="middle"
                  stroke="none"
                  fill={faceColors[index]}
                  fontSize="16"
                  fontWeight="600"
                >
                  {faceLabels[index]}
                </text>
              </g>
            ))}
          </g>
          <g fill="currentColor" fontSize="10" textAnchor="middle">
            <text x="269" y="170">
              {controllerButtonName(4, family)}
            </text>
            <text x="451" y="170">
              {controllerButtonName(5, family)}
            </text>
            <text x="264" y="142">
              {controllerButtonName(6, family)}
            </text>
            <text x="456" y="142">
              {controllerButtonName(7, family)}
            </text>
            <text x="335" y="242">
              {nintendo ? "−" : "▢"}
            </text>
            <text x="385" y="242">
              {nintendo ? "+" : "≡"}
            </text>
          </g>
        </g>
        {callouts.map(({ action, x, y, side }) => {
          const binding = bindings[action];
          const [controlX, controlY] = controlPosition(binding[0]?.at(-1), family);
          const text = controllerBindingsName(binding, family);
          return (
            <g key={action}>
              {binding.length > 0 && (
                <path
                  d={`M${side === "left" ? 170 : 542} ${y + 13} L${side === "left" ? 185 : 535} ${y + 13} L${controlX} ${controlY}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  opacity="0.3"
                />
              )}
              <text x={x} y={y} fill="var(--foreground)" fontSize="14" fontWeight="500">
                {CONTROLLER_ACTIONS.find((item) => item.action === action)?.label}
              </text>
              <text x={x} y={y + 20} fontSize="12">
                <title>{text}</title>
                {text.length > 25 ? `${text.slice(0, 23)}…` : text}
              </text>
            </g>
          );
        })}
        <g textAnchor="middle">
          <text x="360" y="35" fill="var(--foreground)" fontSize="14" fontWeight="500">
            Command palette
          </text>
          <text x="360" y="55" fontSize="12">
            {controllerBindingsName(bindings["commandPalette.toggle"], family)}
          </text>
          {bindings["commandPalette.toggle"].length > 0 && (
            <path
              d={`M360 65 L360 108 L${controlPosition(bindings["commandPalette.toggle"][0]?.at(-1), family).join(" ")}`}
              fill="none"
              stroke="currentColor"
              opacity="0.3"
            />
          )}
          <text x="360" y="416" fontSize="13">
            {connected ? name : "No controller connected"}
          </text>
        </g>
      </svg>
    </figure>
  );
}
