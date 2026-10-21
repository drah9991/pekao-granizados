-- =============================================================================
-- SOLO STAGING (llzdxcujvagctnzjymqh). Ver «Sedes de prueba» en
-- docs/plans/staging-rls-lockdown.md.
--
-- Staging tenía tres sedes de prueba con el mismo nombre («Pekao Granizados -
-- Staging»), sin productos ni pedidos, que salían repetidas al iniciar sesión.
-- Las sedes reales (CLICK & SNACK y PEKAO GRANIZADOS - SUCURSAL PRINCIPAL) se
-- copian de producción con scripts/copy-catalog-to-staging.js y no se tocan.
--
-- Los perfiles asignados a una sede de prueba pasan a SUCURSAL PRINCIPAL, que
-- tiene el catálogo. Los turnos de caja de prueba se borran en cascada.
-- Si una sede de prueba tuviera productos, pedidos o movimientos, el DELETE
-- falla por clave foránea y no se borra nada.
--
-- Idempotente: se puede ejecutar más de una vez.
-- =============================================================================

UPDATE public.profiles
SET store_id = 'c72851e5-380d-4e1c-952b-34713638e70b'  -- SUCURSAL PRINCIPAL
WHERE store_id IN (
  '8cfcf12f-196f-43ac-a240-6976b7044de7',
  'c1b3c246-cba3-432b-a2fc-2ec37715d4fe',
  '7cdb8def-08ac-47ba-ba77-26ecafa3488e'
);

DELETE FROM public.stores
WHERE id IN (
  '8cfcf12f-196f-43ac-a240-6976b7044de7',
  'c1b3c246-cba3-432b-a2fc-2ec37715d4fe',
  '7cdb8def-08ac-47ba-ba77-26ecafa3488e'
);
