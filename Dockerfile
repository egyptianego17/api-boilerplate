FROM node:lts AS dist
COPY package.json ./

RUN npm install

COPY . ./

RUN npm run build:prod

FROM node:lts AS node_modules
COPY package.json ./

RUN npm install --omit=dev --ignore-scripts && npm rebuild bcrypt

FROM node:lts

ARG PORT=3000

ENV NODE_ENV=production

RUN mkdir -p /usr/src/app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY --from=dist dist /usr/src/app/dist
COPY --from=node_modules node_modules /usr/src/app/node_modules

COPY . /usr/src/app

EXPOSE $PORT

CMD [ "npm", "run", "start:prod" ]
