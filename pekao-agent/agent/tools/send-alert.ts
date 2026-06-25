/**
 * Tool: send-alert
 *
 * Envía un mensaje formateado al webhook de Make.com configurado.
 * Make.com recibe el payload JSON y enruta al canal configurado
 * (WhatsApp Business, Telegram, Email, etc.).
 *
 * Formato Make.com: el escenario debe tener un módulo
 * "Webhooks > Custom webhook" como trigger.
 */

export default {
  description:
    "Envía una notificación estructurada al webhook de Make.com para que sea distribuida por el canal configurado (WhatsApp, Telegram, email, etc.).",

  parameters: {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ["inventory_alert", "daily_report", "info"],
        description: "Tipo de notificación. Define el enrutamiento en Make.com.",
      },
      title: {
        type: "string",
        description: "Título corto del mensaje (máx 80 caracteres).",
      },
      body: {
        type: "string",
        description: "Cuerpo completo del mensaje. Puede incluir saltos de línea.",
      },
      urgent: {
        type: "boolean",
        description:
          "Si true, Make.com puede priorizar el canal (ej. llamada en vez de mensaje).",
      },
    },
    required: ["type", "title", "body"],
  },

  execute: async ({
    type,
    title,
    body,
    urgent = false,
  }: {
    type: "inventory_alert" | "daily_report" | "info";
    title: string;
    body: string;
    urgent?: boolean;
  }) => {
    const webhookUrl = process.env.NOTIFY_WEBHOOK_URL;

    if (!webhookUrl) {
      throw new Error(
        "NOTIFY_WEBHOOK_URL no está configurada. Agrega la URL del webhook de Make.com al archivo .env"
      );
    }

    // Payload estructurado para Make.com
    // En Make.com puedes usar {{body.type}}, {{body.title}}, {{body.body}}, etc.
    const payload = {
      type,           // "inventory_alert" | "daily_report" | "info"
      title,          // Úsalo como asunto de email o primera línea de WhatsApp
      body,           // Cuerpo completo del mensaje
      urgent,         // Boolean — Make.com puede bifurcar el flujo según esto
      metadata: {
        source: "pekao-agent",
        business: "Punto Play Pausa",
        sentAt: new Date().toISOString(),
        timezone: "America/Bogota",
        localTime: new Date().toLocaleString("es-CO", {
          timeZone: "America/Bogota",
          dateStyle: "short",
          timeStyle: "short",
        }),
      },
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // Make.com responde con "Accepted" (200) o un objeto de error
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Make.com webhook respondió con error ${response.status}: ${errorText}`
      );
    }

    return {
      success: true,
      deliveredTo: "Make.com",
      type,
      urgent,
      deliveredAt: new Date().toLocaleString("es-CO", {
        timeZone: "America/Bogota",
      }),
    };
  },
};
