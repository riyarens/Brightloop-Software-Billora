FROM node:22-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci

COPY backend ./backend
WORKDIR /app/backend

RUN npx prisma generate && npm run build

EXPOSE 5000

CMD ["npm", "run", "start"]
