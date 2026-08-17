FROM node:20-alpine AS build

# Prevenir falta de memoria (Out of Memory - OOM) durante la compilación en VPS pequeños
ENV NODE_OPTIONS="--max-old-space-size=1536"

WORKDIR /app
COPY package*.json ./

# Instalar TODAS las dependencias (necesarias para compilar Vite y TypeScript)
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine
RUN apk add --no-cache brotli

# Limpiar directorio público por defecto
RUN rm -rf /usr/share/nginx/html/*

COPY --from=build /app/dist /usr/share/nginx/html

# Pre-comprimir archivos estáticos con Brotli nivel 9 (máxima eficiencia sin costo de CPU en tiempo de ejecución)
RUN find /usr/share/nginx/html -type f \( -name "*.html" -o -name "*.js" -o -name "*.css" -o -name "*.svg" -o -name "*.json" -o -name "*.ico" -o -name "*.png" \) -exec brotli -9k {} \;

COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
