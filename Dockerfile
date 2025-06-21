FROM node:18.19-alpine3.19

WORKDIR /app

# Install curl for healthcheck
RUN apk --no-cache add curl

# Copy package files first for better layer caching
COPY everything/package*.json ./
RUN npm install

# Copy application code
COPY everything/ ./

# Expose the application port
EXPOSE 3094

# Set default environment variables
ARG PORT=3094
ARG NODE_ENV=production
ENV PORT=${PORT}
ENV NODE_ENV=${NODE_ENV}

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Run the application with SSE transport
CMD ["node", "src/index.js", "--sse"]
