FROM node:20-alpine

WORKDIR /app

# Cài vite global để chắc chắn có binary
RUN npm install -g vite

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5174

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5174"]

