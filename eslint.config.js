import { defineConfig } from "eslint/config";
import expoConfig from "eslint-config-expo/flat.js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import securityPlugin from "eslint-plugin-security";
import deMorganPlugin, {
  configs as deMorganConfigs,
} from "eslint-plugin-de-morgan";
import { configs as tseslintConfigs } from "typescript-eslint";

export default defineConfig([
  // Base configurations
  expoConfig,
  eslintPluginPrettierRecommended,
  securityPlugin.configs.recommended,
  ...tseslintConfigs.recommended,

  // De Morgan Plugin (Security)
  {
    plugins: {
      "de-morgan": deMorganPlugin,
    },
    rules: {
      ...deMorganConfigs.recommended.rules,
    },
  },

  // Custom Rules & Overrides
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      // --- Security Rules ---
      "security/detect-object-injection": "off",
      "security/detect-new-buffer": "error",
      "security/detect-eval-with-expression": "error",
      "security/detect-unsafe-regex": "warn",
      "security/detect-non-literal-regexp": "warn",
      "security/detect-pseudoRandomBytes": "warn",
      "security/detect-possible-timing-attacks": "warn",
      "security/detect-child-process": "warn",
      "security/detect-non-literal-fs-filename": "warn",
      "security/detect-no-csrf-before-method-override": "warn",

      // --- Code Quality ---
      "no-console": "warn",
      "prefer-const": "error",
      "no-var": "error",

      // --- TypeScript ---
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "variable",
          format: ["camelCase", "UPPER_CASE", "PascalCase"],
          leadingUnderscore: "allow",
        },
        {
          selector: "function",
          format: ["camelCase", "PascalCase"],
        },
        {
          selector: "interface",
          format: ["PascalCase"],
          custom: {
            regex: "^I[A-Z]",
            match: false,
          },
        },
        {
          selector: "typeLike",
          format: ["PascalCase"],
        },
      ],
    },
  },

  // Config files overrides
  {
    files: ["*.config.js", "scripts/**/*.js", "eslint.config.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  // Ignores
  {
    ignores: [
      "node_modules/*",
      "dist/*",
      "server_dist/*",
      "server/dist/*",
      "server-nest/dist/*",
      "**/*.d.ts",
    ],
  },
]);
