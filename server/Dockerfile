# syntax=docker/dockerfile:1
FROM node:20-alpine

# Install openssl and wget for Prisma engine and healthchecks
RUN apk add --no-cache openssl wget

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy configuration, database schema, and source code
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

# Generate Prisma Client and compile TypeScript to dist/
RUN npx prisma generate
RUN npm run build

# Copy entrypoint script and ensure Unix line endings
COPY docker-entrypoint.sh ./
RUN sed -i 's/\r$//' ./docker-entrypoint.sh && chmod +x ./docker-entrypoint.sh

# Expose backend HTTP and WebSocket port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
