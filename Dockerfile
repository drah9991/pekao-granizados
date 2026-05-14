FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
RUN apk add --no-cache brotli
COPY --from=build /app/dist /usr/share/nginx/html

RUN find /usr/share/nginx/html -type f -name "*.html" -exec brotli -9k {} \; ; \
    find /usr/share/nginx/html -type f -name "*.js" -exec brotli -9k {} \; ; \
    find /usr/share/nginx/html -type f -name "*.css" -exec brotli -9k {} \; ; \
    find /usr/share/nginx/html -type f -name "*.svg" -exec brotli -9k {} \; ; \
    find /usr/share/nginx/html -type f -name "*.json" -exec brotli -9k {} \; ; \
    find /usr/share/nginx/html -type f -name "*.ico" -exec brotli -9k {} \; ; \
    find /usr/share/nginx/html -type f -name "*.png" -exec brotli -9k {} \;

COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
