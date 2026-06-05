FROM node:22-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["sh", "-c", "printf 'window.__APP_CONFIG__ = { API_BASE_URL: \"%s\" };\\n' \"${API_BASE_URL:-http://localhost:8000}\" > /usr/share/nginx/html/env.js && nginx -g 'daemon off;'"]
