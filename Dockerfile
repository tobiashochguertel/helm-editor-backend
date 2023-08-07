FROM node:14-alpine AS builder

WORKDIR /app

COPY ./package.json /app/package.json
COPY ./yarn.lock /app/yarn.lock
RUN yarn install
COPY ./ /app
RUN yarn run build

FROM node:19-alpine AS runner
ENV NODE_ENV=production

WORKDIR /app

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/yarn.lock /app/yarn.lock
RUN yarn install

EXPOSE 3001

CMD ["yarn", "run", "start"]