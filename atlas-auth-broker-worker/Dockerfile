# syntax=docker/dockerfile:1

FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS build
WORKDIR /app
COPY package.json yarn.lock* ./
RUN corepack enable && yarn install --frozen-lockfile
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN yarn build

FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json yarn.lock* ./
RUN corepack enable && yarn install --frozen-lockfile --production
COPY --from=build /app/dist ./dist

# El broker custodia credenciales: nunca corre como root y no monta el código fuente.
USER node
EXPOSE 3020
CMD ["node", "dist/src/standalone/worker-main.js"]
