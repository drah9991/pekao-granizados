# Original User Request

## 2026-06-24T16:04:00Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Wait for the teamwork_preview subagent to complete the audit.

Realizar una auditoría completa de la Interfaz de Usuario (UI) y la Experiencia de Usuario (UX) del sistema, enfocándose especialmente en el diseño responsivo y la consistencia visual. El objetivo es generar un reporte exhaustivo con sugerencias de código paso a paso sin realizar modificaciones directas al código fuente.

Working directory: c:\Users\pc\OneDrive - Cuidado Seguro en Casa IPS\Documentos\Codigos\pekao\pekao-granizados
Integrity mode: development

## Requirements

### R1. Auditoría UI/UX
Analizar los componentes principales y las páginas del sistema (React + Tailwind CSS) para detectar problemas de responsividad, accesibilidad, jerarquía visual y uso de colores/espacios.

### R2. Reporte de Sugerencias
Generar un único archivo Markdown llamado `ui_ux_audit_report.md` que contenga los hallazgos. Para cada problema encontrado, proporcionar una explicación clara y el código exacto (clases de Tailwind o estructura de React) necesario para solucionarlo. No modificar ningún archivo de código del proyecto.

## Acceptance Criteria

### Verificación del Reporte
- [ ] Existe un archivo `ui_ux_audit_report.md` en el directorio de trabajo.
- [ ] El reporte analiza al menos 5 vistas o componentes clave del sistema (por ejemplo, el POS, el Dashboard, la configuración, modales, etc.).
- [ ] Las sugerencias incluyen rutas de archivos reales y ejemplos concretos de código (ej: de qué clases de Tailwind cambiar a cuáles) en lugar de recomendaciones vagas.
- [ ] El código fuente del proyecto permanece intacto (0 archivos modificados).

---

## 2026-06-30T15:31:00Z

<USER_REQUEST>
Realizar una auditoría e implementación holística y profesional para asegurar que todos los elementos del inventario (tanto unidades de stock físico como ingredientes/mezclas de recetas) se descuenten correctamente y en tiempo real al procesar ventas y anulaciones en el POS. El equipo debe construir scripts de prueba automatizados en Bun para validar la lógica.

Working directory: c:\Users\pc\OneDrive - Cuidado Seguro en Casa IPS\Documentos\Codigos\pekao\pekao-granizados
Integrity mode: demo

## Requirements

### R1. Auditoría del Ciclo de Descuento de Inventario
Analizar el comportamiento del backend (Supabase RPCs, migraciones y funciones) y el frontend (hooks de POS, IndexedDB offline y componentes) para verificar la consistencia de los descuentos de inventario de unidades (`store_stock`) y mezclas (`inventory_items`, `recipes`, `machine_tanks`).

### R2. Sincronización en Tiempo Real y Robustez
Garantizar que tras cualquier venta o anulación:
1. El inventario se actualice en la base de datos de manera atómica (evitando condiciones de carrera).
2. Los componentes del POS (como indicadores de tanques y grids de stock) reflejen los nuevos niveles en tiempo real sin requerir recargas manuales.

### R3. Scripts de Verificación Automatizados (Bun)
Desarrollar un conjunto de pruebas automatizadas escritas en TypeScript utilizando la herramienta de ejecución de pruebas de Bun (`bun test`). Las pruebas deben simular ventas (incluyendo productos unitarios, granizados con recetas/toppings y servicios con productos nulos) y anulaciones, y verificar programáticamente que el inventario resultante en la base de datos sea matemáticamente exacto.

## Acceptance Criteria

### Consistencia de Datos e Inventario
- [ ] La facturación de un producto con receta descuenta de manera exacta el volumen correspondiente en la tabla `machine_tanks` y en `inventory_items`.
- [ ] La anulación de una venta restaura el inventario exacto a las unidades y mezclas correspondientes.
- [ ] La interfaz del POS reacciona de forma inmediata a los cambios mediante eventos de Supabase Realtime sin desfases ni bloqueos.

### Pruebas Automatizadas
- [ ] Existe un archivo de prueba (ej: `src/lib/inventory-sync.test.ts`) ejecutable mediante `bun test`.
- [ ] La suite de pruebas cubre al menos 3 escenarios: venta unitaria, venta con receta/mezcla y anulación de venta.
- [ ] Todas las pruebas de la suite de verificación pasan con éxito en el entorno local.
</USER_REQUEST>

