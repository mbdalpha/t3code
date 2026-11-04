import * as Schema from "effect/Schema";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { ControllerBindings, DEFAULT_CONTROLLER_BINDINGS } from "./controllerBindings";
import { controllerProfileKey, type ControllerDevice } from "./controllerDevice";

const Profiles = Schema.Record(Schema.String, ControllerBindings);
type Profiles = typeof Profiles.Type;
const EMPTY_PROFILES: Profiles = {};

export function useControllerEnabled() {
  return useLocalStorage("t3code:controller-enabled", false, Schema.Boolean);
}

export function useSelectedController() {
  return useLocalStorage("t3code:controller-selected", "", Schema.String);
}

export function useControllerProfiles() {
  return useLocalStorage("t3code:controller-bindings-v1", EMPTY_PROFILES, Profiles);
}

export function bindingsForController(
  profiles: Profiles,
  pad: ControllerDevice,
): ControllerBindings {
  return profiles[controllerProfileKey(pad)] ?? DEFAULT_CONTROLLER_BINDINGS;
}
