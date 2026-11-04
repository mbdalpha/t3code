import * as Schema from "effect/Schema";

const ControllerInput = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("button"),
    index: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  }),
  Schema.Struct({
    kind: Schema.Literal("axis"),
    index: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
    direction: Schema.Literals([-1, 1]),
  }),
]);
export type ControllerInput = typeof ControllerInput.Type;
export type ControllerChord = ReadonlyArray<ControllerInput>;

const Alternatives = Schema.Array(Schema.Array(ControllerInput));
export const ControllerBindings = Schema.Struct({
  activate: Alternatives,
  back: Alternatives,
  "thread.previous": Alternatives,
  "thread.next": Alternatives,
  "commandPalette.toggle": Alternatives,
  up: Alternatives,
  down: Alternatives,
  left: Alternatives,
  right: Alternatives,
  "scroll.up": Alternatives,
  "scroll.down": Alternatives,
});
export type ControllerBindings = typeof ControllerBindings.Type;
export type ControllerBindingAction = keyof ControllerBindings;
export type ControllerAction = Exclude<ControllerBindingAction, "scroll.up" | "scroll.down">;

export const CONTROLLER_ACTIONS = [
  { action: "up", label: "Move focus up" },
  { action: "down", label: "Move focus down" },
  { action: "left", label: "Move focus left" },
  { action: "right", label: "Move focus right" },
  { action: "activate", label: "Activate" },
  { action: "back", label: "Back / close" },
  { action: "thread.previous", label: "Previous thread" },
  { action: "thread.next", label: "Next thread" },
  { action: "commandPalette.toggle", label: "Command palette" },
  { action: "scroll.up", label: "Scroll up" },
  { action: "scroll.down", label: "Scroll down" },
] as const satisfies ReadonlyArray<{ action: ControllerBindingAction; label: string }>;

export const DEFAULT_CONTROLLER_BINDINGS: ControllerBindings = {
  activate: [[{ kind: "button", index: 0 }]],
  back: [[{ kind: "button", index: 1 }]],
  "thread.previous": [[{ kind: "button", index: 4 }]],
  "thread.next": [[{ kind: "button", index: 5 }]],
  "commandPalette.toggle": [[{ kind: "button", index: 9 }]],
  up: [[{ kind: "button", index: 12 }], [{ kind: "axis", index: 1, direction: -1 }]],
  down: [[{ kind: "button", index: 13 }], [{ kind: "axis", index: 1, direction: 1 }]],
  left: [[{ kind: "button", index: 14 }], [{ kind: "axis", index: 0, direction: -1 }]],
  right: [[{ kind: "button", index: 15 }], [{ kind: "axis", index: 0, direction: 1 }]],
  "scroll.up": [[{ kind: "axis", index: 3, direction: -1 }]],
  "scroll.down": [[{ kind: "axis", index: 3, direction: 1 }]],
};

export function inputKey(input: ControllerInput): string {
  return input.kind === "button" ? `b${input.index}` : `a${input.index}:${input.direction}`;
}

export function chordKey(chord: ControllerChord): string {
  return chord.map(inputKey).toSorted().join("+");
}

export function assignControllerBinding(
  bindings: ControllerBindings,
  action: ControllerBindingAction,
  chord: ControllerChord,
): ControllerBindings {
  const key = chordKey(chord);
  const result = { ...bindings };
  for (const { action: candidate } of CONTROLLER_ACTIONS) {
    result[candidate] =
      candidate === action
        ? chord.length > 0
          ? [chord]
          : []
        : bindings[candidate].filter((binding) => chordKey(binding) !== key);
  }
  return result;
}

export type ControllerPadState = Pick<Gamepad, "buttons" | "axes" | "mapping">;

export function isControllerNeutral(pad: ControllerPadState): boolean {
  return (
    !pad.buttons.some((button) => button.pressed) && pad.axes.every((axis) => Math.abs(axis) <= 0.2)
  );
}

export function readControllerInputs(pad: ControllerPadState): ControllerInput[] {
  const inputs: ControllerInput[] = [];
  pad.buttons.forEach((button, index) => {
    if (button.pressed) inputs.push({ kind: "button", index });
  });
  pad.axes.forEach((value, index) => {
    const other = pad.axes[index % 2 === 0 ? index + 1 : index - 1] ?? 0;
    if (
      Math.abs(value) > 0.6 &&
      (Math.abs(value) > Math.abs(other) ||
        (index % 2 === 1 && Math.abs(value) === Math.abs(other)))
    ) {
      inputs.push({ kind: "axis", index, direction: value < 0 ? -1 : 1 });
    }
  });
  return inputs;
}

export function createControllerCapture() {
  let armed = false;
  let captured: ControllerChord = [];
  return (pad: ControllerPadState) => {
    if (!armed) {
      armed = isControllerNeutral(pad);
      return { armed, chord: captured, complete: false };
    }
    const inputs = readControllerInputs(pad);
    if (inputs.length >= captured.length && inputs.length > 0) captured = inputs;
    return { armed, chord: captured, complete: captured.length > 0 && isControllerNeutral(pad) };
  };
}
