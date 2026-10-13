# Sistema de Notificaciones - Pekao Granizados

## 📋 Resumen

Sistema completo de notificaciones con:
- ✅ Toast flotantes temporales (sonner)
- ✅ Centro de notificaciones persistente con badge
- ✅ Almacenamiento local (hasta 100 notificaciones)
- ✅ Detalles expandibles con stack traces
- ✅ Captura automática de errores globales
- ✅ Optimizado para modo oscuro y claro

## 🎯 Componentes Creados

### 1. `src/stores/notificationStore.ts`
Store de Zustand que maneja el estado de notificaciones.

**Funciones:**
- `addNotification()` - Agregar nueva notificación
- `markAsRead()` - Marcar como leída
- `markAllAsRead()` - Marcar todas como leídas
- `clearAll()` - Eliminar todas
- `clearNotification()` - Eliminar una específica

### 2. `src/components/NotificationCenter.tsx`
Componente visual del centro de notificaciones (botón con badge + panel lateral).

**Features:**
- Badge con contador de no leídas
- Panel lateral deslizable
- Expandir/contraer detalles
- Código de colores por nivel (error, warning, success, info)
- Optimizado para modo oscuro/claro

### 3. `src/lib/toast.tsx`
Utilidades para mostrar toasts y capturar errores.

**Funciones:**
- `setupGlobalErrorHandling()` - Captura errores no manejados
- `useToast()` - Hook para mostrar toasts + guardar en centro
- `ToastContainer` - Componente de toasts (sonner)

### 4. `src/lib/supabaseErrorHandler.ts`
Wrapper para queries de Supabase con manejo automático de errores.

**Funciones:**
- `supabaseQuery()` - Wrapper que captura errores de Supabase
- `useSupabaseErrorHandler()` - Hook para manejar errores

## 🚀 Uso Básico

### Mostrar una notificación simple

```typescript
import { useToast } from '@/lib/toast';

function MyComponent() {
  const toast = useToast();
  
  const handleAction = () => {
    toast.success('Operación exitosa', 'Los datos se guardaron correctamente');
    // o
    toast.error('Error al guardar', 'Verifica la conexión a internet');
    // o
    toast.warning('Advertencia', 'Stock bajo en algunos productos');
    // o
    toast.info('Información', 'Nueva actualización disponible');
  };
}
```

### Agregar notificación con detalles técnicos

```typescript
import { useNotificationStore, captureErrorDetails } from '@/stores/notificationStore';

function MyComponent() {
  const { addNotification } = useNotificationStore();
  
  const handleError = (error: any) => {
    addNotification({
      level: 'error',
      title: 'Error en proceso de venta',
      message: 'No se pudo completar la transacción',
      details: captureErrorDetails(error), // Stack trace, código de error, etc.
      context: {
        component: 'POS',
        action: 'process_sale',
        orderId: '123',
      },
    });
  };
}
```

### Usar con Supabase (captura automática)

```typescript
import { supabaseQuery } from '@/lib/supabaseErrorHandler';

async function fetchProducts() {
  const result = await supabaseQuery(
    () => supabase.from('products').select('*'),
    {
      component: 'ProductGrid',
      action: 'fetchProducts',
      silent: false, // true = no muestra toast, solo guarda
    }
  );
  
  if (result.error) {
    // Error ya fue capturado y notificado automáticamente
    return;
  }
  
  return result.data;
}
```

### Notificación persistente (sin toast)

```typescript
const toast = useToast();

toast.info(
  'Sincronización iniciada',
  'Los datos se están sincronizando en segundo plano',
  {
    persistent: true, // Solo guarda, no muestra toast
    details: 'Proceso ID: 12345',
    context: { background: true },
  }
);
```

## 🎨 Niveles de Notificación

| Nivel | Color (claro/oscuro) | Uso |
|-------|---------------------|-----|
| `error` | Rojo | Errores críticos, fallos de operación |
| `warning` | Amarillo | Advertencias, stock bajo, permisos |
| `success` | Verde | Operaciones exitosas |
| `info` | Azul | Información general, actualizaciones |

## 📍 Integración en Layout

El `NotificationCenter` ya está integrado en `src/components/Layout.tsx`:

```tsx
<NotificationCenter />
<DatabaseIndicator />
<ThemeToggle />
```

Aparece en la barra superior junto al indicador de base de datos.

## 🔧 Configuración Avanzada

### Persistencia
Las notificaciones se guardan en `localStorage` con la clave `pekao-notifications`.
- Máximo: 100 notificaciones en memoria
- Persistencia: últimas 50

### Captura automática de errores
Se activa automáticamente en `App.tsx` con `setupGlobalErrorHandling()`.

Captura:
- Promesas rechazadas no manejadas
- Errores en consola (solo en producción)

### Personalizar duración de toast

```typescript
toast.success('Guardado', 'Cambios guardados', {
  duration: 5000, // 5 segundos (default: 4000)
});
```

## 📱 Responsive & Accesibilidad

- **Mobile**: Panel ocupa ancho completo
- **Desktop**: Panel de 480px
- **Modo oscuro**: Colores optimizados con buen contraste
- **Scroll**: ScrollArea para listas largas
- **Tooltips**: En botones de acción

## 🐛 Debugging

Para ver todas las notificaciones en consola:

```typescript
import { useNotificationStore } from '@/stores/notificationStore';

console.log(useNotificationStore.getState().notifications);
```

Para limpiar todas las notificaciones programáticamente:

```typescript
useNotificationStore.getState().clearAll();
```

## 📝 Ejemplo Completo: AuthContext

Ver `src/context/AuthContext.tsx` líneas 1-6 y 66-105 para ejemplo de integración completa con captura de errores de perfil y roles.

## ✅ Checklist de Implementación

- [x] Store de notificaciones (Zustand)
- [x] Componente NotificationCenter
- [x] Sistema de toast (sonner)
- [x] Captura global de errores
- [x] Wrapper para Supabase
- [x] Integración en Layout
- [x] Integración en App.tsx
- [x] Ejemplo en AuthContext
- [x] Optimización modo oscuro/claro
- [ ] Agregar a más componentes (ProductGrid, Cart, etc.)
- [ ] Tests unitarios

## 🎯 Próximos Pasos

1. Agregar `useSupabaseErrorHandler()` en hooks críticos:
   - `src/hooks/useCart.ts`
   - `src/components/pos/ProductGrid.tsx`
   - `src/hooks/useTurn.ts`

2. Probar en staging con errores reales

3. Ajustar colores si es necesario después de pruebas visuales
