import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

/**
 * `next/core-web-vitals` ya incluye jsx-a11y, pero como `warn`: los avisos no
 * rompen el pipeline y la accesibilidad se degrada en silencio. Aquí se suben
 * a `error` las reglas que representan barreras reales de uso con teclado o
 * lector de pantalla, no preferencias de estilo.
 */
const a11yErrorRules = [
  'jsx-a11y/alt-text',
  'jsx-a11y/anchor-has-content',
  'jsx-a11y/anchor-is-valid',
  'jsx-a11y/aria-activedescendant-has-tabindex',
  'jsx-a11y/aria-props',
  'jsx-a11y/aria-proptypes',
  'jsx-a11y/aria-role',
  'jsx-a11y/aria-unsupported-elements',
  'jsx-a11y/click-events-have-key-events',
  'jsx-a11y/heading-has-content',
  'jsx-a11y/iframe-has-title',
  'jsx-a11y/img-redundant-alt',
  'jsx-a11y/interactive-supports-focus',
  'jsx-a11y/label-has-associated-control',
  'jsx-a11y/mouse-events-have-key-events',
  'jsx-a11y/no-access-key',
  'jsx-a11y/no-autofocus',
  'jsx-a11y/no-distracting-elements',
  'jsx-a11y/no-interactive-element-to-noninteractive-role',
  'jsx-a11y/no-noninteractive-element-interactions',
  'jsx-a11y/no-noninteractive-element-to-interactive-role',
  'jsx-a11y/no-noninteractive-tabindex',
  'jsx-a11y/no-redundant-roles',
  'jsx-a11y/no-static-element-interactions',
  'jsx-a11y/role-has-required-aria-props',
  'jsx-a11y/role-supports-aria-props',
  'jsx-a11y/scope',
  'jsx-a11y/tabindex-no-positive',
];

const eslintConfig = [
  {
    ignores: ['.next/**', 'node_modules/**', 'dist/**', 'out/**', 'coverage/**', 'next-env.d.ts'],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      ...Object.fromEntries(a11yErrorRules.map((rule) => [rule, 'error'])),
      // El portal envuelve el input en el <label> y pone el texto en un <span>
      // con <strong> dentro (asociación implícita, accesible). El `depth` por
      // defecto es 2 y no llega a ese texto: se sube a 3, no se retuerce el
      // marcado para contentar a la regla.
      'jsx-a11y/label-has-associated-control': ['error', { depth: 3 }],
    },
  },
];

export default eslintConfig;
