FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

# using TSX in prod is fine for small admin; for stricter builds, add tsc
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
