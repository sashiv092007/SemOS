/** Ask the 3D background grid to play its particle sweep (for example after a main button press). */
export function triggerSweep() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("semos:sweep"));
}
