# Reporte de Auditoría de UI/UX e Integridad Responsiva
**Proyecto**: Pekao Granizados (Oasis Eón POS)
**Fecha**: 2026-06-24
**Autor**: Teamwork UI/UX Auditor Agent

---

## 1. Resumen Ejecutivo

Este reporte detalla los hallazgos de una auditoría exhaustiva de UI/UX, diseño responsivo, consistencia visual y accesibilidad (conforme a las pautas WCAG de contraste) realizada sobre el sistema de Pekao Granizados. 

El sistema presenta una interfaz oscura (Dark Mode) sumamente moderna, estética y personalizada, con efectos de desenfoque de fondo y bordes estilizados ("glassmorphism"). Sin embargo, la interfaz sufre fallos críticos al activarse el **modo claro (Light Mode)** y al visualizarse en **dispositivos móviles**. Los problemas más graves se categorizan en:
1. **Incompatibilidad de formatos de color**: Variables CSS definidas en HSL envueltas en funciones `oklch()` de Tailwind y viceversa, rompiendo los estilos en cascada (layouts y tooltips de Recharts).
2. **Texto blanco sobre fondos claros (Contraste Crítico)**: Elementos de texto importantes con clases `text-white` fijas que resultan invisibles (blanco sobre blanco) en modo claro.
3. **Entradas de texto invisibles (Black-on-Black)**: Inputs con fondo oscuro fijo (`bg-slate-950`) pero con color de texto dinámico, resultando en texto negro sobre fondo negro en modo claro.
4. **Pérdida de estructura y divisiones**: Bordes y líneas divisorias usando blanco translúcido (`border-white/5`), volviéndose invisibles en modo claro.
5. **Problemas de desbordamiento en móviles (Responsive Breakpoints)**: El panel flotante de control central, filtros rígidos y espaciados exagerados que rompen la legibilidad en pantallas estrechas.

Esta auditoría describe paso a paso cómo corregir cada uno de estos problemas utilizando clases semánticas de Tailwind y ajustando de manera óptima las variables de color del tema, sin alterar el diseño visual premium de la aplicación.

---

## 2. Metodología y Vistas Analizadas

La auditoría se llevó a cabo analizando la estructura del código frontend en React (TypeScript + Tailwind CSS) y los estilos CSS globales. Se evaluaron cinco vistas clave del sistema, además de la barra de navegación y las interfaces modales:

1. **POS (Terminal de Punto de Venta - `src/pages/POS.tsx` & subcomponentes)**: Se evaluó la lista de productos del carrito, popovers de adiciones (toppings), totales y botones de compra.
2. **Dashboard (Tablero de Control - `src/components/dashboard/*`)**: Se inspeccionó la adaptabilidad de las cuadrículas de datos, gráficos de Recharts, tooltips flotantes y tablas de ventas/productos populares.
3. **Inventory (Inventario - `src/components/inventory/*`)**: Se analizó la visualización de la cuadrícula de inventario, los filtros de búsqueda y los contenedores de mezcla de recetas.
4. **Cash Register (Caja Chica - `src/pages/CashRegister.tsx` & `src/components/cash/*`)**: Se revisó el comportamiento del flujo de dinero, estados de turnos activos y tablas de transacciones.
5. **Settings (Configuración - `src/pages/Settings.tsx` & `src/components/settings/*`)**: Se examinó la interfaz de branding corporativo y el soporte multi-tienda.
6. **Layout y Ventanas Modales (Base de Diseño - `src/components/Layout.tsx` & modales en `ActiveShiftCard.tsx`)**: Se analizaron los diálogos de apertura/cierre de turnos y el panel de control flotante en pantallas móviles y de escritorio.

---

## 3. Detalle de Hallazgos

A continuación, se describen los 11 hallazgos (A a K) detectados durante el análisis del código fuente, especificando el archivo exacto, la naturaleza del problema, el fragmento de código afectado y la propuesta de solución técnica.

---

### Hallazgo A: Conflicto en Definición de Colores de Barra Lateral (HSL vs. OKLCH)

*   **Ruta de archivo exacta**: `tailwind.config.ts` y `src/index.css`
*   **Explicación del problema**: *Consistencia Visual e Integridad CSS*. En `src/index.css` las variables de color de la barra lateral (p. ej. `--sidebar-background`) están definidas en el formato HSL (`0 0% 100%`). Sin embargo, en `tailwind.config.ts`, estas mismas variables se envuelven utilizando la función de color `oklch()`. Esto provoca que el navegador reciba un valor de color no interpretable como `oklch(0 0% 100% / 1)`, invalidando las clases de color de la barra lateral.
*   **Fragmento de código problemático**:
    *   *`tailwind.config.ts` (líneas 59–67)*:
        ```typescript
        sidebar: {
          DEFAULT: "oklch(var(--sidebar-background) / <alpha-value>)",
          foreground: "oklch(var(--sidebar-foreground) / <alpha-value>)",
          primary: "oklch(var(--sidebar-primary) / <alpha-value>)",
          "primary-foreground": "oklch(var(--sidebar-primary-foreground) / <alpha-value>)",
          accent: "oklch(var(--sidebar-accent) / <alpha-value>)",
          "accent-foreground": "oklch(var(--sidebar-accent-foreground) / <alpha-value>)",
          border: "oklch(var(--sidebar-border) / <alpha-value>)",
          ring: "oklch(var(--sidebar-ring) / <alpha-value>)",
        }
        ```
    *   *`src/index.css` (líneas 66–69 / 115–118)*:
        ```css
        /* Light Mode */
        --sidebar-background: 0 0% 100%;
        --sidebar-foreground: var(--brand-primary-h) 50% 10%;
        --sidebar-primary: var(--brand-primary-h) 80% 50%;
        --sidebar-border: 220 13% 91%;
        
        /* Dark Mode */
        --sidebar-background: var(--brand-primary-h) 30% 6%;
        --sidebar-foreground: var(--brand-primary-h) 10% 90%;
        --sidebar-border: var(--brand-primary-h) 20% 12%;
        ```
*   **Solución concreta paso a paso**:
    Para resolver este conflicto existen dos opciones recomendadas:
    
    *   **Opción 1: Redefinir las variables CSS del sidebar en formato OKLCH en `src/index.css`**:
        Modificar los valores en `src/index.css` para que coincidan con la escala de luminosidad, croma y matiz de OKLCH:
        ```css
        /* Light Mode */
        --sidebar-background: 1.0 0.0 0;
        --sidebar-foreground: 0.21 0.04 250;
        --sidebar-primary: 0.58 0.23 250;
        --sidebar-border: 0.92 0.01 220;

        /* Dark Mode */
        --sidebar-background: 0.15 0.02 250;
        --sidebar-foreground: 0.95 0.01 250;
        --sidebar-border: 0.24 0.02 250;
        ```
        
    *   **Opción 2: Cambiar la envoltura en `tailwind.config.ts` a `hsl()`**:
        Modificar `tailwind.config.ts` para que mapee el sidebar usando la función `hsl()` nativa:
        ```typescript
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)",
          primary: "hsl(var(--sidebar-primary) / <alpha-value>)",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground) / <alpha-value>)",
          accent: "hsl(var(--sidebar-accent) / <alpha-value>)",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground) / <alpha-value>)",
          border: "hsl(var(--sidebar-border) / <alpha-value>)",
          ring: "hsl(var(--sidebar-ring) / <alpha-value>)",
        }
        ```

---

### Hallazgo B: Color de Texto Blanco Rígido (Fallo de Contraste en Modo Claro)

*   **Ruta de archivo exacta**:
    1.  `src/components/SidebarHeader.tsx` (Línea 51)
    2.  `src/components/settings/SettingsBranding.tsx` (Líneas 271, 291)
    3.  `src/components/inventory/MixManagement.tsx` (Líneas 102, 156, 220)
    4.  `src/pages/Settings.tsx` (Líneas 68, 97)
    5.  `src/components/dashboard/PaymentMethodsWidget.tsx` (Línea 59)
*   **Explicación del problema**: *Accesibilidad y Contraste (WCAG AAA)*. Estos archivos contienen encabezados y elementos informativos con la clase de Tailwind `text-white` codificada directamente en duro. Al cambiar a modo claro, el fondo de las tarjetas y barras laterales pasa a ser blanco o gris muy claro. Esto produce un texto blanco sobre fondo blanco/claro, haciendo que el contenido sea completamente invisible o ilegible.
*   **Fragmento de código problemático**:
    *   *`src/components/SidebarHeader.tsx` (Línea 51)*:
        ```tsx
        <h2 className="text-sm font-extrabold text-white tracking-tight font-space-grotesk truncate uppercase italic" title={storeName || "OASIS EÓN HUB"}>
        ```
    *   *`src/components/settings/SettingsBranding.tsx` (Líneas 271, 291)*:
        ```tsx
        <h2 className="text-3xl font-black italic uppercase font-space-grotesk tracking-tight text-white leading-none">Global DNA Branding</h2>
        <CardTitle className="text-lg font-black italic uppercase font-space-grotesk tracking-widest text-white">Visual Identity Assets</CardTitle>
        ```
    *   *`src/components/inventory/MixManagement.tsx` (Líneas 102, 156, 220)*:
        ```tsx
        <h2 className="text-4xl font-black text-white font-space-grotesk mb-3 tracking-tighter italic uppercase">
        <p className="text-5xl font-black font-space-grotesk italic tracking-tighter text-white">
        <TableCell className="px-10 font-black font-space-grotesk italic uppercase text-white group-hover:text-primary transition-colors">
        ```
    *   *`src/pages/Settings.tsx` (Líneas 68, 97)*:
        ```tsx
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black font-space-grotesk italic tracking-tighter uppercase text-white mb-2" ...>
        className="... data-[state=active]:text-white ..."
        ```
    *   *`src/components/dashboard/PaymentMethodsWidget.tsx` (Línea 59)*:
        ```tsx
        <p className="text-[20px] lg:text-[24px] font-black tracking-tighter text-white font-space-grotesk italic pr-1">
        ```
*   **Solución concreta paso a paso**:
    Reemplazar el color blanco estático por clases de color que respondan semánticamente al tema activo o restringirlo al modo oscuro mediante el prefijo `dark:`:
    1.  En `SidebarHeader.tsx`, cambiar `text-white` por `text-sidebar-foreground` o `text-foreground`.
    2.  En `SettingsBranding.tsx` y `MixManagement.tsx`, cambiar `text-white` por `text-foreground` o `dark:text-white`.
    3.  En `Settings.tsx` para las pestañas de navegación activa, cambiar `data-[state=active]:text-white` por `data-[state=active]:text-primary` o `data-[state=active]:text-foreground`.
    4.  En `PaymentMethodsWidget.tsx`, cambiar `text-white` por `text-card-foreground` o `text-foreground`.

---

### Hallazgo C: Fallo de Accesibilidad por Tema Mixto en Popover de Toppings

*   **Ruta de archivo exacta**: `src/components/pos/cart/CartItemList.tsx`
*   **Explicación del problema**: *Accesibilidad y Contraste*. El panel emergente (Popover) para seleccionar ingredientes adicionales (toppings) tiene un fondo oscuro rígido (`bg-slate-950/95`) y texto general en blanco (`text-white`). Sin embargo, los botones dentro del Popover usan la clase de color semántico `text-foreground/80`. En modo claro, la variable de color `--foreground` es oscura (casi negra), lo que produce texto negro sobre un fondo gris muy oscuro, resultando en texto ilegible.
*   **Fragmento de código problemático**:
    ```tsx
    <PopoverContent className="w-64 bg-slate-950/95 border-white/10 backdrop-blur-md p-3 text-white rounded-xl shadow-xl z-50">
      ...
      className={cn(
        "w-full flex items-center justify-between p-2 rounded-lg text-xs font-semibold font-dm-sans transition-all active:scale-[0.98]",
        isSelected
          ? "bg-primary/20 text-primary border border-primary/30"
          : "bg-muted/50 hover:bg-muted text-foreground/80 hover:text-foreground border border-transparent"
      )}
    ```
*   **Solución concreta paso a paso**:
    *   **Opción A (Hacer el Popover adaptable al tema)**:
        Reemplazar las clases de fondo oscuro y bordes rígidos por clases de tema semántico para el Popover:
        Cambiar `bg-slate-950/95 border-white/10 text-white` por `bg-popover border-border text-popover-foreground`.
    *   **Opción B (Mantener el Popover oscuro, forzando texto claro)**:
        Si se prefiere mantener el diseño del Popover siempre oscuro, se debe forzar que el texto de los botones también sea claro, ignorando el estado de modo claro:
        Reemplazar `text-foreground/80 hover:text-foreground` por `text-white/80 hover:text-white` o `dark:text-foreground/80 dark:hover:text-foreground text-white/80 hover:text-white`.

---

### Hallazgo D: Bordes y Divisores Invisibles en Modo Claro

*   **Ruta de archivo exacta**: `src/components/pos/cart/CartTotals.tsx`
*   **Explicación del problema**: *Consistencia Visual*. Las líneas divisorias y separadores decorativos del carrito de compras usan la clase `border-white/5` (blanco con 5% de opacidad). En el modo oscuro funciona de manera sutil, pero en el modo claro, al presentarse sobre fondos claros, el borde blanco translúcido se vuelve totalmente invisible, perdiéndose la separación estructural de los totales de compra.
*   **Fragmento de código problemático**:
    *   *`src/components/pos/cart/CartTotals.tsx` (Líneas 32, 52, 72)*:
        ```tsx
        <div className="space-y-6 pt-6 border-t border-white/5">
        className="h-8 w-8 px-0 text-[10px] font-bold border-l border-white/5 text-primary"
        <div className="flex justify-between items-center pt-4 border-t border-white/5 mt-4">
        ```
*   **Solución concreta paso a paso**:
    Reemplazar los bordes rígidos blancos translúcidos por clases de borde semánticas que utilicen la variable de borde global `--border` del tema:
    Cambiar `border-white/5` y `border-l border-white/5` por `border-border/50` o `border-border` en las líneas 32, 52 y 72.

---

### Hallazgo E: Temas Oscuros en Duro en la Vista de Caja Chica e Información del Turno

*   **Ruta de archivo exacta**:
    1.  `src/pages/CashRegister.tsx` (Línea 58)
    2.  `src/components/cash/CashLiquidityCard.tsx` (Líneas 28, 39, 48, 62)
    3.  `src/components/cash/CashTransactionTable.tsx` (Líneas 63, 66, 67, 89, 151)
    4.  `src/components/ActiveShiftCard.tsx` (Líneas 90, 132, 174)
*   **Explicación del problema**: *Consistencia Visual*. La página completa de Caja Chica (Cash Register), así como sus componentes internos (tarjetas de liquidez, tabla de transacciones de efectivo) y las tarjetas del estado del turno activo, tienen colores oscuros definidos de forma rígida en el código (`bg-[#0F1117]`, `bg-[#1C1F26]`, `bg-slate-950/40`, `text-white`). En modo claro, esto rompe la consistencia general del sistema, haciendo que la sección de efectivo sea una "isla oscura" en medio de una interfaz clara.
*   **Fragmento de código problemático**:
    *   *`src/pages/CashRegister.tsx` (Línea 58)*:
        ```tsx
        className="min-h-screen bg-[#0F1117] text-white p-6 lg:p-10 space-y-8"
        ```
    *   *`src/components/cash/CashLiquidityCard.tsx` (Líneas 28, 39, 48, 62)*:
        ```tsx
        <Card className="bg-[#1C1F26] border border-white/10 rounded-[3rem] shadow-pro relative overflow-hidden glass-pro dim-layering group">
        className="... text-white flex items-baseline gap-2"
        className="bg-white/5 text-white/60 border-white/10 ..."
        className="... text-white/40 ..."
        ```
    *   *`src/components/cash/CashTransactionTable.tsx` (Líneas 63, 66, 67, 89, 151)*:
        ```tsx
        <Card className="bg-[#1C1F26] border border-white/10 rounded-[3rem] p-10 shadow-pro glass-pro overflow-hidden">
        <h2 className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight text-white mb-1">
        <p className="text-[10px] font-black text-white/40 ...">
        ```
    *   *`src/components/ActiveShiftCard.tsx` (Líneas 90, 132, 174)*:
        ```tsx
        <div className="bg-slate-950/40 border border-amber-500/20 ...">
        <div className="bg-slate-950/40 border border-emerald-500/20 ...">
        <div className="bg-slate-950/40 border border-rose-500/20 ...">
        ```
*   **Solución concreta paso a paso**:
    Adaptar las clases rígidas utilizando los tokens semánticos correspondientes en Tailwind:
    1.  En `CashRegister.tsx`, cambiar `bg-[#0F1117] text-white` por `bg-background text-foreground`.
    2.  En `CashLiquidityCard.tsx` y `CashTransactionTable.tsx`, cambiar `bg-[#1C1F26]` por `bg-card` y `border-white/10` por `border-border`.
    3.  Cambiar `text-white` por `text-foreground`, `text-white/60` por `text-muted-foreground` y `text-white/40` por `text-muted-foreground/60`.
    4.  En `ActiveShiftCard.tsx`, cambiar los contenedores `bg-slate-950/40` por `bg-card/40` o `bg-muted/40`.

---

### Hallazgo F: Texto de Input Invisible en Diálogos de ActiveShiftCard

*   **Ruta de archivo exacta**: `src/components/ActiveShiftCard.tsx`
*   **Explicación del problema**: *Accesibilidad y Contraste*. En los diálogos modales para la apertura y el cierre de turnos de caja, los campos de entrada de texto (el monto base de caja y las notas) tienen su fondo fijado en color negro (`bg-slate-950`). Sin embargo, no se especifica de manera estática su color de texto, por lo que heredan la variable de color dinámico `--foreground`. En modo claro, la letra ingresada se vuelve negra, resultando en texto negro sobre fondo negro (invisible para el cajero).
*   **Fragmento de código problemático**:
    *   *`src/components/ActiveShiftCard.tsx` (Líneas 214, 243, 252)*:
        ```tsx
        className="bg-slate-950 border-white/10 h-12 rounded-xl text-sm font-semibold tracking-wider font-space-grotesk text-center"
        className="bg-slate-950 border-white/10 h-12 rounded-xl text-xs font-semibold"
        ```
*   **Solución concreta paso a paso**:
    Eliminar la clase de fondo oscuro fijo en los campos de entrada y reemplazarlos por clases adaptables que usen los estilos base de Tailwind para inputs o especificar el color del texto:
    *   Cambiar `bg-slate-950 border-white/10` por `bg-background border-border text-foreground` o usar las clases utilitarias de inputs predefinidas del tema.

---

### Hallazgo G: Envoltura HSL Incorrecta para Gráficos Recharts (Dashboard)

*   **Ruta de archivo exacta**:
    1.  `src/components/dashboard/SalesChartWidget.tsx` (Líneas 80–89)
    2.  `src/components/dashboard/PaymentMethodsWidget.tsx` (Líneas 83–91)
*   **Explicación del problema**: *Integridad CSS e Interfaz Gráfica*. En los componentes de gráficos (Recharts) del Dashboard, los estilos del Tooltip se definen en línea utilizando declaraciones del tipo `hsl(var(--card))` y `hsl(var(--border))`. Dado que el archivo de estilos globales `src/index.css` define estas variables en el formato OKLCH, el navegador evalúa esto de forma errónea (p. ej. `hsl(1.0 0.0 0)`), lo que hace que los tooltips pierdan sus fondos y bordes correctos, quedando visualmente rotos.
*   **Fragmento de código problemático**:
    *   *`SalesChartWidget.tsx` (Líneas 80–89)*:
        ```tsx
        contentStyle={{
          backgroundColor: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '16px',
        }}
        itemStyle={{ color: 'hsl(var(--foreground))' }}
        labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
        ```
    *   *`PaymentMethodsWidget.tsx` (Líneas 83–91)*:
        ```tsx
        contentStyle={{
          backgroundColor: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '16px',
        }}
        itemStyle={{ color: 'hsl(var(--foreground))' }}
        ```
*   **Solución concreta paso a paso**:
    Ajustar los estilos inline de Recharts para que invoquen el envoltorio de color adecuado (`oklch`) en lugar de `hsl`:
    1.  Cambiar `hsl(var(--card))` por `oklch(var(--card))`.
    2.  Cambiar `hsl(var(--border))` por `oklch(var(--border))`.
    3.  Cambiar `hsl(var(--foreground))` por `oklch(var(--foreground))`.
    4.  Cambiar `hsl(var(--muted-foreground))` por `oklch(var(--muted-foreground))`.

---

### Hallazgo H: Desbordamiento del Centro de Control Flotante en Pantallas Móviles

*   **Ruta de archivo exacta**: `src/components/Layout.tsx`
*   **Explicación del problema**: *Diseño Responsivo (Mobile Overflow)*. El Centro de Control Flotante (Floating Control Center), que contiene el selector de tienda y los botones del sistema, tiene un posicionamiento absoluto estático a la izquierda que depende de si la barra lateral está abierta (`left-[17rem]`). En pantallas móviles de 360px de ancho, cuando la barra lateral se abre, este widget se posiciona a partir de los 272px (`17rem`), lo que le deja un ancho disponible de apenas 88px, causando que se salga del borde derecho de la pantalla y tape la cabecera del módulo actual.
*   **Fragmento de código problemático**:
    *   *`src/components/Layout.tsx` (Líneas 266–269)*:
        ```tsx
        className={cn(
          "fixed top-4 z-[60] flex items-center gap-2 p-1.5 bg-slate-950/40 backdrop-blur-xl border border-white/10 rounded-2xl animate-pro-in transition-all duration-500",
          isSidebarOpen ? "left-[17rem]" : "left-16"
        )}
        ```
*   **Solución concreta paso a paso**:
    *   Ocultar el panel flotante fijo en pantallas pequeñas añadiendo la clase `hidden lg:flex` a su contenedor en `Layout.tsx`.
    *   Integrar los controles que este contiene (como el selector de sucursal/tienda y las notificaciones) dentro del menú hamburguesa, la cabecera móvil nativa o el propio panel de la barra lateral responsive cuando el tamaño sea inferior a `lg`.

---

### Hallazgo I: Filtros de Inventario con Ancho Fijo en Dispositivos Móviles

*   **Ruta de archivo exacta**: `src/components/inventory/InventoryFilters.tsx`
*   **Explicación del problema**: *Diseño Responsivo y Usabilidad*. Los filtros de inventario (el selector de nodos/sucursales y el tipo de producto) usan clases con anchos estáticos rígidos (`w-[200px]` y `w-[180px]`). En dispositivos móviles con pantallas estrechas, esto provoca que los filtros se apilen de manera desordenada y empujen otros elementos, impidiendo un diseño limpio y compacto.
*   **Fragmento de código problemático**:
    *   *`src/components/inventory/InventoryFilters.tsx` (Líneas 46, 60)*:
        ```tsx
        <SelectTrigger className="w-[200px] h-16 bg-muted/40 ...">
        <SelectTrigger className="w-[180px] h-16 bg-muted/40 ...">
        ```
*   **Solución concreta paso a paso**:
    Hacer que los selectores ocupen todo el ancho disponible en móviles y adopten el tamaño estático original en pantallas superiores mediante clases responsivas:
    1.  Cambiar `w-[200px]` por `w-full sm:w-[200px]`.
    2.  Cambiar `w-[180px]` por `w-full sm:w-[180px]`.
    3.  Asegurar que el contenedor padre de los filtros use clases de flexbox adaptable como `flex flex-col sm:flex-row gap-3`.

---

### Hallazgo J: Altura Rígida y Recorte de Datos en el Dashboard

*   **Ruta de archivo exacta**: `src/index.css`
*   **Explicación del problema**: *Usabilidad y Control de Scroll*. La cuadrícula principal del Dashboard tiene un alto rígido calculado con la expresión `calc(100vh - 220px)` y un mínimo de alto de `700px`. Además, los widgets internos (como la lista de ventas recientes o el ranking de productos más populares) tienen el valor `overflow-hidden` aplicado. Esto provoca que si hay más datos de los previstos, las filas al final de las tablas queden completamente recortadas visualmente sin que el usuario pueda hacer scroll para visualizarlas.
*   **Fragmento de código problemático**:
    *   *`src/index.css` (Líneas 292–299)*:
        ```css
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          grid-template-rows: auto repeat(2, 1fr);
          gap: 1.5rem;
          height: calc(100vh - 220px);
          min-height: 700px;
        }
        ```
*   **Solución concreta paso a paso**:
    *   Cambiar la altura estática de la cuadrícula principal para que crezca libremente con el contenido de las tarjetas en pantallas medianas/pequeñas:
        Cambiar `height: calc(100vh - 220px)` por `height: auto` en `src/index.css`.
    *   Para mantener el tamaño controlado de los widgets de tablas, habilitar el scroll vertical de forma interna en sus contenedores internos (p. ej. en `RecentSalesWidget.tsx` y `PopularProductsWidget.tsx`) añadiendo la clase de Tailwind `overflow-y-auto max-h-[300px]` o `flex-1 overflow-y-auto`.

---

### Hallazgo K: Relleno Excesivo de Tarjetas de Inventario en Móviles

*   **Ruta de archivo exacta**: `src/components/inventory/InventoryGrid.tsx`
*   **Explicación del problema**: *Diseño Responsivo e Inteligencia de Espacio*. Las tarjetas que muestran los elementos del inventario usan esquinas redondeadas exageradas (`rounded-[3rem]`) y un espaciado interno estático muy amplio (`p-10` = 40px). En pantallas de teléfonos móviles (donde las tarjetas se muestran en una sola columna), este espaciado lateral consume 80px de los ~320px-360px disponibles del ancho total, dejando muy poco espacio útil para la información. Como consecuencia, el texto de los nombres de los insumos y las existencias numéricas sufren cortes o saltos de línea incomprensibles.
*   **Fragmento de código problemático**:
    *   *`src/components/inventory/InventoryGrid.tsx` (Línea 39)*:
        ```tsx
        className={cn(
          "bg-muted border rounded-[3rem] p-10 glass-pro group relative overflow-hidden transition-all duration-500",
          ...
        )}
        ```
*   **Solución concreta paso a paso**:
    Ajustar el espaciado interno y el redondeado de los bordes con clases responsivas de Tailwind para que sean más compactos en dispositivos móviles y recuperen su amplitud en pantallas de escritorio:
    *   Cambiar `rounded-[3rem] p-10` por `rounded-2xl lg:rounded-[3rem] p-5 lg:p-10`.

---

## 4. Conclusiones y Próximos Pasos

El diseño visual oscuro (Dark Mode) de Oasis Eón POS en Pekao Granizados es muy sofisticado y transmite una excelente sensación de marca futurista. Sin embargo, para convertir esta interfaz en una herramienta de grado de producción que cumpla con los estándares de accesibilidad y usabilidad móvil, se recomiendan los siguientes pasos inmediatos:

1.  **Sincronización de Formatos de Color**: Asegurar que todas las variables del tema de Tailwind se configuren utilizando la función de color adecuada (`oklch()` o `hsl()`) tanto en CSS como en archivos de gráficos (Recharts).
2.  **Eliminar Colores Estáticos en Componentes de Texto y Caja Chica**: Migrar de clases como `text-white` y `bg-slate-950` a clases adaptables del tema (`text-foreground`, `bg-card`, `bg-background`). Esto garantizará una transición perfecta cuando el usuario cambie a Light Mode.
3.  **Refactorizar los Diálogos e Inputs**: Asegurar que cualquier campo interactivo (diálogos de turnos, toppings) defina explícitamente colores de texto y fondo adaptables para evitar escenarios de texto invisible.
4.  **Optimizar para Vista Móvil**:
    *   Hacer responsivo el Centro de Control Flotante (ocultándolo en móviles e integrando sus acciones en el menú principal).
    *   Implementar rellenos y anchos responsivos (`p-5 lg:p-10` y `w-full sm:w-[200px]`) en filtros y tarjetas de inventario.
    *   Dotar de flexibilidad de crecimiento al Dashboard (`height: auto` con scroll local en widgets pesados).

Al implementar estas soluciones paso a paso, Pekao Granizados mantendrá su identidad estética premium y ofrecerá una experiencia accesible y usable en cualquier pantalla y modo de color.
