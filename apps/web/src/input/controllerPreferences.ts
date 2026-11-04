import * as Schema from "effect/Schema";
import { useLocalStorage } from "../hooks/useLocalStorage";

export function useControllerEnabled() {
  return useLocalStorage("t3code:controller-enabled", false, Schema.Boolean);
}
