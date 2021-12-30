FROM node:16 AS runner

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# building your code for production
RUN npm ci --only=production

# Bundle app source
COPY . .

# expose only port
EXPOSE 6000

RUN npm install pm2 -g

CMD ["pm2-runtime", "index.js"]
