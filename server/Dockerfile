FROM node:20-alpine as builder
RUN apk add --no-cache python3
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
COPY ./prisma ./prisma
EXPOSE 80
CMD npx prisma migrate deploy; npx prisma db seed; npm run start
