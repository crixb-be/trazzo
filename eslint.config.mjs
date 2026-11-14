import parser from "@typescript-eslint/parser";
export default [
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } },
    },
  },
];
