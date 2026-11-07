import { expect, it } from "vite-plus/test";
import { identifyController } from "./controllerDevice";

it.each([
  ["Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)", "xbox"],
  ["Xbox 360 Controller (XInput STANDARD GAMEPAD)", "xbox"],
  ["Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)", "playstation"],
  ["DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)", "playstation"],
  ["Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)", "nintendo"],
  ["Steam Controller (STANDARD GAMEPAD Vendor: 28de Product: 1102)", "steam"],
  ["Steam Deck", "steam"],
  ["USB Gamepad (Vendor: 1234 Product: abcd)", "generic"],
])("recognizes the reported controller family for %s", (id, family) => {
  expect(identifyController(id).family).toBe(family);
});
