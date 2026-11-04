import dualsense from "../../assets/controllers/dualsense.svg";
import dualshock4 from "../../assets/controllers/dualshock-4.svg";
import generic from "../../assets/controllers/generic.svg";
import joyCons from "../../assets/controllers/joy-cons.svg";
import steamController from "../../assets/controllers/steam-controller.svg";
import steamDeck from "../../assets/controllers/steam-deck.svg";
import switchPro from "../../assets/controllers/switch-pro.svg";
import xbox360 from "../../assets/controllers/xbox-360.svg";
import xboxOne from "../../assets/controllers/xbox-one.svg";
import {
  type ControllerBindingAction,
  type ControllerBindings,
} from "../../input/controllerBindings";
import { controllerBindingsName, type ControllerFamily } from "../../input/controllerDevice";

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
  const artwork = {
    xbox: name.includes("360") ? xbox360 : xboxOne,
    playstation: name === "DualSense" ? dualsense : dualshock4,
    nintendo: name.includes("Joy-Con") ? joyCons : switchPro,
    steam: name === "Steam Deck" ? steamDeck : steamController,
    generic,
  }[family];
  const callout = (action: ControllerBindingAction, label: string) => (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-foreground">
        {controllerBindingsName(bindings[action], family)}
      </p>
    </div>
  );

  return (
    <figure
      className="@container overflow-hidden rounded-xl border border-border/60 bg-linear-to-b from-muted/40 to-muted/10"
      data-controller-family={family}
    >
      <div className="grid grid-cols-2 items-center gap-x-4 gap-y-5 px-5 py-6 @min-[600px]:grid-cols-[minmax(0,1fr)_minmax(0,3.2fr)_minmax(0,1fr)] @min-[600px]:gap-x-4">
        <div className="order-2 space-y-5 @min-[600px]:order-1">
          {callout("thread.previous", "Previous thread")}
          {callout("commandPalette.toggle", "Command palette")}
        </div>
        <div className="order-1 col-span-2 mx-auto w-full max-w-110 @min-[600px]:order-2 @min-[600px]:col-span-1">
          <img
            src={artwork}
            alt={connected ? `${name} layout` : "Connect a controller to see its layout"}
            className={`aspect-[1.5] w-full object-contain invert dark:invert-0 ${connected ? "opacity-80" : "opacity-30"}`}
            draggable={false}
          />
        </div>
        <div className="order-3 space-y-5">
          {callout("thread.next", "Next thread")}
          {callout("activate", "Activate")}
          {callout("back", "Back / close")}
        </div>
      </div>
    </figure>
  );
}
