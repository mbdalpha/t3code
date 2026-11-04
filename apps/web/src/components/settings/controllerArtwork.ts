import dualsense from "../../assets/controllers/dualsense.svg";
import dualshock4 from "../../assets/controllers/dualshock-4.svg";
import generic from "../../assets/controllers/generic.svg";
import joyCons from "../../assets/controllers/joy-cons.svg";
import steamController from "../../assets/controllers/steam-controller.svg";
import steamDeck from "../../assets/controllers/steam-deck.svg";
import switchPro from "../../assets/controllers/switch-pro.svg";
import xbox360 from "../../assets/controllers/xbox-360.svg";
import xboxOne from "../../assets/controllers/xbox-one.svg";
import type { ControllerFamily } from "../../input/controllerDevice";

type Control = readonly [x: number, y: number, radius: number];
interface Artwork {
  src: string;
  face: readonly [x: number, y: number, spacing: number, radius: number];
  dpad: readonly [x: number, y: number, spacing: number, radius: number];
  sticks: readonly [Control, Control];
  buttons: readonly (readonly [index: number, x: number, y: number, rx: number, ry: number])[];
}

// Positions use the existing artwork fitted inside a 100 × 70 view box.
const ARTWORK = {
  xboxOne: {
    src: xboxOne,
    face: [75.7, 30.8, 6.7, 3.1],
    dpad: [37.2, 46.7, 4.5, 2.3],
    sticks: [
      [24.5, 34.2, 4.4],
      [63.4, 48.8, 4.4],
    ],
    buttons: [
      [4, 25.2, 14, 9, 1.8],
      [5, 74.8, 14, 9, 1.8],
      [6, 23, 6.5, 3.5, 3],
      [7, 77, 6.5, 3.5, 3],
      [8, 42.7, 31, 2.1, 2.1],
      [9, 57.2, 31, 2.1, 2.1],
      [16, 50, 21.3, 3.8, 3.8],
    ],
  },
  xbox360: {
    src: xbox360,
    face: [78.4, 19.3, 7.6, 3.6],
    dpad: [35, 36.5, 5.7, 3.1],
    sticks: [
      [21.4, 19.2, 6.5],
      [63.6, 36.5, 6.5],
    ],
    buttons: [
      [4, 24, 3.3, 9, 1.5],
      [5, 76, 3.3, 9, 1.5],
      [8, 39.5, 19.7, 2.6, 1.8],
      [9, 60.5, 19.7, 2.6, 1.8],
      [16, 50, 19.7, 5, 5],
    ],
  },
  dualsense: {
    src: dualsense,
    face: [80.6, 35, 6.9, 3],
    dpad: [19.5, 35, 5.5, 2.5],
    sticks: [
      [34.8, 51, 4.5],
      [65, 51, 4.5],
    ],
    buttons: [
      [4, 20, 16, 6.5, 2.3],
      [5, 80, 16, 6.5, 2.3],
      [6, 22, 10.7, 5, 2.4],
      [7, 78, 10.7, 5, 2.4],
      [8, 27, 25.1, 1.2, 2],
      [9, 72.8, 25.1, 1.2, 2],
      [16, 50, 45.4, 2.5, 1.7],
      [17, 50, 28.6, 18, 10],
    ],
  },
  dualshock4: {
    src: dualshock4,
    face: [80.6, 32.3, 6.9, 3],
    dpad: [19.2, 32.3, 5.4, 2.5],
    sticks: [
      [34.5, 49.1, 4.7],
      [65.4, 49.1, 4.7],
    ],
    buttons: [
      [4, 19.9, 13.4, 6, 1.6],
      [5, 80.1, 13.4, 6, 1.6],
      [6, 20, 9.7, 4.5, 1.8],
      [7, 80, 9.7, 4.5, 1.8],
      [8, 29.8, 23, 1.8, 3.1],
      [9, 70.1, 23, 1.8, 3.1],
      [16, 50, 44.4, 2.6, 2.2],
      [17, 50, 25.8, 16, 9],
    ],
  },
  switchPro: {
    src: switchPro,
    face: [75.2, 23, 7.5, 3.6],
    dpad: [35.2, 35.9, 4.9, 2.4],
    sticks: [
      [23.7, 23, 5.5],
      [62.5, 36, 5.5],
    ],
    buttons: [
      [4, 23, 6.1, 8, 1.7],
      [5, 77, 6.1, 8, 1.7],
      [8, 38.3, 15.8, 2.1, 2.1],
      [9, 61.7, 15.8, 2.1, 2.1],
      [16, 56.9, 22.9, 2.3, 2.3],
      [17, 43.1, 23, 2, 2],
    ],
  },
  joyCons: {
    src: joyCons,
    face: [74.8, 20.3, 5.1, 2.6],
    dpad: [25.3, 38.4, 5.1, 2.6],
    sticks: [
      [25.3, 20.3, 5],
      [74.8, 38.4, 5],
    ],
    buttons: [
      [4, 28, 4.9, 7, 1.5],
      [5, 72, 4.9, 7, 1.5],
      [8, 32.7, 10.2, 1.6, 1],
      [9, 67.3, 10.2, 1.6, 1.6],
      [16, 70.5, 50.8, 2.6, 2.6],
      [17, 29.7, 50.8, 2, 2],
    ],
  },
  steamController: {
    src: steamController,
    face: [61, 35, 6, 3],
    dpad: [24, 20, 3.1, 1.8],
    sticks: [
      [39, 35, 4.2],
      [76, 20, 9],
    ],
    buttons: [
      [4, 25, 5, 8, 1.3],
      [5, 75, 5, 8, 1.3],
      [8, 43, 20, 1.7, 1.7],
      [9, 57, 20, 1.7, 1.7],
      [16, 50, 20, 2.7, 2.7],
    ],
  },
  steamDeck: {
    src: steamDeck,
    face: [92.4, 22.7, 2.8, 1.4],
    dpad: [7.9, 22.7, 2.3, 1.3],
    sticks: [
      [16.6, 24.8, 2.8],
      [82.9, 24.8, 2.8],
    ],
    buttons: [
      [4, 13, 17.3, 5, 1],
      [5, 87, 17.3, 5, 1],
      [8, 13.1, 19, 1.3, 0.7],
      [9, 87, 19, 1.3, 0.7],
      [16, 18.5, 43, 2.5, 1],
    ],
  },
  generic: {
    src: generic,
    face: [74.9, 20.2, 6.5, 3.1],
    dpad: [37.7, 35.4, 4.7, 2.4],
    sticks: [
      [25.7, 19.7, 5.1],
      [62.5, 34.2, 5.1],
    ],
    buttons: [
      [4, 25, 6, 8, 1.5],
      [5, 75, 6, 8, 1.5],
      [8, 43, 19.8, 2.2, 2.2],
      [9, 56.9, 19.8, 2.2, 2.2],
      [16, 50, 10, 3.1, 3.1],
    ],
  },
} satisfies Record<string, Artwork>;

export function controllerArtwork(family: ControllerFamily, name: string): Artwork {
  switch (family) {
    case "xbox":
      return name.includes("360") ? ARTWORK.xbox360 : ARTWORK.xboxOne;
    case "playstation":
      return name === "DualSense" ? ARTWORK.dualsense : ARTWORK.dualshock4;
    case "nintendo":
      return name.includes("Joy-Con") ? ARTWORK.joyCons : ARTWORK.switchPro;
    case "steam":
      return name === "Steam Deck" ? ARTWORK.steamDeck : ARTWORK.steamController;
    default:
      return ARTWORK.generic;
  }
}
