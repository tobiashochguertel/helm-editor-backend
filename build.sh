#!/bin/bash
ENV NODE_ENV=production

yarn run build

PACKAGE_VERSION=$(cat package.json | jq -r '.version')

docker buildx build --push \
  --platform linux/arm64/v8,linux/amd64 \
  --tag docker.io/tobiashochguertel/th-helm-playground-backend:"$PACKAGE_VERSION" \
  .

  # --tag docker.io/tobiashochguertel/th-helm-playground-backend:latest \
