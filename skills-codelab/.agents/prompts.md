# 🗣️ Guía de Prompts para Invocación de Agentes

Usa estas plantillas (puedes copiarlas y pegarlas en el chat) para "despertar" a los agentes específicos según la tarea que necesites resolver en **Pekao Granizados**. Al etiquetar a un agente o mencionar una "Skill", la IA asumirá inmediatamente ese rol y sus restricciones.

---

### 🔵 1. Crear una Nueva Funcionalidad (Feature Nueva)
*El flujo normal que involucra al PM diseñando, el Ingeniero programando y el QA revisando.*

**Fase 1: Invocar al PM para especificaciones**
> "@pm Necesito agregar un módulo de 'Registro de Mermas de Inventario'. Quiero que los empleados puedan anotar vasos o insumos dañados con una justificación. Por favor, usa tu skill `write_specs` para analizar la base de datos actual (Supabase) y redactar en `production_artifacts/Technical_Specification.md` cómo lo integraríamos en las páginas actuales."

**Fase 2: Invocar al Ingeniero para código (tras aprobar al PM)**
> "@engineer ¡El spec está aprobado! Por favor, ejecuta la skill `generate_code` para integrar esto en nuestro código. Genera los componentes en `../src/` y edita lo que necesites para que funcione."

---

### 🎨 2. Trabajo Visual y UI
*Para que el diseñador y el ingeniero estilicen vistas de forma premium.*

> "@pm @designer Antes de programar mi nueva idea del Dashboard de ventas mensuales, usa `design_system.md` para proponerme una paleta de colores y estilos de Tailwind (sombras, bordes) que haga que la vista parezca extremadamente profesional y moderna. Guárdala en `production_artifacts/Design_System.md`."

---

### 🛠️ 3. Refactorización y Mejora de Código (Deuda Técnica)
*Para optimizar archivos monolíticos de React o limpiar código basura.*

> "@engineer Mi archivo `CashRegister.tsx` (o cualquier otro componente) está muy largo y difícil de leer. Usa tu skill `refactor_code` para limpiarlo. Separa las partes complejas en componentes más pequeños dentro de `../src/components/` sin romper y manteniendo la misma lógica de los hooks y la BD."

---

### 🕵️‍♂️ 4. Auditoría, Linting y Testing (Calidad)
*Para garantizar que toda la app de Pekao funciona correctamente sin crasheos.*

**Tests Manuales/Linting:**
> "@qa Acabo de hacer (o el ingeniero acaba de hacer) grandes cambios en las vistas. Abre tu skill `audit_code`, colócate en el directorio raíz de pekao-granizados y ejecuta `npm run build` o `npm run lint`. Revisa los logs de la terminal, dime qué líneas se rompen y arréglalas de forma autónoma."

**Automatización de Testing:**
> "@qa Quiero asegurarme de que mis utilidades de carrito de compras jamás se rompan. Usa la skill `write_tests` para instalar/configurar Vitest y crea un suite de pruebas unitarias (`.test.ts`) para la lógica de sumar productos."

---

### 🚀 5. Operaciones y DevOps
*Para despliegues locales y pases a producción.*

**Despliegue Local (Run):**
> "@devops Ejecuta la skill `deploy_app` para asegurarte de que mis puertos locales estén libres, que no me falte ninguna dependencia reciente de `package.json` instalada y levanta el entorno en `localhost`."

**Despliegue a Producción Automático (CI/CD):**
> "@devops Me estoy cansando de subir los cambios manualmente. Eres el master de infraestructura, ejecuta `setup_ci_cd` y ponme los YAML de GitHub Actions listos para desplegar a producción (Cloud Run o Vercel) automáticamente cuando haga push a `main`."
