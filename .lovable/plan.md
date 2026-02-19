

## Fix: Login no funciona (Race condition en autenticación)

### Problema
El hook `useAuth.ts` tiene una condición de carrera (race condition):
1. El listener `onAuthStateChange` hace llamadas async (fetch profile, fetch role) dentro del callback, lo que puede causar un deadlock con el sistema de auth
2. El listener se registra DESPUES de `getSession()`, lo que puede hacer que se pierda el evento `SIGNED_IN`

### Solución
Reestructurar `useAuth.ts` siguiendo el patrón recomendado:
1. Registrar `onAuthStateChange` ANTES de llamar `getSession()`
2. Diferir las operaciones async del callback usando `setTimeout` para evitar deadlocks
3. Hacer la carga inicial de forma separada, controlando `isLoading` solo ahí
4. Agregar flag `isMounted` para evitar actualizar estado en componentes desmontados

### Archivo a modificar: `src/hooks/useAuth.ts`

- Mover `onAuthStateChange` antes de `getSession()`
- En el callback del listener, usar `setTimeout(() => ..., 0)` para las llamadas async de profile/role
- La carga inicial (`getSession` + fetch profile + fetch role) controla `isLoading`
- El listener solo actualiza session/user sincrónicamente y difiere el fetch de datos

### Impacto
- Solo se modifica un archivo
- No hay cambios en la base de datos
- El login debería funcionar correctamente después de este cambio
