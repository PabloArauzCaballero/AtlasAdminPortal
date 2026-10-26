# syntax=docker/dockerfile:1

FROM node:22-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914 AS build
WORKDIR /app
COPY package.json yarn.lock* ./
RUN corepack enable && yarn install --frozen-lockfile
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN yarn build

FROM node:22-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914 AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json yarn.lock* ./
RUN corepack enable && yarn install --frozen-lockfile --production
COPY --from=build /app/dist ./dist

# El broker custodia credenciales: nunca corre como root y no monta el código fuente.
USER node
EXPOSE 3020
CMD ["node", "dist/src/standalone/worker-main.js"]
