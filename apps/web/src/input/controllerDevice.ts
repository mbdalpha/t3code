import type { ControllerChord, ControllerInput } from "./controllerBindings";

export type ControllerFamily = "xbox" | "playstation" | "nintendo" | "steam" | "generic";
export interface ControllerDevice {
  index: number;
  id: string;
  mapping: GamepadMappingType;
  buttons: number;
  axes: number;
}

export function identifyController(id: string): { family: ControllerFamily; name: string } {
  const value = id.toLowerCase();
  if (/steam|valve|28de/.test(value)) {
    return { family: "steam", name: /deck/.test(value) ? "Steam Deck" : "Steam Controller" };
  }
  if (/xbox|x-box|xinput|045e|microsoft/.test(value)) {
    return { family: "xbox", name: /360/.test(value) ? "Xbox 360 controller" : "Xbox controller" };
  }
  if (/dualsense|dualshock|playstation|054c|sony|^wireless controller(?:\s*\(|$)/.test(value)) {
    return {
      family: "playstation",
      name: /dualsense|0ce6|0df2/.test(value) ? "DualSense" : "PlayStation controller",
    };
  }
  if (/nintendo|switch|joy-con|057e/.test(value)) {
    return {
      family: "nintendo",
      name: /joy-con/.test(value) ? "Nintendo Joy-Con" : "Nintendo Switch Pro Controller",
    };
  }
  return { family: "generic", name: "Gamepad" };
}

export function controllerKey(pad: Pick<ControllerDevice, "index" | "id">): string {
  return JSON.stringify([pad.index, pad.id]);
}

export function controllerProfileKey(pad: ControllerDevice): string {
  return JSON.stringify([pad.id, pad.mapping, pad.buttons, pad.axes]);
}

export function selectController<T extends Pick<ControllerDevice, "index" | "id" | "mapping">>(
  pads: readonly T[],
  selectedKey: string,
): T | undefined {
  return (
    pads.find((pad) => controllerKey(pad) === selectedKey) ??
    pads.find((pad) => pad.mapping === "standard") ??
    pads[0]
  );
}

export function controllerButtonName(index: number, family: ControllerFamily): string {
  const names: Record<ControllerFamily, readonly string[]> = {
    xbox: [
      "A",
      "B",
      "X",
      "Y",
      "LB",
      "RB",
      "LT",
      "RT",
      "View",
      "Menu",
      "LS click",
      "RS click",
      "D-pad up",
      "D-pad down",
      "D-pad left",
      "D-pad right",
      "Xbox",
    ],
    playstation: [
      "Cross",
      "Circle",
      "Square",
      "Triangle",
      "L1",
      "R1",
      "L2",
      "R2",
      "Share / Create",
      "Options",
      "L3",
      "R3",
      "D-pad up",
      "D-pad down",
      "D-pad left",
      "D-pad right",
      "PS",
      "Touchpad click",
    ],
    nintendo: [
      "B",
      "A",
      "Y",
      "X",
      "L",
      "R",
      "ZL",
      "ZR",
      "Minus",
      "Plus",
      "LS click",
      "RS click",
      "D-pad up",
      "D-pad down",
      "D-pad left",
      "D-pad right",
      "Home",
      "Capture",
    ],
    steam: [
      "A",
      "B",
      "X",
      "Y",
      "LB",
      "RB",
      "LT",
      "RT",
      "Back",
      "Start",
      "Left stick click",
      "Right pad click",
      "D-pad up",
      "D-pad down",
      "D-pad left",
      "D-pad right",
      "Steam",
    ],
    generic: [
      "Button 1",
      "Button 2",
      "Button 3",
      "Button 4",
      "Left shoulder",
      "Right shoulder",
      "Left trigger",
      "Right trigger",
      "Back",
      "Start",
      "Left stick click",
      "Right stick click",
      "D-pad up",
      "D-pad down",
      "D-pad left",
      "D-pad right",
      "Home",
    ],
  };
  return names[family][index] ?? `Button ${index + 1}`;
}

function controllerInputName(input: ControllerInput, family: ControllerFamily): string {
  if (input.kind === "button") return controllerButtonName(input.index, family);
  if (input.index <= 3) {
    const stick = input.index < 2 ? "Left stick" : family === "steam" ? "Right pad" : "Right stick";
    return `${stick} ${input.index % 2 === 0 ? (input.direction < 0 ? "left" : "right") : input.direction < 0 ? "up" : "down"}`;
  }
  return `Axis ${input.index + 1} ${input.direction < 0 ? "−" : "+"}`;
}

export function controllerChordName(chord: ControllerChord, family: ControllerFamily): string {
  return chord.map((input) => controllerInputName(input, family)).join(" + ");
}

export function controllerBindingsName(
  bindings: readonly ControllerChord[],
  family: ControllerFamily,
): string {
  return bindings.length === 0
    ? "Unbound"
    : bindings.map((chord) => controllerChordName(chord, family)).join(" or ");
}
