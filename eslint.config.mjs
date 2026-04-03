import jsonc from "eslint-plugin-jsonc";

export default [
  ...jsonc.configs["recommended-with-jsonc"],
  {
    files: ["**/*.jsonc"],
    rules: {
      "jsonc/comma-dangle": ["error", "always-multiline"],
    },
  },
];
