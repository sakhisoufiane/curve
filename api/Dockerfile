FROM curveroyaltysystems/apibase:latest

WORKDIR /app

# Copy package files separately for better caching
COPY package*.json ./

# Then copy the rest of the application
COPY . .

# Upgrade npm to 11.10.0
RUN npm install -g npm@11.10.0

ARG NPM_TOKEN
ARG CURVE_ENVIRONMENT

# Set up npm authentication
RUN npm config set '//registry.npmjs.org/:_authToken' "${NPM_TOKEN}"

# Install global dependencies
RUN npm install -g pm2 && npm install -g nodemon && npm ci

CMD ["pm2-runtime", "start", "index.js", "-i", "max", "--node-args", "--max-old-space-size=4096"]

EXPOSE 8081
