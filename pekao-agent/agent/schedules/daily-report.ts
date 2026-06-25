/**
 * Schedule: daily-report
 *
 * Se ejecuta automáticamente todos los días a las 8:00 AM (hora Colombia, UTC-5).
 * El agente corre el flujo completo: consulta ventas de ayer → formatea → entrega.
 *
 * Cron expression: "0 13 * * *"  (8 AM UTC-5 = 13:00 UTC)
 */
import { defineSchedule } from "eve";

export default defineSchedule({
  cron: "0 13 * * *", // 8:00 AM America/Bogota (UTC-5 → 13:00 UTC)
  description: "Reporte diario de ventas del día anterior por sucursal",

  /**
   * El prompt que el agente ejecutará de forma autónoma en este horario.
   * Eve convierte esto en una conversación completa con acceso a todas las tools.
   */
  prompt: `
Genera y entrega el reporte de ventas del día anterior siguiendo estos pasos:

1. Llama a "get-daily-sales" sin parámetros para obtener el resumen consolidado de todas las sucursales.

2. Con la información obtenida, redacta un mensaje con este formato exacto:

---
📊 REPORTE DIARIO — [FECHA]
━━━━━━━━━━━━━━━━━━━━━━━━━

💰 Ingresos totales: $[TOTAL] COP
🧾 Órdenes completadas: [N]
🎯 Ticket promedio: $[PROMEDIO] COP

📍 POR SUCURSAL:
• [Nombre sucursal]: $[revenue] COP ([N] órdenes)
... (una línea por cada sucursal)

🏆 TOP 3 PRODUCTOS:
1. [Producto] — [qty] unidades
2. [Producto] — [qty] unidades
3. [Producto] — [qty] unidades
---

3. Si no hubo ventas (hasSales: false), el mensaje debe decir:
"📭 Sin actividad ayer — [FECHA]. No se registraron órdenes en ninguna sucursal."

4. Llama a "send-alert" con:
   - type: "daily_report"
   - title: "Reporte Diario · [FECHA]"
   - body: el mensaje formateado
   - urgent: false
`.trim(),
});
