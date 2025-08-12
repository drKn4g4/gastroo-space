// Importujemy potrzebne pakiety
const globals = require("globals");
const tseslint = require("typescript-eslint");

// Eksportujemy konfigurację
module.exports = tseslint.config(
  // Ignorujemy skompilowane pliki w folderze lib
  {
    ignores: ["lib/**"],
  },
  // Używamy rekomendowanych reguł od typescript-eslint
  ...tseslint.configs.recommended,
  // Definiujemy globalne zmienne dla środowiska Node.js
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
);