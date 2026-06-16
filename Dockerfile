# Stage 1: Build the client
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Build the backend
FROM node:20-alpine
WORKDIR /app

# Ensure correct permissions before switching user
RUN chown -R node:node /app

# Install postgresql-client for pg_dump backups
RUN apk add --no-cache postgresql-client

# Switch to the non-root user
USER node

# Install backend dependencies
COPY --chown=node:node package*.json ./
RUN npm install --omit=dev

# Copy backend source and database files
COPY --chown=node:node server/ ./server/
COPY --chown=node:node migrations/ ./migrations/
COPY --chown=node:node seeds/ ./seeds/
COPY --chown=node:node knexfile.js ./

# Copy built client
COPY --from=client-build --chown=node:node /app/client/dist ./client/dist

# Expose port and start
EXPOSE 3001
ENV NODE_ENV=production
CMD npx knex migrate:latest --knexfile knexfile.js && npm start
