#!/bin/bash

# TripaliumAI Setup Script
# This script sets up the development environment

set -e

echo "=========================================="
echo "  TripaliumAI Development Setup"
echo "=========================================="

# Check prerequisites
echo ""
echo "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed. Please install Node.js 20+."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "ERROR: Node.js 20+ is required. Current version: $(node -v)"
    exit 1
fi
echo "  Node.js: $(node -v)"

if ! command -v pnpm &> /dev/null; then
    echo "pnpm not found. Installing..."
    npm install -g pnpm
fi
echo "  pnpm: $(pnpm -v)"

if ! command -v docker &> /dev/null; then
    echo "WARNING: Docker not found. You'll need Docker for the database."
fi

# Create .env file if not exists
if [ ! -f ".env" ]; then
    echo ""
    echo "Creating .env file from .env.example..."
    cp .env.example .env

    # Generate secrets
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    JWT_SECRET=$(openssl rand -base64 32)

    # Update .env with generated secrets
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=\"$NEXTAUTH_SECRET\"/" .env
        sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=\"$JWT_SECRET\"/" .env
    else
        sed -i "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=\"$NEXTAUTH_SECRET\"/" .env
        sed -i "s/JWT_SECRET=.*/JWT_SECRET=\"$JWT_SECRET\"/" .env
    fi

    echo "  Generated NEXTAUTH_SECRET and JWT_SECRET"
    echo ""
    echo "  IMPORTANT: Edit .env and add your OPENAI_API_KEY"
else
    echo ""
    echo ".env file already exists. Skipping..."
fi

# Install dependencies
echo ""
echo "Installing dependencies..."
pnpm install

# Start Docker services
echo ""
echo "Starting Docker services (PostgreSQL, Redis, Mailhog)..."
if command -v docker &> /dev/null; then
    docker-compose -f docker/docker-compose.dev.yml up -d

    echo "Waiting for PostgreSQL to be ready..."
    sleep 5
else
    echo "WARNING: Docker not available. Start the database manually."
fi

# Generate Prisma client
echo ""
echo "Generating Prisma client..."
pnpm db:generate

# Run database migrations
echo ""
echo "Running database migrations..."
pnpm db:migrate:dev --name init

# Seed the database
echo ""
echo "Seeding the database..."
pnpm db:seed

echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "  1. Edit .env and add your OPENAI_API_KEY"
echo ""
echo "  2. Start the development servers:"
echo "     pnpm dev"
echo ""
echo "  3. Open in browser:"
echo "     - Frontend: http://localhost:3000"
echo "     - API Docs: http://localhost:3001/api/docs"
echo "     - Mailhog:  http://localhost:8025"
echo ""
echo "  Test credentials:"
echo "     Email:    test@tripalium.local"
echo "     Password: testpassword123"
echo ""
