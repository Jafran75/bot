FROM node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install --production

# Bundle app source
COPY . .

# Persistence warning: Ensure db.json is handled via volumes in production
# Or it will be reset on every container restart.

CMD [ "npm", "start" ]
