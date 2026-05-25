# Informe de Auditoría UI/UX: Sistema Pekao v2.0 Pro Max

**Fecha:** 24 de Mayo de 2024
**Auditor:** Jules (Senior Product Designer / Frontend QA)
**Objetivo:** Evaluación exhaustiva de la transición entre Dark Mode y Light Mode y calidad general de la interfaz.

---

## 1. Contraste y Accesibilidad (WCAG 2.1)

### Hallazgos
- **Paradoja de Temas:** Se ha detectado que tanto `:root` (Light Mode) como `.dark` (Dark Mode) utilizan fondos extremadamente oscuros.
  - `:root`: `hsl(222 47% 7%)` (Luminosidad 7%)
  - `.dark`: `hsl(250 25% 8%)` (Luminosidad 8%)
- **Conformidad de Texto:** El texto principal (`foreground`) tiene un contraste excelente (>18:1). Sin embargo, el texto secundario (`muted-foreground`) con luminosidad del 65% sobre un fondo del 7% tiene una relación de **5.2:1**. Cumple con el nivel AA (4.5:1), pero es insuficiente para el nivel AAA (7:1) en interfaces oscuras donde el cansancio visual es mayor.
- **Elementos Interactivos:** Los componentes `glass-pro` dependen de bordes semi-transparentes. En condiciones de baja iluminación o monitores no calibrados, la jerarquía de elevación se pierde debido a la similitud cromática entre ambos temas.

---

## 2. Coherencia de la Paleta Cromática

### Análisis
- **Dark Mode:** Implementación de alta calidad. Evita el negro puro (#000000) utilizando un azul medianoche que mitiga el efecto de *ghosting* en pantallas OLED y reduce la fatiga visual.
- **Light Mode:** **Identidad Fallida.** Actualmente, el modo "Claro" es simplemente otra variante de modo oscuro. No cumple su función semántica ni de accesibilidad para usuarios con astigmatismo severo que requieren fondos claros con texto oscuro.
- **Colores de Acento:** El violeta eléctrico (`--primary`) es el punto más fuerte del diseño. Mantiene su vitalidad y significado en ambas configuraciones.

---

## 3. Semántica y Jerarquía Visual

### Análisis
- **Z-Index Visual:** El uso de `backdrop-blur-[40px]` y gradientes radiales ("Aurora") crea una profundidad sofisticada. Los elementos se sienten "flotando" correctamente gracias a la clase `atomic-depth`.
- **Tipografía:** El uso extensivo de `font-black` (Space Grotesk) en modo oscuro provoca un efecto visual de "sangrado" (el texto blanco parece más grueso de lo que es). Se recomienda reducir el peso visual en temas oscuros.

---

## 4. Detalles de Implementación Profesional

### Análisis
- **Multimedia:** Los logos e imágenes de producto no tienen filtros adaptativos. Una imagen con fondo blanco "brilla" agresivamente en la interfaz oscura.
- **Prevención de Flash:** Correctamente implementado mediante `next-themes` y cargado en el lado del servidor/cliente sin parpadeos blancos.

---

## 5. Lista de Correcciones (Checklist Accionable)

### 🚩 Puntos Críticos (Bloqueantes)
- [ ] **Invertir Escala de Grises en `:root`:** Cambiar las variables CSS para que el modo Light sea realmente claro (Fondo L > 90%, Texto L < 20%).
- [ ] **Ajustar Contraste Secundario:** Aumentar la luminosidad de `muted-foreground` en temas oscuros para asegurar accesibilidad AAA.

### ✨ Mejoras Estéticas Profesionales
- [ ] **Filtro Adaptativo de Imágenes:** Aplicar `dark:brightness-90 dark:contrast-110` para suavizar elementos multimedia.
- [ ] **Compensación Tipográfica:** Reducir ligeramente el peso de la fuente o el tracking en modo oscuro para mejorar la legibilidad.
- [ ] **Glassmorphism Inverso:** Adaptar los gradientes de `glass-pro` para usar bases blancas traslúcidas en el modo Light real.

---

## Propuesta Técnica de Corrección (CSS)

```css
/* src/index.css - Propuesta de corrección para Light Mode Real */
:root {
  --background: 220 33% 98%; /* Blanco azulado suave */
  --foreground: 222 47% 10%; /* Azul casi negro */
  --card: 0 0% 100%;
  --muted: 220 20% 92%;
  --muted-foreground: 220 10% 45%;
  --border: 220 20% 90%;
}

.dark {
  --background: 222 47% 7%; /* Midnight actual */
  --foreground: 210 40% 98%;
}
```
