FROM node:18 AS build
WORKDIR /app
COPY package*.json ./
COPY . .
RUN npm install --prefer-offline || true
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview", "--", "--host"]
