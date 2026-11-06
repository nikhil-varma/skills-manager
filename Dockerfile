# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY package*.json ./
RUN npm install --omit=dev

# Copy built frontend assets
COPY --from=builder /app/dist ./dist

# Copy backend server code
COPY server/ ./server

EXPOSE 3001

CMD ["node", "server/index.js"]
