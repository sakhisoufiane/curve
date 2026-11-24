FROM curveroyaltysystems/processorbase:latest

WORKDIR /app

# Copy package files separately for better caching
COPY package*.json ./

# Then copy the rest of the application
COPY . .

ARG NPM_TOKEN

# Set up npm authentication
RUN npm config set '//registry.npmjs.org/:_authToken' "${NPM_TOKEN}"

# Install global dependencies
RUN npm install -g pm2 && npm install -g nodemon && npm i

# Verify npx installation
RUN npx -v

# Start the application
CMD ["pm2-runtime", "start", "taskManager.js", "-i", "2", "--node-args", "--max-old-space-size=30000"]
