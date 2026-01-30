FROM node:22-bookworm-slim

WORKDIR /app

# Copiar dependencias
COPY package*.json ./
RUN npm install --production

# Copiar código fuente
COPY src ./src
COPY tsconfig.json ./
COPY GUIDE.md WHITEPAPER.md ./

# Compilar TypeScript a JavaScript
RUN npm install -g typescript ts-node
RUN npx tsc --outDir dist || echo "Skipping tsc, using ts-node"

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3000

# Crear directorio de almacenamiento
RUN mkdir -p /app/.lobpoop_storage

# Puerto de Google Cloud Run
EXPOSE 3000

# Comando de inicio
CMD ["npx", "ts-node", "src/server.ts"]
