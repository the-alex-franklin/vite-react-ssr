FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY pnpm-lock.yaml ./

RUN npm install -g pnpm
RUN pnpm install --prod --frozen-lockfile

COPY dist/ ./dist/
COPY server.js .

EXPOSE 5173

CMD ["node", "server.js"]
