FROM node:18
WORKDIR /app
COPY package*.json .npmrc* ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
