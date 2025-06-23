FROM node:24-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm i --only=production

COPY . .

ENTRYPOINT ["npm", "start"]
