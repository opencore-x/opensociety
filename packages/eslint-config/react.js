import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import base from './base.js';

/**
 * Flat ESLint config for React 19 apps (extends base with hooks rules).
 */
export default [
  ...base,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // `t` is the useT() translate function by convention across web + mobile.
      // A callback/param named `t` silently shadows it (a recurring i18n bug),
      // so forbid it — use `opt`, `row`, `item`, `prev`, etc. instead.
      'no-restricted-syntax': [
        'error',
        {
          selector: "ArrowFunctionExpression > Identifier.params[name='t']",
          message: "Don't name a parameter 't' — it shadows the useT() translate function.",
        },
        {
          selector: "FunctionExpression > Identifier.params[name='t']",
          message: "Don't name a parameter 't' — it shadows the useT() translate function.",
        },
        {
          selector: "FunctionDeclaration > Identifier.params[name='t']",
          message: "Don't name a parameter 't' — it shadows the useT() translate function.",
        },
      ],
    },
  },
];
