# pekao-agent

Agente autónomo de **Punto Play Pausa** construido con [Eve](https://github.com/vercel/eve).

## ¿Qué hace?

- 📦 **Alerta de Inventario**: Detecta en tiempo real cuando cualquier producto cae por debajo de su `min_stock` y envía una notificación instantánea.
- 📊 **Reporte Diario**: Cada mañana a las 8:00 AM genera y entrega un resumen de ventas del día anterior por sucursal.

## Setup rápido

```bash
cd pekao-agent
npm install
cp .env.example .env   # Rellena las variables
npm run dev            # Abre el terminal UI de Eve
```

## Variables de entorno requeridas

| Variable | Descripción |
|---|---|
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (acceso total, solo backend) |
| `NOTIFY_WEBHOOK_URL` | URL de webhook (Discord, Slack, o Make.com → WhatsApp) |
| `OPENAI_API_KEY` | Clave de API de OpenAI (para el modelo del agente) |

## Estructura

```
agent/
├── agent.ts              # Configuración del modelo
├── instructions.md       # Identidad y comportamiento del agente
├── tools/
│   ├── get-low-stock.ts  # Consulta productos bajo mínimo
│   ├── get-daily-sales.ts# Consulta ventas del día anterior
│   └── send-alert.ts     # Envía notificación vía webhook
└── schedules/
    └── daily-report.ts   # Cron: 8 AM diario
```
