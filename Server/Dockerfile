FROM node:18-bullseye-slim AS builder
WORKDIR /app
COPY package*.json . 
RUN npm install && npm cache clean --force
COPY . .
RUN npm run build


FROM node:18-alpine
RUN npm install -g serve
WORKDIR /app
COPY --from=builder /app/dist .
CMD ["serve", "-s", ".", "-l", "5173"]
