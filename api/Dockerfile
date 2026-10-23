# The image of the API, in two stages.
#
#   build  compiles, and keeps the Prisma CLI and tsx: the `migrate` service
#          of compose.yaml runs the migrations and the seed from this stage.
#   final  only what runs: the production dependencies and dist/.

FROM node:26-alpine AS build
WORKDIR /app
# The folder of the SQLite file, owned by `node`: a named volume mounted on
# it keeps this owner on its first creation.
RUN mkdir -p /app/db && chown -R node:node /app
USER node

# Dependencies before the code: this layer stays cached while they do not
# change. The schema with them: the postinstall runs `prisma generate`.
COPY --chown=node:node package.json package-lock.json prisma.config.ts ./
COPY --chown=node:node prisma/schema.prisma prisma/schema.prisma
RUN npm ci && npm cache clean --force

COPY --chown=node:node . .
RUN npm run build


FROM node:26-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN mkdir -p /app/db && chown -R node:node /app
USER node

COPY --chown=node:node package.json package-lock.json ./
# --omit=optional: no Prisma CLI (an optional dependency of @prisma/client).
# --ignore-scripts: no postinstall, the generated client is already in dist/.
# better-sqlite3 still needs its native binary: rebuild that package alone.
RUN npm ci --omit=dev --omit=optional --ignore-scripts \
  && npm rebuild better-sqlite3 \
  && npm cache clean --force

COPY --from=build --chown=node:node /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]
