FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
RUN npx prisma generate && npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8081
COPY package*.json ./
# The Prisma CLI (a dev dependency) is needed at start-up to apply migrations,
# so the full dependency tree from the build stage is reused.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# tsc does not copy non-TS assets: the assistant reads its app guide from here.
COPY src/modules/assistant/knowledge ./dist/src/modules/assistant/knowledge
COPY prisma ./prisma
EXPOSE 8081
USER node
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/server.js"]
