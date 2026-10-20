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
      "object-shorthand": ["error", "always", { ignoreConstructors: true }],
      "quote-props": ["error", "consistent-as-needed"],
      "no-unused-vars": "error",
      "no-undef": "error",
      "prefer-const": "error",
      "no-var": "error",
      "eqeqeq": "error",
    },
  },
];
