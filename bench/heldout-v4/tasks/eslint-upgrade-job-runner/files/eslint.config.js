export default [
  { ignores: ["node_modules/**"] },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
    rules: {
      "no-unsafe-finally": "error",
      "no-unused-vars": "error",
      "no-undef": "error",
      "no-unused-labels": "error",
      "prefer-const": "error",
      "no-var": "error",
      "eqeqeq": "error",
    },
  },
];
