import { dispatchCommand } from "../shortcuts/dispatcher";
import { revealInScrollers } from "../lib/workspaceFocus";
import type { ControllerAction } from "./gamepad";

const BOUNDARY_SELECTOR =
  '[role="dialog"], [role="alertdialog"], [aria-modal="true"], dialog[open], [data-slot$="-popup"]:not([role="tooltip"]):not([data-slot="tooltip-popup"])';
const FOCUSABLE_SELECTOR =
  'button, a[href], input, textarea, select, summary, [contenteditable="true"], [tabindex]';
const WIDGET_SELECTOR =
  '[role="combobox"], [role="listbox"], [role="menu"], [role="tree"], [role="tablist"], select, input[type="range"]';

function visible(element: HTMLElement): boolean {
  return (
    !element.closest('[hidden], [inert], [aria-hidden="true"], [data-closed]') &&
    getComputedStyle(element).visibility !== "hidden" &&
    element.getClientRects().length > 0
  );
}

function boundary(): HTMLElement | undefined {
  return [...document.querySelectorAll<HTMLElement>(BOUNDARY_SELECTOR)].filter(visible).at(-1);
}

function sendNavigationKey(target: HTMLElement, key: string): boolean {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  target.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true }));
  return event.defaultPrevented;
}

function activeIn(root: HTMLElement): HTMLElement | null {
  const active = document.activeElement;
  return active instanceof HTMLElement && root.contains(active) ? active : null;
}

function moveFocus(root: HTMLElement, action: "up" | "down" | "left" | "right") {
  const active = activeIn(root);
  const widget = active?.closest<HTMLElement>(WIDGET_SELECTOR);
  const vertical = action === "up" || action === "down";
  const horizontalWidget =
    widget?.getAttribute("role") === "tablist" &&
    widget.getAttribute("aria-orientation") !== "vertical";
  const widgetOpen =
    widget?.getAttribute("role") !== "combobox" || widget.getAttribute("aria-expanded") === "true";
  const widgetDirection = vertical !== horizontalWidget;
  if (
    active &&
    widget &&
    widgetOpen &&
    widgetDirection &&
    sendNavigationKey(active, `Arrow${action[0]!.toUpperCase()}${action.slice(1)}`)
  ) {
    return;
  }
  const leavingWidget = widget && (!widgetOpen || !widgetDirection) ? widget : null;
  const stops = [...root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
    (element) =>
      element.tabIndex >= 0 &&
      !element.matches(':disabled, [aria-disabled="true"]') &&
      (!leavingWidget || element === active || !leavingWidget.contains(element)) &&
      visible(element),
  );
  const direction = action === "up" || action === "left" ? -1 : 1;
  const current = active ? stops.indexOf(active) : -1;
  const next = current < 0 ? (direction === 1 ? 0 : stops.length - 1) : current + direction;
  const target = stops[(next + stops.length) % stops.length];
  target?.focus({ preventScroll: true });
  if (target) revealInScrollers(target);
}

export function handleControllerAction(action: ControllerAction): void {
  const modal = boundary();
  const root = modal ?? document.body;
  const active = activeIn(root);
  document.documentElement.dataset.controllerNavigation = "true";
  switch (action) {
    case "up":
    case "down":
    case "left":
    case "right":
      moveFocus(root, action);
      return;
    case "activate":
      if (!active || active === root) {
        moveFocus(root, "down");
      } else if (!active.matches(':disabled, [aria-disabled="true"]')) {
        if (!active.closest(WIDGET_SELECTOR) || !sendNavigationKey(active, "Enter")) active.click();
      }
      return;
    case "back":
      if (sendNavigationKey(active ?? root, "Escape") || modal) return;
      dispatchCommand("navigation.back");
      return;
    case "commandPalette.toggle":
      if (modal) sendNavigationKey(active ?? root, "Escape");
      else dispatchCommand(action);
      return;
    case "thread.previous":
    case "thread.next":
      if (!modal) dispatchCommand(action);
  }
}

export function scrollControllerViewport(pixels: number): void {
  const root =
    boundary() ??
    document.querySelector<HTMLElement>('[data-workspace-area="conversation"]') ??
    document.querySelector<HTMLElement>("main") ??
    document.body;
  const scroller = [
    root,
    ...root.querySelectorAll<HTMLElement>(
      '[data-slot="scroll-area-viewport"], [class*="overflow-auto"], [class*="overflow-y-auto"], [data-controller-scroll]',
    ),
  ]
    .filter(
      (element) =>
        visible(element) &&
        element.scrollHeight > element.clientHeight &&
        /auto|scroll/.test(getComputedStyle(element).overflowY),
    )
    .sort((a, b) => b.clientHeight * b.clientWidth - a.clientHeight * a.clientWidth)[0];
  scroller?.scrollBy({ top: pixels, behavior: "instant" });
}
