FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --no-fund
RUN npm rebuild bcrypt

COPY . .

RUN npx --no-install prisma generate

EXPOSE 4000

CMD ["npm", "run", "dev"]
