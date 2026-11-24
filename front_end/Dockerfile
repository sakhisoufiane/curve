FROM --platform=linux/amd64 node:22.14.0-alpine
COPY . ./var/www

WORKDIR /var/www

ARG NPM_TOKEN

# Set up npm authentication
RUN npm config set '//registry.npmjs.org/:_authToken' "${NPM_TOKEN}"

# Install global dependencies
RUN npm install -g pm2 && npm install -g nodemon && npm ci

RUN npm run build


CMD [ "pm2-runtime", "start", "index.js", "-i", "4"]

EXPOSE 8082
