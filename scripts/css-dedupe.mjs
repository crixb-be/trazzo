// Removes declarations that a later rule with the same selector (in the same
// @media context) overrides anyway, then reports what is left duplicated.
// Usage: node scripts/css-dedupe.mjs <file.css> [--write]
import { readFileSync, writeFileSync } from "node:fs";
import postcss from "postcss";

const [file, flag] = process.argv.slice(2);
const root = postcss.parse(readFileSync(file, "utf8"));
const context = (rule) => {
  const parts = [];
  for (let p = rule.parent; p && p.type !== "root"; p = p.parent) {
    parts.push(p.type === "atrule" ? `@${p.name} ${p.params}` : p.selector);
  }
  return parts.join(" | ");
};
const groups = new Map();
root.walkRules((rule) => {
  if (rule.parent.type === "atrule" && /keyframes/.test(rule.parent.name)) return;
  const key = context(rule) + " >> " + rule.selector.replace(/\s+/g, " ");
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(rule);
});
let removedDecls = 0;
let removedRules = 0;
let remaining = 0;
for (const rules of groups.values()) {
  if (rules.length < 2) continue;
  for (let i = 0; i < rules.length - 1; i += 1) {
    const later = new Set();
    for (const next of rules.slice(i + 1)) {
      next.each(
        (node) => node.type === "decl" && later.add(node.prop + (node.important ? "!" : "")),
      );
    }
    rules[i].each((node) => {
      if (node.type === "decl" && later.has(node.prop + (node.important ? "!" : ""))) {
        node.remove();
        removedDecls += 1;
      }
    });
    if (rules[i].nodes.length === 0) {
      rules[i].remove();
      removedRules += 1;
    }
  }
  if (rules.filter((rule) => rule.parent).length > 1) remaining += 1;
}
console.log({ removedDecls, removedRules, selectorsStillSplit: remaining });
if (flag === "--write") writeFileSync(file, root.toString());
