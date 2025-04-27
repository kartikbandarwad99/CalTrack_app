import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // Disable the rule temporarily
      '@typescript-eslint/no-unused-vars': 'off', // Disable unused vars rule temporarily
      'react-hooks/exhaustive-deps': 'off', // Disable the exhaustive-deps warning temporarily
    },
  },
];

export default eslintConfig;