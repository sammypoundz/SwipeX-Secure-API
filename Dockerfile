FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY tsconfig.json ./
COPY src ./src
RUN npm exec tsc -p tsconfig.json

ENV NODE_ENV=production PORT=5000
EXPOSE 5000

CMD ["node", "dist/server.js"]
