import { normalizeNigerianPhone, isValidNigerianPhone } from "./phone.ts";

const cases: Array<[string, string | null, string]> = [
  ["08031234567", "+2348031234567", "local format"],
  ["0803 123 4567", "+2348031234567", "spaces"],
  ["0803-123-4567", "+2348031234567", "dashes"],
  ["+2348031234567", "+2348031234567", "international"],
  ["2348031234567", "+2348031234567", "no plus"],
  ["8031234567", "+2348031234567", "10 digits, no prefix"],
  ["07012345678", "+2347012345678", "070 prefix"],
  ["09087654321", "+2349087654321", "090 prefix"],
  ["+234 803 123 4567", "+2348031234567", "plus with spaces"],
  ["0803123456", null, "too short"],
  ["08031234567890", null, "too long"],
  ["0123456789", null, "landline 01 prefix"],
  ["abc", null, "letters"],
  ["", null, "empty"],
  ["+12025550123", null, "US number"],
  ["23480312345", null, "short country-code form"],
  ["07031234567", "+2347031234567", "valid 0703"],
  ["+234803123456", null, "international too short"],
];

let pass = 0, fail = 0;
for (const [input, expected, why] of cases) {
  const got = normalizeNigerianPhone(input);
  if (got === expected) { pass++; console.log(`PASS  ${JSON.stringify(input).padEnd(20)} -> ${got ?? "null"}  (${why})`); }
  else { fail++; console.log(`FAIL  ${JSON.stringify(input).padEnd(20)} -> ${got ?? "null"}, expected ${expected ?? "null"}  (${why})`); }
}
// isValidNigerianPhone must agree with normalize.
for (const [input, expected] of cases) {
  const agree = isValidNigerianPhone(input) === (expected !== null);
  if (!agree) { fail++; console.log(`FAIL  isValidNigerianPhone disagrees for ${JSON.stringify(input)}`); }
}
console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
