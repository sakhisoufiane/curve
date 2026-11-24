#!/bin/sh

PACKAGE_NAME="$1"

if [ -z "$PACKAGE_NAME" ]; then
  echo "Error: No package name provided."
  echo "Usage: npm run gen:package <name>"
  exit 1
fi

turbo gen workspace \
  --copy @curveroyaltysystems/template \
  --type package \
  --destination ./packages/$PACKAGE_NAME \
  --name "@curveroyaltysystems/$PACKAGE_NAME"