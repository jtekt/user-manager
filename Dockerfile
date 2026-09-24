FROM node:20
WORKDIR /usr/src/app

ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION
COPY . .
RUN npm install
RUN npm run swagger-autogen
RUN npm run build
EXPOSE 80
CMD [ "npm", "run", "start" ]
