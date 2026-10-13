import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.staging' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testRateLimiting() {
  console.log('🧪 Testing Rate Limiting en STAGING...\n');

  const testEmail = `ratelimit-test-${Date.now()}@example.com`;
  console.log(`📧 Email de prueba: ${testEmail}\n`);

  try {
    // Test 1: Verificar que cuenta nueva NO está bloqueada
    console.log('Test 1: Verificar cuenta nueva no bloqueada...');
    const { data: initialCheck, error: checkError } = await supabase.rpc('is_account_locked', {
      user_email: testEmail
    });

    if (checkError) throw checkError;

    if (initialCheck === false) {
      console.log('✅ Cuenta nueva no está bloqueada\n');
    } else {
      console.log('❌ ERROR: Cuenta nueva aparece bloqueada\n');
      return;
    }

    // Test 2: Registrar 5 intentos fallidos
    console.log('Test 2: Registrar 5 intentos fallidos...');
    for (let i = 1; i <= 5; i++) {
      console.log(`  Intento ${i}/5...`);
      const { error } = await supabase.rpc('record_login_attempt', {
        user_email: testEmail,
        user_ip: '192.168.1.1',
        was_successful: false
      });

      if (error) throw error;

      // Pequeña pausa
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    console.log('✅ 5 intentos fallidos registrados\n');

    // Test 3: Verificar que cuenta ESTÁ bloqueada
    console.log('Test 3: Verificar cuenta bloqueada después de 5 intentos...');
    const { data: lockedCheck, error: lockedError } = await supabase.rpc('is_account_locked', {
      user_email: testEmail
    });

    if (lockedError) throw lockedError;

    if (lockedCheck === true) {
      console.log('✅ Cuenta correctamente bloqueada\n');
    } else {
      console.log('❌ ERROR: Cuenta NO está bloqueada después de 5 intentos\n');
      return;
    }

    // Test 4: Obtener tiempo restante de bloqueo
    console.log('Test 4: Obtener tiempo restante de bloqueo...');
    const { data: remainingTime, error: timeError } = await supabase.rpc('get_lockout_remaining_time', {
      user_email: testEmail
    });

    if (timeError) throw timeError;

    console.log(`⏱️  Tiempo restante: ${remainingTime}`);
    console.log('✅ Función de tiempo restante funciona\n');

    // Test 5: Intentar un 6to login (debe ser rechazado por la app)
    console.log('Test 5: Registrar intento adicional (debe seguir bloqueado)...');
    const { error: sixthError } = await supabase.rpc('record_login_attempt', {
      user_email: testEmail,
      user_ip: '192.168.1.1',
      was_successful: false
    });

    if (!sixthError) {
      console.log('⚠️  Intento registrado (la app debe prevenir esto)\n');
    }

    // Test 6: Limpiar intentos (simular login exitoso)
    console.log('Test 6: Limpiar intentos después de login exitoso...');
    const { error: clearError } = await supabase.rpc('clear_login_attempts', {
      user_email: testEmail
    });

    if (clearError) throw clearError;

    console.log('✅ Intentos limpiados\n');

    // Test 7: Verificar que cuenta ya NO está bloqueada
    console.log('Test 7: Verificar desbloqueo después de limpiar...');
    const { data: finalCheck, error: finalError } = await supabase.rpc('is_account_locked', {
      user_email: testEmail
    });

    if (finalError) throw finalError;

    if (finalCheck === false) {
      console.log('✅ Cuenta correctamente desbloqueada\n');
    } else {
      console.log('❌ ERROR: Cuenta sigue bloqueada después de limpiar\n');
      return;
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 TODOS LOS TESTS PASARON EXITOSAMENTE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✅ Rate Limiting está funcionando correctamente en STAGING');
    console.log('📝 Próximo paso: Integrar con LoginForm y probar manualmente\n');

  } catch (error) {
    console.error('❌ ERROR durante las pruebas:');
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar tests
testRateLimiting().then(() => {
  console.log('Tests completados.');
  process.exit(0);
}).catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
