/**
 * Schedule: inventory-monitor
 *
 * Se ejecuta 2 veces al día: 6 AM y 6 PM (hora Colombia, UTC-5).
 * → 6 AM  COL = 11:00 UTC
 * → 6 PM  COL = 23:00 UTC
 *
 * Si hay items bajo mínimo, envía alerta a Make.com.
 * Si todo está en niveles normales, termina silenciosamente.
 *
 * Cron: "0 11,23 * * *"
 */
import { defineSchedule } from "eve";

export default defineSchedule({
  cron: "0 11,23 * * *", // 6 AM y 6 PM hora Colombia (UTC-5)
  description: "Monitor de inventario bajo mínimo — revisión cada 12 horas (6 AM y 6 PM)",

  prompt: `
Realiza un chequeo de inventario siguiendo estos pasos EXACTOS:

1. Llama a la herramienta "get-low-stock" sin parámetros para revisar todas las sucursales.

2. Si el resultado tiene "hasAlerts": false:
   — NO hagas nada más. NO llames a "send-alert". Termina aquí.
   — Todo está bien.

3. Si el resultado tiene "hasAlerts": true, construye el siguiente mensaje:

⚠️ ALERTA DE INVENTARIO — Punto Play Pausa
📅 Revisado: [checkedAt del resultado]
━━━━━━━━━━━━━━━━━━━━━━━━━

[N] item(s) por debajo del mínimo:

[Para cada item en la lista:]
• [name] ([type]) — [store]
  Actual: [stock_actual] / Mínimo: [stock_minimo]

━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Acción requerida: Reabastecer antes de la próxima apertura.

4. Llama a "send-alert" con:
   - type: "inventory_alert"
   - title: "⚠️ Inventario bajo — [N] item(s) en alerta"
   - body: el mensaje completo construido en el paso 3
   - urgent: true si hay más de 5 items en alerta, false si son 1-5
`.trim(),
});
