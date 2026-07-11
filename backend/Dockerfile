FROM node:18-alpine

WORKDIR /app

# Copy package configuration files and install production packages
COPY package*.json ./
RUN npm ci --only=production

# Copy the rest of the application files
COPY . .

# Expose API PORT (Fly.io uses 8080 by default)
EXPOSE 8080

# Set defaults
ENV PORT=8080
ENV NODE_ENV=production

# Run API server
CMD ["node", "server.js"]
