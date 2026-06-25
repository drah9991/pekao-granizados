import { defineAgent } from "eve";

export default defineAgent({
  model: "gpt-4o-mini",
  maxSteps: 10,
  temperature: 0.2, // Bajo: respuestas factuales, sin "creatividad"
});
