// The one place money gets formatted (see CLAUDE.md).
//
// Naira is stored as whole integers everywhere (3500 means ₦3,500).
// Every price on screen goes through formatNaira — never scatter
// toLocaleString calls around the codebase.
export function formatNaira(wholeNaira: number): string {
  return `₦${Math.round(wholeNaira).toLocaleString("en-NG")}`;
}
