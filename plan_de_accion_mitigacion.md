# Plan de Acción — Mitigación de Deuda Técnica
## Pekao Granizados POS

**Fecha:** 17 de agosto de 2026
**Basado en:** análisis técnico del frontend (React) y backend (Supabase) del repositorio.

---

## 1. Objetivo

Reducir el riesgo de regresión en las áreas más frágiles del sistema (lógica de inventario/ventas y RLS) y elevar la mantenibilidad del frontend, sin detener el desarrollo de features ni arriesgar la operación actual del negocio. El plan está diseñado para ejecutarse **por fases incrementales**, no como una reescritura.

## 2. Resumen de hallazgos que originan este plan

- Tres funciones RPC (`process_sale`, `update_order_with_stock`, `cancel_sale_with_stock_restore`) duplican la misma lógica de negocio y han sufrido regresiones repetidas (pérdida de fórmula de conversión ml/oz, pérdida de chequeo de rol, doble descuento) en al menos 12 migraciones entre abril y agosto 2026.
- No existen pruebas automatizadas para esa lógica crítica de dinero/inventario, ni para hooks o componentes React.
- Política RLS de `suppliers` otorga acceso total a cualquier usuario autenticado, sin distinción de rol o tienda.
- Existen correcciones aplicadas fuera del flujo de migraciones versionado (`apply_tip_fix.sql` en la raíz, script `fix_tanks.ts` dentro de `src/`).
- 20+ componentes propios superan el límite de 400 líneas fijado en `CLAUDE.md`, concentrados en diálogos/formularios complejos (`ProductFormDialog`, `SplitBillDialog`, `PaymentDialog`) y en `Settings/`.
- 88 usos de `any` y 62 errores de ESLint pendientes según el reporte del propio equipo (`lint_results.txt`).
- Un bug de mutación de estado anidado confirmado en `ProductFormDialog.tsx` (`updated[i].products.push(...)`).
- Un `catch (_) {}` vacío en `PrintManagerModule.tsx` que silencia errores.
- Solo 27 de los hooks de datos usan React Query directamente; el resto usa `useEffect` + `useState` manual, con inconsistencia arquitectónica.

## 3. Principio rector

**Ningún cambio en la lógica de venta/inventario se hace sin una prueba de caracterización previa que reproduzca el comportamiento actual.** Esta regla es la respuesta directa al patrón histórico de regresiones del proyecto y aplica a partir de la Fase 0 hacia adelante.

---

## Fase 0 — Red de seguridad (prerequisito, no opcional)

**Objetivo:** que ningún cambio futuro en inventario/ventas pueda romper algo sin que un test lo detecte antes de llegar a producción.

| Acción | Detalle | Esfuerzo estimado |
|---|---|---|
| Tests de caracterización de `process_sale` | Cubrir: descuento simple, descuento con `size_multiplier`, descuento de mezcla en ml, producto sin `product_id` (servicios), idempotencia por `idempotency_key` | 3-5 días |
| Tests de `cancel_sale_with_stock_restore` | Cubrir: restauración de stock, restauración de mezcla, rechazo si el rol no está autorizado | 2-3 días |
| Tests de `update_order_with_stock` | Cubrir: recálculo de inventario al editar una orden ya creada | 2-3 días |
| Configurar entorno de pruebas contra Supabase local o base de pruebas | Requisito técnico para lo anterior; usar `supabase start` local con las migraciones aplicadas | 1-2 días |

**Criterio de salida de esta fase:** las tres RPC tienen cobertura de los escenarios históricamente rotos, y esos tests corren en un pipeline (aunque sea manual al inicio).

---

## Fase 1 — Quick wins de seguridad y orden (bajo esfuerzo, alto retorno)

Se pueden ejecutar en paralelo a la Fase 0, no dependen de ella.

| Acción | Detalle | Esfuerzo |
|---|---|---|
| Cerrar política RLS de `suppliers` | Restringir `USING (true)` actual a roles específicos (`admin`, `manager`, `store_manager`) y, si aplica, por tienda | 0.5 día |
| Formalizar `apply_tip_fix.sql` | Convertirlo en una migración versionada en `supabase/migrations/` o confirmar que ya fue aplicado y eliminarlo del root | 0.5 día |
| Retirar `src/fix_tanks.ts` del árbol de producción | Moverlo a `scripts/debug/` junto con los demás scripts de diagnóstico, o eliminarlo si ya cumplió su propósito | 0.5 día |
| Corregir `catch (_) {}` vacío en `PrintManagerModule.tsx` | Loguear el error (Sentry, ya está integrado en el proyecto) y notificar al usuario si aplica | 0.5 día |
| Revisar alcance de política de `machine_tanks` | Confirmar que el acceso global por rol "manager"/"owner" es intencional en el modelo multi-tienda actual | 1 día |
| Auditar roles con nombre libre (`text` en vez de enum) | Verificar que no haya *typos* de rol entre frontend, RPCs y Edge Functions (`admin`, `manager`, `store_manager`, `owner`) | 1 día |

**Criterio de salida:** cero políticas RLS con `USING (true)` sin justificación explícita documentada; cero artefactos SQL fuera de `supabase/migrations/`.

---

## Fase 2 — Consolidación de la lógica de inventario/ventas (riesgo medio, valor alto)

**Depende de:** Fase 0 completa.

| Acción | Detalle | Esfuerzo |
|---|---|---|
| Extraer lógica común de descuento/restauración de stock a una función auxiliar única (`_apply_stock_delta` o similar) | Reutilizada por `process_sale`, `update_order_with_stock` y `cancel_sale_with_stock_restore` | 3-5 días |
| Unificar el manejo de las tres fuentes de stock (`store_stock`, `inventory_items`, `machine_tanks`) en un solo punto de entrada | Reduce el riesgo de que una futura feature toque una tabla y olvide las otras dos | 3-5 días |
| Ejecutar la suite de la Fase 0 contra el código refactorizado | Debe pasar sin modificaciones en las expectativas | 1-2 días |
| Code review dedicado con foco en concurrencia | Confirmar que se mantienen `FOR UPDATE` y el orden determinístico de locks ya ganado en migraciones previas | 1 día |

**Criterio de salida:** una sola implementación de la lógica de stock, cubierta por los tests de la Fase 0, sin duplicación entre las tres RPC.

---

## Fase 3 — Descomposición de componentes grandes (riesgo bajo, mecánico)

Puede ejecutarse en paralelo a las fases anteriores, un archivo por sprint, sin bloquear otras entregas.

**Orden sugerido por impacto (tamaño y frecuencia de uso):**

1. `src/pages/DigitalMenu.tsx` (1064 líneas)
2. `src/components/products/ProductFormDialog.tsx` (1024 líneas) — aprovechar para corregir también el bug de mutación anidada (`updated[i].products.push`)
3. `src/components/pos/SplitBillDialog.tsx` (1000 líneas)
4. `src/pages/Inventory.tsx` (829 líneas)
5. `src/pages/PrintManagerModule.tsx` (805 líneas)
6. `src/components/settings/CategoryManager.tsx` y `BusinessSettings.tsx` (~730 líneas cada uno)
7. Resto de la lista (`Layout.tsx`, `SettingsBranding.tsx`, `ReceiptTemplateSettings.tsx`, `CashReconciliations.tsx`, `ProductGrid.tsx`, `InventoryEntry.tsx`, `SizesSettings.tsx`, `ProductTypesMaster.tsx`, `useProducts.ts`, `usePOS.ts`, `Suppliers.tsx`, `usePreparation.ts`, `PaymentDialog.tsx`)

**Método:** extraer subcomponentes por responsabilidad visual/lógica (siguiendo el patrón ya usado en `pos/cart/` con `CartHeader`, `CartItemList`, `CartTotals`), sin cambiar comportamiento. Cada extracción debe quedar por debajo de 400 líneas y no requiere tests nuevos si no cambia lógica, solo verificación visual manual o snapshot.

**Criterio de salida:** cero archivos propios por encima de 400 líneas (excluyendo tipos generados y componentes de librería como `ui/sidebar.tsx`).

---

## Fase 4 — Calidad de tipos y lint (esfuerzo continuo de fondo)

No requiere sprint dedicado; se integra al flujo normal de desarrollo.

| Acción | Detalle |
|---|---|
| Resolver los 62 errores de ESLint reportados en `lint_results.txt` | Priorizar por archivo tocado en cada PR ("boy scout rule": si tocas el archivo, arregla sus lint errors) |
| Reducir progresivamente los 88 usos de `any` | Empezar por los hooks de dominio crítico (`useCart`, `useCashRegister`, `useOrderItems`) antes que por componentes de UI pura |
| Regenerar y comparar `tsc_results.txt` / `eslint_report.json` | Actualmente vacíos; volver a ejecutar y dejar como referencia de línea base para medir progreso |

**Criterio de salida:** 0 errores de ESLint en el reporte; `any` reducido a casos justificados y documentados (ej. tipos de librerías de terceros sin tipado).

---

## Fase 5 — Consistencia de arquitectura de datos (esfuerzo continuo, sin urgencia)

| Acción | Detalle |
|---|---|
| Migrar hooks con `useEffect` + `useState` manual a `useQuery` (React Query) | Empezar por los de mayor tráfico (`useCashRegister`, `useProducts`) cuando se toquen por otra razón, no como proyecto aislado |
| Revisar componentes con nombres solapados (`RecipeBuilder`, `RecipeManager`, `RecipeManagement`; `BrandingManager` vs. `SettingsBranding`) | Confirmar si hay lógica duplicada y consolidar si corresponde |

**Criterio de salida:** patrón de fetching unificado en los módulos de mayor tráfico; sin componentes duplicados sin justificación.

---

## 4. Matriz de priorización

| Fase | Impacto | Esfuerzo | Riesgo de ejecutarla | Riesgo de NO ejecutarla |
|---|---|---|---|---|
| 0 — Tests de caracterización | Alto | Medio (1-2 semanas) | Bajo | Alto — cualquier cambio futuro en ventas puede repetir bugs históricos |
| 1 — Quick wins de seguridad | Alto | Bajo (días) | Muy bajo | Medio-alto — exposición de datos de proveedores, artefactos SQL huérfanos |
| 2 — Consolidación RPC | Alto | Medio-alto (1-2 semanas) | Medio (mitigado por Fase 0) | Alto — la causa raíz de las regresiones históricas sigue activa |
| 3 — Descomposición de componentes | Medio | Bajo-medio (continuo) | Muy bajo | Bajo — solo afecta mantenibilidad, no funcionalidad |
| 4 — Tipos y lint | Medio | Bajo (continuo) | Muy bajo | Bajo-medio — bugs silenciosos por tipado laxo |
| 5 — Consistencia de datos | Bajo-medio | Bajo (continuo) | Muy bajo | Bajo |

**Orden de ejecución recomendado:** Fase 0 y Fase 1 en paralelo desde ya → Fase 2 al cerrar Fase 0 → Fases 3, 4 y 5 en paralelo y de forma continua, intercaladas con desarrollo de features.

## 5. Qué NO hacer

- No reescribir el sistema desde cero: el diseño base es razonable y el negocio depende de él en producción.
- No tocar `process_sale`, `update_order_with_stock` o `cancel_sale_with_stock_restore` sin los tests de la Fase 0 en su lugar.
- No dedicar un sprint completo solo a lint/tipos: se disuelve mejor como práctica continua ligada a cada PR.

## 6. Definición de éxito (3-6 meses)

- Cero regresiones nuevas en lógica de inventario/ventas desde la implementación de la Fase 0.
- Cero políticas RLS con `USING (true)` sin justificación documentada.
- Cero archivos propios por encima de 400 líneas.
- Reporte de ESLint en 0 errores.
- Al menos un pipeline (manual o CI) que ejecute los tests de caracterización antes de cada cambio a las RPC críticas.
