FROM node:20-alpine

WORKDIR /app

# Install build dependencies for canvas and puppeteer + OpenSSL for Prisma
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    pixman-dev \
    cairo-dev \
    pango-dev \
    giflib-dev \
    libjpeg-turbo-dev \
    openssl \
    openssl-dev

# Set puppeteer to use system chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copy source code (needed for file: dependencies)
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY tsconfig.json ./
COPY package*.json ./

# Build shared package
WORKDIR /app/packages/shared
RUN npm install --legacy-peer-deps
RUN npm run build

# Install API dependencies and build
WORKDIR /app/apps/api
RUN npm install --legacy-peer-deps
RUN npx prisma generate
RUN npm run build

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
