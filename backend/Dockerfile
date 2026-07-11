FROM node:18-alpine

WORKDIR /app

# Copy package configuration files and install production packages
COPY package*.json ./
RUN npm ci --only=production

# Copy the rest of the application files
COPY . .

# Expose API PORT
EXPOSE 5000

# Set defaults
ENV PORT=5000
ENV NODE_ENV=production

# Run API server
CMD ["node", "server.js"]
