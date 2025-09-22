FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies (will create package-lock.json if it doesn't exist)
RUN npm install

# Copy source files and build TypeScript
COPY . .
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --omit=dev

EXPOSE 3000
CMD ["npm", "start"]
