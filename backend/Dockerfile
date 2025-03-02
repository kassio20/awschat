FROM node:18-alpine
WORKDIR /usr/src/app

# Copiar apenas os arquivos de dependência primeiro
COPY package*.json ./
RUN npm install

# Copiar o resto do código
COPY . .

# Copiar arquivo .env
COPY ../.env ./.env

EXPOSE 3001
CMD ["npm", "start"]
