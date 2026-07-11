# Stage 1: Build the Vite production assets
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package configurations and install packages
COPY package*.json ./
RUN npm ci

# Copy source code and build production files
COPY . .
RUN npm run build

# Stage 2: Serve static assets via Nginx
FROM nginx:alpine

# Copy custom Nginx config for routing support
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose web server port
EXPOSE 5173

# Start Nginx in foreground mode
CMD ["nginx", "-g", "daemon off;"]
