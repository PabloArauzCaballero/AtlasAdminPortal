# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json yarn.lock* ./
RUN corepack enable && yarn install --frozen-lockfile
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN yarn build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json yarn.lock* ./
RUN corepack enable && yarn install --frozen-lockfile --production
COPY --from=build /app/dist ./dist

# El broker custodia credenciales: nunca corre como root y no monta el código fuente.
USER node
EXPOSE 3020
CMD ["node", "dist/src/standalone/worker-main.js"]
