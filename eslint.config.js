const js = require("@eslint/js");
const globals = require("globals");
const { defineConfig } = require("eslint/config");
const cypressPlugin = require("eslint-plugin-cypress");

module.exports = defineConfig([
  // For general JS files
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  // For Cypress test files
  {
    files: ["cypress/**/*.cy.js"],
    plugins: { cypress: cypressPlugin },
    languageOptions: {
      globals: {
        ...globals.mocha,
        ...globals.browser,
        cy: true,
        Cypress: true,
        expect: true,
      },
    },
    rules: {
      "cypress/no-assigning-return-values": "error",
      "cypress/no-unnecessary-waiting": "warn",
      "cypress/assertion-before-screenshot": "warn",
    },
  },
], {
  ignores: [
    "eslint.config.mjs",
    "node_modules",
    "dist",
    "cypress/videos",
    "cypress/screenshots",
  ],
});