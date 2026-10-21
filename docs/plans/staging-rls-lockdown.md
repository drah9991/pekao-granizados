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
| `supabase/staging/align_schema.sql` | Alinea las tablas de staging con el esquema que espera el POS (ver «Alineación de esquema»). |
| `supabase/staging/align_schema.checks.sql` y `build-align-test.sh` | Prueba en seco: aplica el script dos veces, comprueba columnas y permisos, y lo revierte todo. |
| `supabase/staging/function_grants_hardening.sql` | Fase 5: quita EXECUTE a anon/authenticated en funciones que no deben llamar, limita `has_role` y el bloqueo de login, y fija `search_path`. |
| `supabase/staging/function_grants_hardening.checks.sql` y `build-grants-test.sh` | Prueba en seco de la fase 5: aplica el script dos veces, comprueba por rol y lo revierte todo. |
| `supabase/staging/remove_test_stores.sql` | Borra las 3 sedes de prueba vacías (ver «Sedes de prueba»). |

## Modelo de acceso

Es el que el POS ya asume; las políticas solo lo hacen cumplir.

- **Personal:** tiene fila en `user_roles` (admin, manager, cashier, driver) o es superadmin.
- **Sede del usuario:** `profiles.store_id`. Al iniciar sesión, admin y superadmin eligen entre todas las sedes; el resto del personal entra a la de su perfil, que asigna un admin (`storesForLogin` en `src/lib/permissions.ts`).
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

### Fase 5: permisos de funciones — APLICADA (2026-10-20)

El *security advisor* avisaba de 18 funciones `SECURITY DEFINER` que anon podía llamar por `/rest/v1/rpc`, 26 que podía llamar un usuario con sesión, y 7 con `search_path` mutable.

Solución (`supabase/staging/function_grants_hardening.sql`, aplicada como `staging_function_grants_hardening`):

- **Funciones de trigger:** sin EXECUTE para `PUBLIC`, anon y authenticated. Son `check_inventory_stock_trigger`, `check_store_stock_trigger`, `handle_new_user`, `rls_auto_enable`, `sync_product_recipe_to_relational_recipes`, `update_updated_at_column` y `update_pricing_rules_updated_at`. Los triggers siguen disparándose: Postgres solo exige EXECUTE al crear el trigger.
- **Bloqueo de login:** `src/lib/rateLimiting.ts` envuelve las cuatro funciones, pero **ningún archivo lo importa**, así que hoy nadie las llama.
  - `is_account_locked` y `get_lockout_remaining_time`: solo `service_role`.
  - `record_login_attempt` y `clear_login_attempts`: solo con sesión, y solo sobre el correo de `auth.uid()`; otro correo da `42501`. Antes anon podía desbloquear cualquier cuenta o bloquear cuentas ajenas.
  - Si se quiere un bloqueo real, debe ir en el servidor (Auth hook o edge function con `service_role`). El que registra el navegador se puede saltar.
- **`has_role(_user_id, _role)`:** responde `false` si `_user_id` no es `auth.uid()` (salvo `service_role`). Todas las políticas y funciones la llaman con `auth.uid()`, así que no cambia nada para el POS. Ya no sirve para averiguar el rol de otro usuario.
- **anon sin `has_role` ni `rls_*`:** 12 políticas `TO public` de `public` usaban `has_role`, por ejemplo «Admins and managers can manage products». Postgres exige EXECUTE sobre las funciones de **todas** las políticas que aplican, aunque den `false`. Al quitarle EXECUTE a anon, leer la carta habría fallado. Por eso esas políticas pasan a `TO authenticated`. Para anon daban siempre `false` (`auth.uid()` es nulo), así que nadie gana ni pierde acceso. Ninguna política que aplique a anon usa `rls_*`.
- **`search_path = public`:** en `process_sale_unchecked`, `process_sale_with_stock_unchecked`, `increment_inventory_stock_unchecked`, `update_order_with_stock`, `cancel_sale_with_stock_restore`, `check_store_stock_trigger` y `update_pricing_rules_updated_at`. Ninguna usa funciones de `extensions`.

**Advisor después:**

| Aviso | Antes | Después |
|---|---|---|
| SECURITY DEFINER ejecutable por anon | 18 | 2 |
| SECURITY DEFINER ejecutable con sesión | 26 | 18 |
| `search_path` mutable | 7 | 0 |

Siguen a propósito:

- **anon:** `get_digital_menu` y `create_mobile_order`, que son la carta y los pedidos móviles.
- **Con sesión:** ventas, inventario, `can_increase_stock`, `set_chatbot_api_key`, `upsert_my_customer`, `has_role`, `rls_*` y los dos de login. Cada una valida al llamador o la usan las políticas.
- **Protección de contraseñas filtradas:** sigue desactivada. Es un ajuste de Auth en el dashboard.

**Prueba en seco (revertida):** el script corre dos veces sin errores.

| Rol | Resultado |
|---|---|
| anon | Lee `products` (37), `stores`, `public_menu` y `get_digital_menu`. `42501` en `has_role`, `rls_is_staff`, las 4 de login y las de trigger. |
| Cliente con sesión | `has_role` de otro usuario da `false`. Registra y limpia intentos de su correo (aunque lo escriba con mayúsculas), pero no de uno ajeno. |
| Gerente | `has_role` propio da `true`. Al editar `store_stock` se disparan `update_updated_at_column` y `check_store_stock_trigger`, y se crea la notificación de stock bajo. |
| Admin | Edita la sede y lee `role_permissions`. |
| `service_role` | `has_role` de cualquiera y `is_account_locked`. |

Aparte, en la sede `c72851e5-…`, con datos revertidos:

- un cajero vende con `process_sale` (stock de 10 a 9);
- un gerente la anula con `cancel_sale_with_stock_restore` (stock vuelve a 10, pedido `cancelled`).

**Navegador:**

- `/digital-menu?store=c72851e5-…` muestra la carta sin sesión, y `get_digital_menu` responde 200.
- `/digital-menu?store=8cfcf12f-…` sale vacía porque la sede A ya no tiene productos tras importar el catálogo; `get_digital_menu` responde 200 con `[]`.
- **Login y venta desde el POS no se probaron en el navegador:** no había sesión y la cuenta de prueba de `.env.staging` es la del usuario. Equivalen a la fase 2.

**Pendiente:**

- Las funciones nuevas en `public` reciben EXECUTE para anon y authenticated por los privilegios por defecto de Supabase. Se podría cambiar con `ALTER DEFAULT PRIVILEGES … REVOKE EXECUTE ON FUNCTIONS FROM anon`, pero entonces cada RPC pública necesitaría su `GRANT`.
- Las políticas de `storage.objects` para subir branding siguen `TO public` con `has_role`. Su dueño es `supabase_storage_admin`, así que no se tocaron. Si anon intenta subir, recibe «permiso denegado sobre la función» en vez de un rechazo de RLS; en ambos casos no puede.

## Decisiones que cambian el comportamiento

Revisa que estén bien antes de aplicar:

1. Un gerente ya no puede asignar ni quitar roles de admin o gerente; solo de cajero y domiciliario.
2. Un gerente solo ve turnos, gastos, insumos y tanques de **su** sede; admin y superadmin ven todas.
3. Los cajeros no registran gastos ni borran recetas.
4. Los clientes con sesión pueden leer tamaños, categorías activas y tipos de producto (no sensible).

## Alineación de esquema — APLICADA (2026-10-19)

**Causa:** staging se creó con `20250131000000_staging_consolidation.sql`. Muchas migraciones posteriores constan en `schema_migrations` pero no surtieron efecto, porque usaban `CREATE TABLE IF NOT EXISTS` sobre tablas que ya existían con otra forma.

**Cambios** (`supabase/staging/align_schema.sql`, aplicado como `staging_align_schema`). Todas las tablas afectadas estaban vacías.

| Tabla | Antes | Ahora |
|---|---|---|
| `product_types_config` | `id`, `type_name`, `config` | Forma de producción: clave `code`, `label`, `store_id`, `sales_mode`, `track_mixture_inventory`, `active`, etc. Sin semilla: el catálogo se importa desde producción. |
| `machine_tanks` | `capacity`, `current_level` | `max_capacity_ml`, `current_volume_ml`, `updated_at`, `UNIQUE (store_id, name)`. Se agrega la vista `vw_tank_percentages` (`security_invoker`). |
| `inventory_items` | `unit_of_measure` | `unit` (la columna que escribe el POS) e `is_mixture`. `check_inventory_stock_trigger` ahora lee `unit`. |
| `expenses` | `date` (timestamptz) | `expense_date` (date, como lo envía el formulario). |
| `sizes` | sin sede | `store_id`, `capacity_value`, `capacity_unit`, `updated_at`. |
| `sku_acronyms` | `word`, `acronym` | `type`, `code`, `store_id`. |
| `categories` | — | `image_url`, `sort_order` y los campos de comportamiento de venta. |
| `roles` | no existía | Creada con RLS y los 4 roles base. `user_roles.role` sigue siendo el enum `app_role`. |

**Políticas:**

- `roles`: la leen usuarios con sesión; solo admin o superadmin escriben.
- `sizes_write` y `sku_acronyms_write` exigen ahora además `rls_can_access_store(store_id)`: un gerente solo edita los de su sede. Las filas sin sede quedan para admin y superadmin.
- Se añadieron índices en `store_id` donde las políticas lo usan.
- **Ojo:** `rls_lockdown.sql` crea las versiones anteriores de esas dos políticas. Si se vuelve a aplicar, hay que ejecutar `align_schema.sql` después.

**Efecto colateral bueno:** `process_sale_unchecked`, `update_order_with_stock`, `cancel_sale_with_stock_restore` y `get_digital_menu` ya mencionaban `current_volume_ml` y `track_mixture_inventory`. Ahora esas columnas existen.

**Prueba en seco (revertida):**

- El script corre dos veces sin errores ni restricciones duplicadas.
- anon recibe la carta con 4 granizados y 1 topping, lee los 3 tipos activos y no puede crear roles.
- El gerente de A crea tallas, SKU, tanques y gastos en A, pero no en B ni globales, y no crea roles.
- El cajero de A lee tallas, SKU y tanques, crea mezclas (`unit`, `is_mixture`) y no crea tallas.

**Navegador (sin sesión):** `/digital-menu?store=8cfcf12f-…` muestra los 4 granizados de prueba y el topping. `roles`, `sizes`, `sku_acronyms` y `product_types_config` responden 200.

**Pendiente:**

- `useDigitalMenuConfigForm` pide `profiles.full_name`, que no existe en ninguna migración ni en `types.ts` (la columna es `name`). Da 400 en staging y probablemente también en producción. Es un error del código, no del esquema.
- Siguen faltando en staging las funciones `adjust_inventory_item_stock` e `initialize_store_tanks`, que el POS llama por RPC.
- Tampoco existen las tablas de traslados (`inventory_transfers` y relacionadas).
- No se agregó `customers.store_id` (NOT NULL en producción): rompería `create_mobile_order` y `upsert_my_customer` en staging.
- El catálogo (tipos, tallas, productos, insumos, recetas, stock y tanques) se importa desde producción en otra sesión; este script no siembra datos.
- Columnas que producción tiene y staging no, cuyo tipo no figura en el repo: `stores.opening_hours`, `stores.updated_at`, `sku_acronyms.description`, `sku_acronyms.updated_at`, `products.updated_at`, `inventory_items.alert_threshold`, `inventory_items.lot_number` y `recipes.unit`. Deben añadirse con el tipo exacto de producción.

## Sedes de prueba — BORRADAS (2026-10-20)

Al iniciar sesión salían 5 sedes, 3 con el mismo nombre («Pekao Granizados - Staging»).

**Datos** (`supabase/staging/remove_test_stores.sql`, aplicado como `staging_remove_test_stores`):

- Se borraron las 3 sedes de prueba del 24-sep: `8cfcf12f-…`, `c1b3c246-…` y `7cdb8def-…`. No tenían productos, pedidos ni movimientos.
- Con ellas se borraron en cascada 2 turnos de caja de prueba, que seguían abiertos.
- El único perfil asignado a una de ellas (la cuenta admin) pasó a SUCURSAL PRINCIPAL (`c72851e5-…`).
- Quedan CLICK & SNACK y PEKAO GRANIZADOS - SUCURSAL PRINCIPAL, copiadas de producción por `scripts/copy-catalog-to-staging.js`.
- Los scripts de prueba (`build-rls-test.sh`, `build-align-test.sh`, `build-grants-test.sh`) usan ahora SUCURSAL PRINCIPAL como sede A y CLICK & SNACK como sede B. El producto de prueba se toma de la sede A, porque la importación reemplazó el anterior.

**Código** (`src/hooks/useAuthPage.ts`):

- Antes el selector mostraba todas las sedes a cualquier usuario. Así un cajero podía elegir otra sede y, con ella, ver sus datos.
- Ahora admin y superadmin eligen entre todas.
- El resto del personal entra directo a la sede de su perfil. Si no tiene sede asignada, entra sin elegir y un admin debe asignársela.
- Las consultas posteriores al login usan el mismo cliente con el que se inició sesión. Con «Recordarme» apagado, antes se hacían sin sesión.

**Marca del login sin sesión** (`src/context/BrandingContext.tsx`):

- Tomaba «la primera» sede con `limit(1)` sin orden, así que Postgres devolvía cualquiera. Tras el borrado salía «CLICK & SNACK», que es otro negocio.
- Ahora ordena por `created_at` y toma la más antigua, PEKAO GRANIZADOS - SUCURSAL PRINCIPAL.
- anon no podía leer `stores.created_at` (daba 401), así que se añadió a sus columnas en `rls_lockdown.sql` y se aplicó como `staging_stores_created_at_anon`.

**Validación (2026-10-21):**

- **Login sin sesión:** muestra «PEKAO GRANIZADOS - SUCURSAL PRINCIPAL», y las consultas a `stores` responden 200.
- **Consultas que el login hace al entrar, simuladas con RLS:**
  - La cuenta admin ve 2 sedes, su perfil está en SUCURSAL PRINCIPAL y su rol es `admin`, así que el selector muestra esas 2.
  - Un cajero de prueba lee su rol y su sede (CLICK & SNACK), así que entra directo.
- **Prueba en seco de la fase 5 con SUCURSAL PRINCIPAL como sede A:**
  - Las mismas 2 funciones expuestas a anon y ninguna con `search_path` mutable.
  - La carta tiene 4 productos.
  - Los permisos por rol y los triggers funcionan.
- **Advisor:** sin cambios. Siguen 2 funciones expuestas a anon, 18 con sesión y 0 con `search_path` mutable.
- **Tests:** `vitest` pasa los 28 tests. Fallan al cargar 8 archivos que importan `bun:test`; eso ya pasaba antes.

**Pendiente:**

- Un admin sigue viendo CLICK & SNACK, que es otro negocio. Staging no tiene modelo de tenant; producción tiene políticas `tenant_*`.
- **El selector tras iniciar sesión no se probó en el navegador:** hace falta entrar con la cuenta real.

## Limitaciones

- **Staging seguía desfasado del código.** Corregido para las tablas de la sección anterior; quedan las funciones y tablas listadas allí.
- **Reglas que dependen del rol de la cuenta:** las pruebas simulan sesiones con `request.jwt.claims`, que es lo que usa PostgREST. Las políticas basadas en `has_role` funcionan igual, pero conviene la fase 2.
