FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY prisma ./prisma
RUN npm install

COPY . .
RUN chmod +x entrypoint.sh

EXPOSE 4400
CMD ["./entrypoint.sh"]
