FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN chmod +x entrypoint.sh

EXPOSE 4400
CMD ["./entrypoint.sh"]
