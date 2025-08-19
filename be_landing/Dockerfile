# Use the official Node.js 22 Alpine image
FROM node:22-alpine

# Install curl for health checks and debugging
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy application code
COPY . .

# Build CSS
RUN npm run build-css-prod

# Remove dev dependencies for smaller image
RUN npm prune --production

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]