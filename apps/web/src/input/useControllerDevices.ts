import { useEffect, useState } from "react";
import type { ControllerDevice } from "./controllerDevice";
import { readGamepads } from "./gamepad";

function readDevices(): ControllerDevice[] {
  return readGamepads().map((pad) => ({
    index: pad.index,
    id: pad.id,
    mapping: pad.mapping,
    buttons: pad.buttons.length,
    axes: pad.axes.length,
  }));
}

export function useControllerDevices(): ControllerDevice[] {
  const [devices, setDevices] = useState(readDevices);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- browsers may expose a gamepad after user interaction without another connection event
  useEffect(() => {
    const refresh = () => {
      if (!document.hasFocus() || document.visibilityState !== "visible") return;
      const next = readDevices();
      setDevices((previous) =>
        JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
      );
    };
    const timer = window.setInterval(refresh, 500);
    window.addEventListener("gamepadconnected", refresh);
    window.addEventListener("gamepaddisconnected", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("gamepadconnected", refresh);
      window.removeEventListener("gamepaddisconnected", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return devices;
}
