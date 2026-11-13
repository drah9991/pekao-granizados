# Migración de la UI a Astryx

Objetivo: que toda la interfaz de Pekao use los componentes de Astryx (`@astryxdesign/core`), con un
tema Astryx que conserve la identidad de Pekao. Decidido el 2026-11-13: migración por fases, no de
golpe, y tema propio en vez de Astryx neutral tal cual.

## Punto de partida (2026-11-13)

- React 19 + Astryx 0.7.15 conectados en producción (`e953a8c`): estilos base en
  `src/styles/astryx-base.css`, tema montado con `src/components/AstryxThemeBridge.tsx`.
- Tailwind 3: su preflight vive en la capa `tw-preflight` (ver comentario en `astryx-base.css`).
- Superficie a migrar: 210 archivos `.tsx` (~33.000 líneas), 55 componentes shadcn en
  `src/components/ui/`, 167 archivos que los importan. Astryx ofrece 108 componentes.

## Reglas de la migración

- Una fase o módulo por commit, probado en `staging` antes de pasar a `main`.
- Cada pantalla migrada debe verse y comportarse igual o mejor; comparar antes/después en el navegador.
- Antes de usar un componente: `npx astryx component <Nombre>` para leer sus props.
- Colores, fuentes y radios van en el tema (`src/themes/pekao/`), no en `:root` ni en clases sueltas.
- Mientras convivan shadcn y Astryx, no borrar un componente de `src/components/ui/` hasta que no
  quede ningún import suyo.

## Fases

| Fase | Contenido | Estado |
|------|-----------|--------|
| 0 | Tema `pekao` que extiende neutral con colores, fuentes y radios de la app | Hecha |
| 1 | Inventario shadcn → Astryx: tabla de equivalencias y huecos sin equivalente | Hecha (abajo) |
| 2 | Primitivos de formulario: Button, Input, TextArea, Select, Checkbox, Switch, Label/Field | En curso: estilo en el tema y piloto en `LoginForm` |
| 3 | Superposiciones: Dialog, AlertDialog, Drawer, Popover, Tooltip, DropdownMenu, Toast | Pendiente |
| 4 | Datos: Table, Tabs, Badge, Card, Skeleton, Pagination, Calendar | Pendiente |
| 5 | Estructura: AppShell, SideNav/TopNav en lugar del layout y `navConfig` actual | Pendiente |
| 6 | Módulos, uno por commit: Auth, POS, Inventario, Ventas, Caja, Dashboard, Configuración, Carta digital | Pendiente |
| 7 | Limpieza: borrar `src/components/ui/` sin uso, dependencias Radix/shadcn y CSS muerto | Pendiente |

## Fase 0: tema Pekao

- Fuente: `src/themes/pekao/pekaoTheme.ts` (extiende neutral). Tras editarlo:
  `npx astryx theme build src/themes/pekao/pekaoTheme.ts`. Los `pekao.*` generados se versionan.
- Es el único tema de la app (`src/astryx-themes.ts`); neutral sigue instalado porque el tema lo
  extiende y toma sus íconos.
- `typography` se define completa (escala de neutral + Plus Jakarta Sans): si solo se cambiara el
  token `--font-family-body`, la adaptación táctil de neutral (tablets < 1024 px) volvería a Figtree.
- `astryx doctor` avisa que no se importa la hoja de fuentes: es esperable, Plus Jakarta Sans la carga
  `src/main.tsx` con `@fontsource`.

## Fase 2: primitivos (patrón validado en `src/components/auth/LoginForm.tsx`)

- **Colores del tema = variables de la app.** `pekaoTheme.ts` apunta a `oklch(var(--background))`,
  `var(--brand-primary-color)`, etc. El acento sigue la marca de cada sede (BrandingContext) y el
  modo claro/oscuro sin duplicar valores. No usar colores fijos en el tema.
- **Tamaños por token:** `--size-element-lg` = 56 px y `--radius-element` = 1 rem; los controles
  táctiles de caja usan `size="lg"`. Los rasgos de marca (etiquetas y botón principal en
  mayúsculas, cursiva y espaciadas) están en `components` del tema, no en cada pantalla.
- **react-hook-form:** los inputs de Astryx son controlados (`value` + `onChange(value)`), así que
  se conectan con `Controller`, no con `register`.
- **Contenido al final de un campo** (p. ej. mostrar contraseña): `InputGroup` con `TextInput` y un
  `Button` `isIconOnly` `variant="secondary"`. Para contraseñas ya existe
  `src/components/auth/PasswordInput.tsx`.
- **Validación:** los campos de Astryx no ponen el `required` nativo del navegador (solo
  `aria-required`). Un formulario que dependía de `required` debe validar con zod al migrarlo, o
  se podrá enviar vacío.
- **Errores:** `status={{ type: "error", message }}` en el campo; en tests usar `getAllByText`,
  porque Astryx repite el mensaje para lectores de pantalla.
- **Tests:** escribir tests de comportamiento antes de migrar una pantalla y mantenerlos verdes
  después. `src/test/setup.ts` simula `ResizeObserver` y `showModal`/`close` de `<dialog>` para jsdom.
- **Diálogos:** `Dialog` + `DialogHeader` (con `onOpenChange` muestra la X). `onOpenChange` recibe
  el nuevo estado: cerrar solo cuando llega `false`. Astryx deja el contenido montado en el
  `<dialog>` cerrado, así que en tests comprobar `not.toBeVisible()` y no ausencia del DOM.
- **Listas de opciones:** filas (`List` + `ListItem` con `onClick`, `isSelected`, `isDisabled`), no
  tarjetas; estados como "Activo" con `Token`, no `Badge` (Badge es solo para conteos).
- **Colores fijos de la pantalla** (`slate-950`, `rose-500`…) se sustituyen por los del tema: la
  pantalla pasa a seguir el modo claro/oscuro y la marca de la sede.

Migrados: `LoginForm`, `SignupForm`, `StoreSelectorDialog` (con tests de comportamiento).

Siguiente: el resto de `src/pages/Auth.tsx` (pestañas → `TabList`, `Card`, `MagneticButton`);
luego los primitivos más usados (`button`, `input`, `label`, `card`) por módulo.

## Fase 1: equivalencias shadcn → Astryx

Medido el 2026-11-13. "Usos" = archivos que importan el componente (sin contar `ui/`).

| shadcn (`src/components/ui/`) | Usos | Astryx | Notas |
|---|---|---|---|
| button | 125 | Button, IconButton | IconButton para botones solo-ícono |
| input | 71 | TextInput, NumberInput | NumberInput para precios y cantidades |
| card | 63 | Card, ClickableCard, SelectableCard | Regla Astryx: datos densos en filas, no en tarjetas |
| label | 58 | Field | Field envuelve etiqueta + control + estado |
| dialog | 41 | Dialog | |
| select | 37 | Selector | MultiSelector / Typeahead si hay búsqueda |
| badge | 25 | Badge, Token, StatusDot | Regla Astryx: Badge solo para conteos; estados → StatusDot/Token |
| switch | 12 | Switch | |
| table | 11 | Table | |
| tooltip | 9 | Tooltip, InfoTip | |
| textarea | 9 | TextArea | |
| tabs | 8 | TabList, SegmentedControl | |
| popover | 6 | Popover | |
| scroll-area | 4 | ScrollableArea | |
| AdvancedPagination | 3 | Pagination | |
| toast, toaster, sonner, use-toast | 5 | Toast | Unificar los dos sistemas de toasts en uno |
| skeleton, BoneyardSkeleton | 4 | Skeleton | |
| sheet | 2 | Drawer, BottomSheet | |
| progress | 2 | ProgressBar | |
| dropdown-menu | 2 | DropdownMenu, MoreMenu | |
| checkbox | 2 | CheckboxInput, CheckboxList | |
| calendar | 2 | Calendar, DateInput, DateRangeInput | Al migrarlo se puede quitar `react-day-picker` |
| toggle | 1 | ToggleButton | |
| separator | 1 | Divider | |

**Sin equivalente directo (componentes propios de Pekao):** `Panel` → Card o Section;
`MagneticButton`, `InteractiveCursor` (efectos decorativos) y `OptimizedImg` se revisan caso por caso.
Astryx no trae gráficos: `recharts` se queda.

**Sin uso hoy (borrar en la fase 7, tras confirmar con grep):** accordion, alert, alert-dialog,
aspect-ratio, avatar, breadcrumb, carousel, chart, collapsible, command, context-menu, drawer, form,
hover-card, input-otp, menubar, navigation-menu, pagination, radio-group, resizable, sidebar,
slider, toggle-group.
