FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "src/index.js"]
