FROM node:20-alpine as builder
WORKDIR /usr/src/app
COPY . /usr/src/app
RUN npm ci
RUN npm run build

FROM node:20-alpine as app
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/build ./build
COPY --from=builder /usr/src/app/public ./public
COPY ./package.json ./package.json
EXPOSE 80
CMD npm run start