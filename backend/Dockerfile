# --- Est�gio de Compila��o ---
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma/
RUN npx prisma generate

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src

RUN npm run build

# --- Est�gio de Produ��o ---
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY tsconfig.json tsconfig.build.json ./

EXPOSE 3000

# O Compose sobrescreve este comando no serviço único de inicialização do banco.
CMD ["npm", "run", "start"]
