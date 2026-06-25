# Original User Request

## 2026-06-24T16:04:00Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Wait for the teamwork_preview subagent to complete the audit.

Realizar una auditoría completa de la Interfaz de Usuario (UI) y la Experiencia de Usuario (UX) del sistema, enfocándose especialmente en el diseño responsivo y la consistencia visual. El objetivo es generar un reporte exhaustivo con sugerencias de código paso a paso sin realizar modificaciones directas al código fuente.

Working directory: c:\Users\pc\OneDrive - Cuidado Seguro en Casa IPS\Documentos\Codigos\pekao\pekao-granizados
Integrity mode: development

## Requirements

### R1. Auditoría UI/UX
Analizar los componentes principales y las páginas del sistema (React + Tailwind CSS) para detectar problemas de responsividad, accesibilidad, jerarquía visual y uso de colores/espacios.

### R2. Reporte de Sugerencias
Generar un único archivo Markdown llamado `ui_ux_audit_report.md` que contenga los hallazgos. Para cada problema encontrado, proporcionar una explicación clara y el código exacto (clases de Tailwind o estructura de React) necesario para solucionarlo. No modificar ningún archivo de código del proyecto.

## Acceptance Criteria

### Verificación del Reporte
- [ ] Existe un archivo `ui_ux_audit_report.md` en el directorio de trabajo.
- [ ] El reporte analiza al menos 5 vistas o componentes clave del sistema (por ejemplo, el POS, el Dashboard, la configuración, modales, etc.).
- [ ] Las sugerencias incluyen rutas de archivos reales y ejemplos concretos de código (ej: de qué clases de Tailwind cambiar a cuáles) en lugar de recomendaciones vagas.
- [ ] El código fuente del proyecto permanece intacto (0 archivos modificados).

---
