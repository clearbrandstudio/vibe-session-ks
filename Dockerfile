# Stage 1: Build the React frontend
FROM node:20-alpine AS build

WORKDIR /app/client

# Copy client dependencies and install
COPY client/package*.json ./
RUN npm install

# Copy the rest of the client code and build
COPY client/ ./
RUN npm run build


# Stage 2: Setup the Node.js Express server
FROM node:20-alpine

WORKDIR /app

# Copy server dependencies and install (production only)
COPY package*.json ./
RUN npm install --production --ignore-scripts

# Copy server source code and configuration
COPY server.js ./
COPY settings.json ./

# Copy the built React app from Stage 1 into the server's expected static directory
COPY --from=build /app/client/dist ./client/dist
COPY client/settings.html ./client/settings.html

# Expose the port the server listens on
EXPOSE 3001

# Start the Node.js server
CMD ["node", "server.js"]
