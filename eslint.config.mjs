import { FlatCompat } from "@eslint/eslintrc";
import { fileURLToPath } from "node:url";
import path from "node:path";
import playwright from "eslint-plugin-playwright";

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
  "jsx-a11y/alt-text",
  "jsx-a11y/anchor-has-content",
  "jsx-a11y/anchor-is-valid",
  "jsx-a11y/aria-activedescendant-has-tabindex",
  "jsx-a11y/aria-props",
  "jsx-a11y/aria-proptypes",
  "jsx-a11y/aria-role",
  "jsx-a11y/aria-unsupported-elements",
  "jsx-a11y/click-events-have-key-events",
  "jsx-a11y/heading-has-content",
  "jsx-a11y/iframe-has-title",
  "jsx-a11y/img-redundant-alt",
  "jsx-a11y/interactive-supports-focus",
  "jsx-a11y/label-has-associated-control",
  "jsx-a11y/mouse-events-have-key-events",
  "jsx-a11y/no-access-key",
  "jsx-a11y/no-autofocus",
  "jsx-a11y/no-distracting-elements",
  "jsx-a11y/no-interactive-element-to-noninteractive-role",
  "jsx-a11y/no-noninteractive-element-interactions",
  "jsx-a11y/no-noninteractive-element-to-interactive-role",
  "jsx-a11y/no-noninteractive-tabindex",
  "jsx-a11y/no-redundant-roles",
  "jsx-a11y/no-static-element-interactions",
  "jsx-a11y/role-has-required-aria-props",
  "jsx-a11y/role-supports-aria-props",
  "jsx-a11y/scope",
  "jsx-a11y/tabindex-no-positive",
];

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      // `dist/**` solo cubría la raíz, así que la salida compilada de los workers anidados se
      // linteaba como si fuera código fuente del portal.
      "**/dist/**",
      "out/**",
      "coverage/**",
      // `next-env.d.ts` (sin comodín) solo casaba con el de la raíz.
      "**/next-env.d.ts",
      // Clon suelto del propio portal dentro de sí mismo: tiene su propio `.git` y NO está
      // rastreado por este repositorio (`git ls-files AtlasAdminPortal/` no devuelve nada). No se
      // borra —es material local de quien lo clonó— pero tampoco es código de este proyecto.
      "AtlasAdminPortal/**",
      // Repos independientes anidados en este directorio: tienen su propia configuración de
      // ESLint, su propio runtime (Node, no Next) y sus propios gates. Lintearlos aquí llenaba
      // `yarn lint` de errores ajenos —`require()` en scripts CJS, `module` como variable en
      // tests de NestJS— y dejaba el gate inservible para detectar problemas reales del portal.
      "semantic-analysis-worker/**",
      "bolivia-bank-statement-worker/**",
      "atlas-auth-broker-worker/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      ...Object.fromEntries(a11yErrorRules.map((rule) => [rule, "error"])),
      // El portal envuelve el input en el <label> y pone el texto en un <span>
      // con <strong> dentro (asociación implícita, accesible). El `depth` por
      // defecto es 2 y no llega a ese texto: se sube a 3, no se retuerce el
      // marcado para contentar a la regla.
      "jsx-a11y/label-has-associated-control": ["error", { depth: 3 }],
    },
  },
  {
    // El código ya usa el prefijo `_` para marcar lo que existe por contrato
    // (parámetros de un callback, capturas de error) pero no se consume. Sin
    // este patrón la regla los reporta igual, y ese ruido termina tapando los
    // no-usados de verdad. Un identificador sin `_` sigue avisando.
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    /*
     * Las prohibiciones del E2E, como reglas que fallan — no como prosa en una guía.
     *
     * `no-wait-for-timeout` es la que más importa: un `waitForTimeout` es lento en una máquina
     * rápida, inestable en una lenta, y esconde la condición que de verdad se esperaba. Todas las
     * acciones y aserciones de Playwright esperan solas; si hace falta un reloj, falta un
     * localizador o una aserción mejor.
     *
     * `no-skipped-test` va como AVISO y no como error a propósito: hay saltos legítimos —una
     * prueba que no aplica a un navegador— y convertirlos en error empujaría a comentarlos, que es
     * peor. Lo que no puede pasar desapercibido es que se salten TODAS en integración continua, y
     * de eso se encarga el paso `--fail-on-skipped` del workflow, no el linter.
     */
    files: ["tests/e2e/**/*.ts"],
    plugins: { playwright },
    rules: {
      "playwright/no-wait-for-timeout": "error",
      "playwright/no-force-option": "error",
      "playwright/no-element-handle": "error",
      "playwright/no-page-pause": "error",
      "playwright/no-focused-test": "error",
      "playwright/no-conditional-in-test": "off",
      "playwright/no-skipped-test": "warn",
      "playwright/expect-expect": "warn",
      // `use(...)` es cómo una fixture de Playwright entrega su valor, no un hook de React. La
      // regla lo confunde por el nombre y marca como error un fichero que no tiene React dentro.
      "react-hooks/rules-of-hooks": "off",
    },
  },
];

export default eslintConfig;
