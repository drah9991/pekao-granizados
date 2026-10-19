# Plan: activar RLS en las 18 tablas de staging

**Estado:** borrador probado en staging con reversión total. **No aplicado.**
**Ámbito:** solo staging (`llzdxcujvagctnzjymqh`). Producción tiene otras políticas (`tenant_*`) y no se revisó.

## Por qué

En staging, 18 tablas tienen RLS desactivado. Con la clave pública (que va dentro del bundle web) cualquiera puede:

- darse rol de admin insertando en `user_roles`;
- crear pedidos directamente en `orders`, saltándose `create_mobile_order`;
- leer y modificar turnos de caja, gastos, inventario, recetas y perfiles.

10 de esas tablas ya tienen políticas escritas que nunca surtieron efecto; las otras 8 no tienen ninguna. Las migraciones del repo sí definen políticas para casi todas, pero no llegaron a staging.

## Archivos

| Archivo | Para qué |
|---|---|
| `supabase/staging/rls_lockdown.sql` | La migración (solo staging). Fuera de `supabase/migrations/` a propósito: en producción **ampliaría** accesos, porque las políticas permisivas se combinan con OR. |
| `supabase/staging/rls_lockdown.checks.sql` | 69 comprobaciones por rol. |
| `supabase/staging/build-rls-test.sh` | Une migración y comprobaciones en un `DO` que termina con `RAISE EXCEPTION` (todo se revierte). |
| `supabase/staging/rls_lockdown_rollback.sql` | Reversión de emergencia si el POS falla tras aplicar. |
| `supabase/staging/sales_functions_guard.sql` | Fase 3: las funciones de ventas solo aceptan personal (o `service_role`). |

## Modelo de acceso

Es el que el POS ya asume; las políticas solo lo hacen cumplir.

- **Personal:** tiene fila en `user_roles` (admin, manager, cashier, driver) o es superadmin.
- **Sede del usuario:** `profiles.store_id`; el personal la elige al iniciar sesión.
- **Acceso a una sede:** superadmin, admin, o personal cuya sede es esa.
- **Privilegiado:** superadmin, admin o gerente.

Cinco funciones `SECURITY DEFINER` (`rls_has_any_role`, `rls_is_superadmin`, `rls_is_staff`, `rls_is_privileged`, `rls_can_access_store`) leen roles y perfil sin pasar por RLS. Eso elimina la recursión infinita que hoy tendría `user_roles` al activar RLS: su política actual se consulta a sí misma.

## Políticas por tabla

| Tabla | Leer | Escribir | Cambio respecto a hoy |
|---|---|---|---|
| `user_roles` | lo propio; privilegiados todo | admin/superadmin todo; **gerente solo asigna o quita cajero y domiciliario** | Cierra la escalada: hoy un gerente puede darse admin. Quita la recursión. |
| `profiles` | lo propio; privilegiados todo | lo propio; privilegiados todo | Usa las funciones auxiliares. El trigger `guard_profile_privileges` sigue protegiendo `is_superadmin` y `store_id`. |
| `cash_turns` | personal de la sede | abrir, pausar y cerrar: personal de la sede | Sin borrado. |
| `expenses` | personal de la sede | privilegiado de la sede | Los cajeros ven gastos (dashboard del turno) pero no los registran: hoy solo `/expenses`, de admin/gerente, escribe. |
| `inventory_items` | personal de la sede | crear y editar: personal de la sede; borrar: privilegiado | Los cajeros mantienen la preparación de mezclas (`/preparation`). |
| `recipes` | personal | crear: privilegiado o vinculando un insumo de la propia sede; editar y borrar: privilegiado | |
| `movements` | (política actual) personal de la sede | insertar: personal de la sede; borrar: privilegiado | **Corrige** la política actual, que solo deja insertar a admin/gerente y rompería `/preparation` para cajeros. |
| `machine_tanks` | personal de la sede | privilegiado de la sede | Las políticas del repo usan roles `owner`/`store_manager`, que no existen en staging y darían error. |
| `categories` | activas: usuarios con sesión; todas: privilegiados | privilegiado | |
| `product_types_config` | todos, incluido anon (configuración no sensible) | privilegiado | |
| `sizes` | usuarios con sesión | privilegiado | |
| `sku_acronyms` | personal | privilegiado | |
| `stores` | anon: solo `id, name, address, currency, config` (marca en páginas públicas); con sesión: igual que hoy | sin cambios | anon deja de ver datos de suscripción. `config` hoy solo guarda `receipt_footer`; la clave del chatbot vive en `chatbot_secrets`. |
| `orders`, `order_items`, `invoices`, `store_stock` | políticas actuales | políticas actuales | Solo se activa RLS. |
| `schema_migrations` | nadie por la API | nadie por la API | Solo la usa `scripts/migrate-staging.js` con service role, que ignora RLS. |

**Defensa adicional:**

- Se revocan a `anon` los permisos de escritura sobre las 18 tablas.
- Se revoca a `anon` la ejecución de `process_sale`, `process_sale_with_stock`, `increment_inventory_stock`, `update_order_with_stock` y `cancel_sale_with_stock_restore`. Las cinco son `SECURITY DEFINER`, así que RLS no las frena.

## Resultados de la prueba (staging, revertida)

Se crearon usuarios temporales (cajero y gerente de la sede A, y un cliente sin rol) y datos en las sedes A y B. Se usó también el admin existente. Las **69** comprobaciones dieron el resultado esperado:

| Rol | Permitido | Bloqueado |
|---|---|---|
| anon | `public_menu` (5), `stores` sin columnas sensibles, `product_types_config` | leer `orders`, `profiles`, `cash_turns`; insertar en `orders` y `user_roles`; leer `stores.subscription_status` y `schema_migrations`; ejecutar `process_sale` |
| cliente | `sizes` | insertar en `user_roles` y `expenses`; leer `orders`, `cash_turns`, `inventory_items`, `user_roles`, `sku_acronyms` |
| cajero A | abrir y cerrar turno en A; ver gastos de A; crear y vaciar insumo en A; vincular receta; registrar movimiento; leer pedidos, tamaños, categorías activas, tipos, SKU, tanques y stock de A | turno en B; ver gastos, insumos y tanques de B; registrar gasto; crear insumo en B; borrar receta; darse rol; editar tamaños y categorías; ver categorías inactivas |
| gerente A | asignar cajero; leer `user_roles` y `profiles` sin recursión; registrar gasto en A; crear categoría; editar tamaños | asignar admin a otro o a sí mismo; quitar rol a un admin; gasto en B; ver turnos de B |
| admin | asignar admin; ver turnos e insumos de B; editar sede; ver perfiles y pedidos; actualizar pedidos | — |

Después de la prueba, staging quedó igual que antes: 18 tablas sin RLS, sin usuarios ni filas de prueba, con la política original.

Para repetirla:

```bash
bash supabase/staging/build-rls-test.sh > /tmp/rls-test.sql
```

y ejecuta el contenido en el editor SQL de staging. El mensaje `RESULTADO` trae cada comprobación.

## Fases

### Fase 0: arreglar `/digital-menu` (requisito previo) — HECHA

La migración `public_menu` (20261019000000) ya aplicada en staging **rompió el menú digital público del POS**. Como anon, hacía `select *` sobre `products`, y los permisos por columna lo rechazan («permission denied»). Además, el menú leía como anon `store_stock`, `machine_tanks` y `recipes` (embebida), y este plan no le da acceso a esas tablas.

Solución aplicada:

- **Función:** `get_digital_menu(p_store_id)` (`supabase/migrations/20261019030000_get_digital_menu.sql`, aplicada en staging). Es `SECURITY DEFINER` y devuelve las categorías con productos públicos y su disponibilidad calculada en el servidor, con la misma lógica que tenía el cliente.
- **Esquemas distintos:** lee las columnas de `product_types_config` y `machine_tanks` con `to_jsonb(fila)`, así que funciona con el esquema de producción y con el antiguo de staging.
- **Cliente:** `src/hooks/useDigitalMenu.ts` usa la función en modo público, que se refresca cada 60 s porque anon no recibe tiempo real con RLS. El modo admin no cambia. El formato y la validación de la respuesta están en `src/lib/digitalMenu.ts`, con 9 pruebas.
- **Prueba en staging (revertida), con columnas alineadas temporalmente y RLS activo en stock, tanques, recetas e insumos:**
  - anon recibe la carta correcta: agotado, pocas unidades y disponible según stock, receta y nivel del tanque;
  - excluye productos ocultos, de otra sede y categorías inactivas;
  - anon lee 0 filas de `store_stock` directamente.
- **Navegador (staging, sin sesión):** la carta solo llama a `rpc/get_digital_menu`. Muestra «No hay productos…» porque `product_types_config` de staging no tiene la forma que espera el código; ver «Limitaciones».

Pendiente relacionado: componentes globales del POS también consultan como anon `sizes`, `sku_acronyms`, `roles` y `profiles`. Hoy ya fallan en staging por el desfase de esquema, y tras activar RLS devolverán vacío. La carta pública no los necesita.

### Fase 1: aplicar en staging — APLICADA (2026-10-19)

1. ~~Confirmar la fase 0.~~ Hecha.
2. ~~Ejecutar `supabase/staging/rls_lockdown.sql` en staging.~~ Aplicada como migración `staging_rls_lockdown`.
3. Si algo del POS falla, ejecutar `rls_lockdown_rollback.sql`, corregir la política y repetir.

Verificación después de aplicar:

- **Base de datos:**
  - 0 tablas sin RLS;
  - la política recursiva de `user_roles` ya no existe;
  - anon no puede insertar en `orders` ni ejecutar `process_sale`.
  - El *security advisor* ya no reporta tablas sin RLS. Quedan advertencias que ya existían: `search_path` mutable en funciones de ventas, funciones de trigger ejecutables y la protección de contraseñas filtradas desactivada.
- **Menú digital público (sin sesión):**
  - `get_digital_menu` responde sin error;
  - `select *` sobre `products` da «permission denied»;
  - `store_stock` devuelve 0 filas;
  - la marca (`stores`) carga.
- **App móvil (invitado):** menú con 4 granizados, carrito y pedido real #3B044AD3 ($21.500) creados con RLS activo.
- **Panel (SQL con sesión simulada, revertido):**
  - el admin ve pedidos, ítems, resumen, productos, sede y equipo, y puede cancelar, editar productos y editar la sede;
  - el cajero ve pedidos y productos y puede cancelar pedidos pendientes; RLS le bloquea editar productos y la sede.
  - Además, una cuenta admin real canceló #96832C2E desde el panel después de activar RLS.

### Fase 2: verificación manual en el POS (staging)

Las pruebas SQL no reemplazan el uso real. Recorrer con una cuenta de cada rol:

- **Cajero:** abrir y cerrar caja, vender, preparar una mezcla, ver dashboard e historial de ventas.
- **Gerente:** gastos, inventario, recetas, categorías y tamaños; asignar un cajero en `/users`.
- **Admin:** cambiar de sede, anular una venta, editar la sede, asignar un gerente.
- **Sin sesión:** `/digital-menu?store=…` (después de la fase 0) y la app móvil.

### Fase 3: funciones de ventas sin validación de rol — APLICADA (2026-10-19)

`process_sale`, `process_sale_with_stock` e `increment_inventory_stock` no comprobaban quién llama. Tras la fase 1, anon ya no podía ejecutarlas, pero **un cliente con sesión sí**: podía registrar ventas completadas y mover inventario.

Solución (`supabase/staging/sales_functions_guard.sql`, aplicada como `staging_sales_functions_guard`):

- **Funciones originales:** se renombran a `*_unchecked`. Solo `service_role` puede ejecutarlas; la API no las expone para nadie más.
- **Funciones públicas:** quedan con el **mismo nombre, parámetros y retorno**, llaman a `assert_staff_caller()` (que usa `rls_is_staff()`, o permite `service_role`) y delegan. El POS no cambia, y la lógica de 5.400 caracteres de `process_sale` no se copió.
- **Código de error:** se usa `42501`, que PostgREST devuelve como 403. `usePOS` y el service worker (`src/sw.ts`) tratan 401/403 como «reintentar después» y **conservan** la venta en la cola offline. Con `P0001`/400 la habrían descartado como error de validación.
- **Efecto adicional:** las tres funciones públicas ahora tienen `search_path` fijo, lo que cierra esa advertencia del advisor para ellas.

Prueba en staging, con datos revertidos:

- **Cliente con sesión:** `42501` en las tres funciones, y tampoco puede llamar a las `_unchecked`.
- **Cajero:** registra ventas e incrementa stock (de 10 a 15). `process_sale` pasa la guarda y aplica su validación de siempre.
- **anon:** bloqueado.
- **`service_role`:** funciona.

Pendiente opcional:

- `process_sale_with_stock` recibe `p_user_id` y `p_store_id` del cliente sin validarlos. Un cajero podría registrar una venta a nombre de otro empleado o en otra sede. Se podría exigir `rls_can_access_store(p_store_id)` y `p_user_id = auth.uid()`, pero el POS web no la usa hoy; solo `process_sale`.

### Fase 4: producción (fuera de este plan)

No se consultó producción. Antes de llevar nada allí:

- correr el *security advisor* de Supabase en producción;
- comparar sus políticas `tenant_*` con este modelo;
- escribir una migración propia para producción. Esta no sirve allí.

## Decisiones que cambian el comportamiento

Revisa que estén bien antes de aplicar:

1. Un gerente ya no puede asignar ni quitar roles de admin o gerente; solo de cajero y domiciliario.
2. Un gerente solo ve turnos, gastos, insumos y tanques de **su** sede; admin y superadmin ven todas.
3. Los cajeros no registran gastos ni borran recetas.
4. Los clientes con sesión pueden leer tamaños, categorías activas y tipos de producto (no sensible).

## Limitaciones

- **Staging está desfasado del código.** Por ejemplo, `product_types_config` tiene `type_name`/`config` y no las columnas `code`/`active`/`store_id` que lee el POS, e `inventory_items` no tiene `is_mixture`. Algunas pantallas ya fallan en staging por eso, con o sin RLS.
- **Reglas que dependen del rol de la cuenta:** las pruebas simulan sesiones con `request.jwt.claims`, que es lo que usa PostgREST. Las políticas basadas en `has_role` funcionan igual, pero conviene la fase 2.
