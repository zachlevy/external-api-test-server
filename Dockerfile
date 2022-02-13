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

RUN npm install forever -g

# expose only port
EXPOSE 6000

CMD ["forever", "index.js"]
