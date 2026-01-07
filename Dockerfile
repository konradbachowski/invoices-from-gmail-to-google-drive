FROM oven/bun:latest

WORKDIR /app

COPY package.json ./
COPY bun.lock ./

RUN bun install

COPY . .

RUN mkdir -p tokens

EXPOSE 3000

CMD ["bun", "src/index.ts"]
