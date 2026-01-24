FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY packages/shared/package*.json ./packages/shared/

# Copy source code (needed for file: dependencies)
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
COPY tsconfig.json ./

# Build shared package
WORKDIR /app/packages/shared
RUN npm install --legacy-peer-deps
RUN npm run build

# Install web dependencies and build
WORKDIR /app/apps/web
RUN npm install --legacy-peer-deps

ARG NEXT_PUBLIC_API_URL=https://tripalium.projets.work
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

EXPOSE 3000

# Use next start instead of standalone server.js
CMD ["npm", "start"]
