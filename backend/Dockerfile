FROM node:20-alpine

WORKDIR /app

# Cần tool build cho mysql2
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 5000

CMD ["npm", "run", "start"]

