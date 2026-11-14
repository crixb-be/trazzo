import fs from "node:fs";
import path from "node:path";

const sourceRoot = path.join(process.cwd(), "src");
const stylesheet = fs.readFileSync(path.join(sourceRoot, "app", "globals.css"), "utf8");
const classesInCss = new Set(
  [...stylesheet.matchAll(/\.([a-zA-Z_][a-zA-Z0-9_-]*)/g)].map((match) => match[1]),
);
const files = [];

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(fullPath);
    else if (entry.name.endsWith(".tsx")) files.push(fullPath);
  }
}

visit(sourceRoot);

const classesInTsx = new Map();
const classNamePattern = /className\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([\s\S]*?)\})/g;
const stringPattern = /["']([^"']+)["']/g;

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");

  for (const match of source.matchAll(classNamePattern)) {
    const expression = [match[1], match[2], match[3]].filter(Boolean).join(" ");
    // Inside {...} expressions, comparisons such as `variant === "inline"` are not classes.
    const classExpression = match[3]
      ? expression.replace(/[!=]==?\s*["'][^"']*["']/g, "")
      : expression;
    const values = match[3]
      ? [...classExpression.matchAll(stringPattern)].map((item) => item[1])
      : [classExpression];

    for (const value of values) {
      for (const className of value.split(/\s+/)) {
        if (!className || className.includes("$" + "{") || className.includes("[")) continue;
        // Dynamic prefixes like `"badge-" + variant` are completed at runtime.
        if (className.endsWith("-")) continue;
        if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(className)) continue;

        const locations = classesInTsx.get(className) ?? [];
        locations.push(path.relative(process.cwd(), file));
        classesInTsx.set(className, locations);
      }
    }
  }
}

const tailwindUtilities =
  /^(sm|md|lg|xl|2xl|hover|focus|active|disabled|dark|group|peer|grid|flex|block|hidden|relative|absolute|fixed|sticky|inset|top|right|bottom|left|w|h|min|max|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|space|text|font|leading|tracking|rounded|border|bg|from|via|to|col|row|order|justify|items|content|self|overflow|whitespace|break|truncate|sr-only)(-|:|$)/;
const missing = [...classesInTsx.entries()]
  .filter(([className]) => !classesInCss.has(className) && !tailwindUtilities.test(className))
  .sort(([left], [right]) => left.localeCompare(right));

if (missing.length > 0) {
  console.error("Clases sin selector en globals.css:");
  for (const [className, locations] of missing) {
    console.error("- " + className + " (" + [...new Set(locations)].join(", ") + ")");
  }
  process.exitCode = 1;
} else {
  console.log("audit-classnames: 0 missing custom classes");
}
