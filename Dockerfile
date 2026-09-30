

# ---------- Stage 1: dev (all dependencies, nodemon) ----------
# Used by docker-compose.dev.yml (target: dev) with the code mounted as a volume.
FROM node:22-alpine AS dev
WORKDIR /app
# Prisma's engines need OpenSSL on Alpine.
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
EXPOSE 5000
CMD ["npm", "run", "dev"]

# ---------- Stage 2: build (production dependencies + Prisma client) ----------
FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY prisma ./prisma
RUN npx prisma generate

# ---------- Stage 3: final production image (small) ----------
FROM node:22-alpine AS production
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
# Production node_modules (with the generated Prisma client) from the build stage.
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./
COPY prisma ./prisma
COPY src ./src
# Files uploaded by users are stored here (mount a volume on it).
RUN mkdir -p uploads && chown -R node:node /app
USER node
EXPOSE 5000
CMD ["npm", "run", "start"]
