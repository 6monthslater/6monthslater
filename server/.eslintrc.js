/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: [
    "@remix-run/eslint-config",
    "@remix-run/eslint-config/node",
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  plugins: ["@typescript-eslint"],
  rules: {
    indent: ["warn", 2, { SwitchCase: 1 }],
    "no-multiple-empty-lines": ["error", { max: 2, maxEOF: 0 }],
    "no-trailing-spaces": "error",
    "object-curly-spacing": ["warn", "always"],
    "prefer-template": "warn",
    quotes: [
      "warn",
      "double",
      { avoidEscape: true, allowTemplateLiterals: true },
    ],
    "require-await": "error",
    semi: "warn",
  },
};
