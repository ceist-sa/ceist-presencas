# Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy lockfile and package.json first to leverage Docker cache
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# Production stage. The build is self-contained, so no node_modules are needed.
FROM oven/bun:1-slim AS runner

WORKDIR /app

COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./

EXPOSE 3000

ENV NODE_ENV=production
CMD ["bun", "./build/index.js"]
