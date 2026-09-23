-- ============================================
-- ROLLBACK: Rate Limiting Implementation
-- ============================================
-- Este script revierte la migración 20260923000000_add_rate_limiting.sql
-- Ejecutar en caso de problemas críticos en staging

BEGIN;

-- Log del rollback
DO $$
BEGIN
    RAISE NOTICE 'Iniciando rollback de Rate Limiting...';
END $$;

-- 1. Drop functions (en orden inverso de dependencias)
DROP FUNCTION IF EXISTS public.clear_login_attempts(TEXT);
DROP FUNCTION IF EXISTS public.get_lockout_remaining_time(TEXT);
DROP FUNCTION IF EXISTS public.record_login_attempt(TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public.is_account_locked(TEXT);

-- 2. Drop table con CASCADE (elimina índices y políticas)
DROP TABLE IF EXISTS public.login_attempts CASCADE;

-- Log de completado
DO $$
BEGIN
    RAISE NOTICE 'Rollback completado exitosamente';
END $$;

-- Verificación
DO $$
BEGIN
    -- Verificar que la tabla no existe
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'login_attempts') THEN
        RAISE NOTICE '✅ Tabla login_attempts eliminada';
    ELSE
        RAISE WARNING '⚠️  Tabla login_attempts aún existe';
    END IF;

    -- Verificar que las funciones no existen
    IF NOT EXISTS (SELECT FROM pg_proc WHERE proname = 'is_account_locked') THEN
        RAISE NOTICE '✅ Funciones eliminadas';
    ELSE
        RAISE WARNING '⚠️  Algunas funciones aún existen';
    END IF;
END $$;

COMMIT;

-- Comentario final
COMMENT ON DATABASE postgres IS 'Rate limiting rollback executed at ' || NOW()::TEXT;

-- Instrucciones post-rollback
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  ROLLBACK COMPLETADO                                         ║';
    RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE 'Próximos pasos:';
    RAISE NOTICE '1. Verificar que la aplicación funciona sin rate limiting';
    RAISE NOTICE '2. Revisar logs de error para identificar el problema';
    RAISE NOTICE '3. Corregir migración si es necesario';
    RAISE NOTICE '4. Re-aplicar cuando el problema esté resuelto';
    RAISE NOTICE '';
END $$;
