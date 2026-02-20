

## Rediseno del POS - Optimizado para Tablet y Tactil

### Resumen
Mejorar el POS existente para que sea mas rapido, limpio y optimizado para uso tactil en tablets. Los cambios principales son:

1. **Agregar metodos de pago faltantes** (transferencia y QR)
2. **Optimizar el layout para tablet** (botones mas grandes, tipografia tactil)
3. **Simplificar el flujo** (menos dialogs, mas directo)
4. **Mejorar la grilla de productos** (botones grandes y coloridos)

### Cambios NO necesarios (ya existen)
- Login con rol cashier -- ya funciona
- Carrito a la derecha -- ya implementado
- Total automatico -- ya calculado en `useCart`
- Guardar venta en base de datos -- ya guarda en tabla `orders` + `order_items`
- Resetear carrito despues de vender -- ya implementado en `resetCart()`
- Boton confirmar venta -- ya existe

---

### Archivos a modificar

#### 1. `src/components/pos/PaymentDialog.tsx`
- Agregar metodo de pago **"transferencia"** y **"QR"** ademas de efectivo y tarjeta
- Cambiar el tipo de `method` a `"cash" | "card" | "transfer" | "qr"`
- Usar botones grandes tipo grid (2x2) en lugar de radio buttons para seleccion tactil rapida
- Mostrar campo "Monto recibido" solo para efectivo
- Para transferencia/QR, mostrar un mensaje de confirmacion simple

#### 2. `src/pages/POS.tsx`
- Actualizar el tipo de `processSale` para aceptar los nuevos metodos de pago (`"transfer"` y `"qr"`)
- Guardar el metodo de pago correcto en el campo `payment` de la orden

#### 3. `src/components/pos/ProductGrid.tsx`
- Cambiar la grilla para mostrar **botones mas grandes** optimizados para tablet (minimo 120px de alto)
- Quitar el filtro `.eq('type', 'granizado')` para mostrar todos los productos activos (no solo granizados)
- Agregar colores por categoria para diferenciar visualmente
- Aumentar el tamano del touch target de los botones
- Agregar categoria como filtro rapido con chips/tabs en la parte superior

#### 4. `src/components/pos/CartSummary.tsx`
- Aumentar el tamano de botones +/- para uso tactil (minimo 44x44px)
- Hacer el boton "Procesar Pago" mas prominente y grande
- Simplificar la visualizacion del carrito para ser mas rapida de leer

#### 5. `src/components/pos/ProductCustomizationDialog.tsx`
- Usar botones grandes en lugar de radio buttons para seleccion de tamano
- Hacer checkboxes de toppings mas grandes para uso tactil
- Agregar padding extra entre opciones

### Seccion tecnica

**Tipo de metodo de pago actualizado:**
```typescript
type PaymentMethod = "cash" | "card" | "transfer" | "qr";
```

**Cambio en PaymentDialog props:**
```typescript
onConfirmPayment: (method: PaymentMethod, amountReceived: number) => void;
```

**Cambio en processSale (POS.tsx):**
```typescript
const processSale = async (method: PaymentMethod, amountReceived: number) => {
  // Solo calcular cambio para efectivo
  const change = method === "cash" ? Math.max(0, amountReceived - total) : 0;
  // ...resto igual
};
```

**Filtro de categorias en ProductGrid:**
- Obtener categorias unicas de los productos cargados
- Mostrar chips/tabs de filtro rapido arriba de la grilla
- Chip "Todos" seleccionado por defecto

**Optimizaciones tactiles:**
- Todos los botones interactivos tendran minimo `min-h-[44px] min-w-[44px]`
- Productos en grilla: `h-36 md:h-44` (mas altos)
- Espaciado entre elementos aumentado con `gap-4`
- Font sizes aumentados en elementos clave

### Sin cambios en base de datos
El campo `payment` en la tabla `orders` es tipo `jsonb`, por lo que ya soporta almacenar cualquier metodo de pago sin necesidad de migracion.

