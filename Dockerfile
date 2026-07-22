# --- build stage ---
FROM node:20-alpine AS build
WORKDIR /app

# Build-time env vars (Vite inlines them at build time)
ARG VITE_API_BASE_URL=http://localhost:3000/
ARG VITE_ASSET_CODE=HTGe
ARG VITE_ENV_LABEL=production
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_ASSET_CODE=$VITE_ASSET_CODE
ENV VITE_ENV_LABEL=$VITE_ENV_LABEL

COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

# --- runtime stage ---
FROM nginx:1.27-alpine AS runtime
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
