FROM dhi.io/node:24-alpine3.23-dev AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM dhi.io/node:24-alpine3.23 AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY package.json index.js ./

USER node

CMD ["node", "index.js"]