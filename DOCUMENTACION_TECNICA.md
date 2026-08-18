# 🌌 Documentación Técnica y Profesional - Pekao Granizados

## 1. Resumen Ejecutivo

El sistema **Pekao Granizados** es una plataforma Point of Sale (POS) y de gestión de inventario de grado empresarial (Enterprise-grade) diseñada meticulosamente para manejar operaciones comerciales fluidas y seguras. Su arquitectura moderna garantiza alta disponibilidad, un manejo de inventario de doble capa único para el negocio de granizados y una interfaz de usuario hiper-optimizada y moderna.

## 2. Stack Tecnológico

La plataforma aprovecha un conjunto de tecnologías modernas para asegurar velocidad y escalabilidad:

*   **Frontend Core**: React 18 con Vite (SWC) y TypeScript.
*   **Manejo de Estado**: Zustand (estado global) y TanStack Query v5 (estado del servidor/caché).
*   **Estilado y UI**: Tailwind CSS, shadcn/ui y Framer Motion (para micro-interacciones).
*   **Backend y Base de Datos**: Supabase (PostgreSQL), Auth, Storage, y Funciones RPC (Remote Procedure Calls).
*   **Telemetría y Monitoreo**: Sentry y PostHog.
*   **Offline y Local Storage**: IndexedDB a través de `idb`.

## 3. Arquitectura del Sistema

El sistema adopta una arquitectura Cliente-Servidor reactiva y asincrónica con capacidad Offline-First.

### A. Capa de Datos (Supabase/PostgreSQL)
*   **Seguridad y Aislamiento por RLS**: Políticas de Row Level Security garantizan que cada usuario y tienda (`store_id`) operen en un entorno aislado, previniendo fugas de información inter-tienda.
*   **Atomicidad con Funciones RPC**: Procesos críticos como `process_sale`, `update_order_with_stock`, y `cancel_sale_with_stock_restore` operan como bloques transaccionales atómicos (ACID).
*   **Control de Concurrencia (`FOR UPDATE`)**: Evita condiciones de carrera (Race Conditions) al actualizar inventario cuando múltiples cajas facturan simultáneamente.

### B. Capa de Interfaz y Cliente
*   **Reactividad Optimizada**: Se emplea cacheo local agresivo y suscripciones vía WebSockets (Supabase Realtime) para asegurar que componentes como el *ProductGrid* reaccionen inmediatamente ante los cambios de inventario.
*   **Gestión de Estados Globales**: 
    *   `useCartStore`: Administra el carrito temporalmente en `localStorage`.
    *   `useTurnStore`: Sincroniza la apertura y cierre de la caja operativamente.
    *   `useAlertStore`: Sistema interno para las notificaciones de inventario bajo.

## 4. El Modelo de Inventario Dual (El "Problema de la Mezcla")

La plataforma resuelve el reto logístico de vender líquidos en distintas presentaciones, controlando tanto las unidades como los mililitros exactos de producto:

1.  **Stock de Tienda (Unidades Físicas)**: Gestiona ítems discretos (e.g., Vasos, Tapas, Paquetes). Operación sobre la tabla `store_stock`.
2.  **Inventario de Mezcla (Volumen en Mililitros)**: Los tanques de las máquinas registran el líquido. Mediante la tabla de `recipes`, se deduce el volumen al instante mediante la fórmula:
    > `Deducción (ml) = Volumen Base (Oz) * Multiplicador de Tamaño * 29.57`

Esta arquitectura previene el desabastecimiento silencioso, alertando visualmente en la UI cuando un tanque alcanza niveles críticos.

## 5. Capacidad Offline-First (Resiliencia Operativa)

Para garantizar la operación sin interrupciones durante caídas de internet:

*   **OfflineService Middleware**: Intercepta transacciones fallidas por red y las encola de manera segura en `IndexedDB`.
*   **Modo Degradado UI**: La aplicación adapta visualmente el entorno (indicadores ambar/rojo) advirtiendo al cajero, pero permitiendo completar ventas y almacenar la data del cliente temporalmente.
*   **Sincronización Automática**: Una vez restaurada la conectividad, un listener de red procesa y despacha el listado pendiente mediante los RPC de Supabase.

## 6. Gating Operativo y Turnos de Caja

El flujo de operación exige consistencia financiera. Un operario no puede acceder al ecosistema POS a menos que:
*   Exista un turno (`cash_turns`) abierto activamente y asignado a su sesión.
*   El estado no esté en pausa (para cierres de seguridad temporales).

## 7. Experiencia e Interfaz (UI/UX)

*   **Diseño "Deep Space"**: Interfaz oscura de alto contraste, diseñada meticulosamente para eliminar la fatiga visual.
*   **Micro-interacciones Inmersivas**:
    *   Animaciones por *Framer Motion* que evitan reflows pesados en búsquedas.
    *   Notificaciones tipo *Glow Pulse* para inventarios bajos.
    *   Representaciones 3D e indicadores fluidos de niveles de tanque (`TankLevelIndicator`).
*   **Checkout Veloz (Quick Customize)**: Personalización rápida de "toppings" y tamaños sin modales intrusivos, asegurando la menor cantidad de fricción en la cola del cliente.

## 8. Desarrollo y Extensibilidad Futura

Para escalar y extender las funciones de la aplicación:

1.  **Instalación Rápida**: Ejecutar `npm install` y enlazar variables `.env` siguiendo el `.env.example`.
2.  **Modo de Desarrollo**: Uso de `npm run dev` para hot-module replacement.
3.  **Expansión KDS (Kitchen Display System)**: La plataforma está preparada para integrarse nativamente con Web Audio API y proveer soporte en estaciones de preparación con notificaciones acústicas y sincronización instantánea de comandas.

---

*Documentación estructurada y validada automáticamente por Antigravity para Pekao Granizados.*
