#!/bin/bash

# Deployment Script for Teacher-Tutor AI on Vultr VPS

# 1. Update System
echo "Updating system..."
apt-get update && apt-get upgrade -y

# 2. Install Docker & Docker Compose
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
fi

# 3. Project Setup
PROJECT_DIR="/opt/teacher-tutor-ai"
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# 4. Copy files (Assumes this script is run where the files are uploaded)
# You would typically upload the project files here using SCP/SFTP
# For this script, we assume files are already in place or pulled from git

# 5. Build and Start Services
echo "Building and starting services..."
# We use the docker-compose.vps.yml file
docker compose -f docker-compose.vps.yml up -d --build

echo "Deployment Complete!"
echo "Your AI Tutor is ready at: https://${DOMAIN_NAME:-139.180.143.176.nip.io}"
