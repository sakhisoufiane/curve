FROM cypress/base:16.14.2

# RUN npm install cypress@12.1.0 -g

RUN mkdir /app

WORKDIR /app

#WORKDIR /cypressApp

COPY . /app

RUN npm install

RUN $(npm bin)/cypress verify

# RUN npm run ec2:runner
# RUN npm run cy:run:file:record
# RUN $(npm bin)/cypress run --spec cypress/e2e/smoke-tests/**/*

ENTRYPOINT bash command.sh
