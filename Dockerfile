
# 1 - Etapa de construcción
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código
COPY . .

# Compilar
RUN npm run build

# Preparar dependencias de producción
RUN npm prune --omit=dev


# 2 - Etapa de producción
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=80

# Copiar dependencias de producción
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

# Copiar archivos compilados
COPY --from=builder --chown=node:node /app/dist ./dist

# Copiar package.json
COPY --from=builder --chown=node:node /app/package.json ./package.json

# Ejecutar sin privilegios
USER node

EXPOSE 80

CMD ["node", "dist/main.js"]
