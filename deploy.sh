#!/bin/bash
# Firebase Deployment Script
# Usage: ./scripts/deploy.sh [staging|production]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
PROJECT_STAGING="solicitacoes-de-pecas-staging"
PROJECT_PRODUCTION="solicitacoes-de-pecas"

echo -e "${GREEN}=== Firebase Deployment Script ===${NC}"
echo -e "Environment: ${YELLOW}${ENVIRONMENT}${NC}\n"

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    echo -e "${RED}Error: Invalid environment. Use 'staging' or 'production'${NC}"
    exit 1
fi

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}Error: Firebase CLI not installed${NC}"
    echo "Install with: npm install -g firebase-tools"
    exit 1
fi

# Pre-deployment checks
echo -e "${GREEN}Running pre-deployment checks...${NC}"

# Check if tests pass
echo "- Running tests..."
npm test || {
    echo -e "${RED}Tests failed! Aborting deployment.${NC}"
    exit 1
}

# Check if linting passes
echo "- Running linter..."
npm run lint:check || {
    echo -e "${YELLOW}Warning: Linting issues found. Continue anyway? (y/n)${NC}"
    read -r response
    if [[ "$response" != "y" ]]; then
        exit 1
    fi
}

# Check if user is logged in to Firebase
echo "- Checking Firebase authentication..."
firebase login:list || {
    echo -e "${RED}Not logged in to Firebase. Run: firebase login${NC}"
    exit 1
}

# Select Firebase project
if [[ "$ENVIRONMENT" == "staging" ]]; then
    PROJECT=$PROJECT_STAGING
else
    PROJECT=$PROJECT_PRODUCTION
fi

echo -e "\n${GREEN}Deploying to ${ENVIRONMENT}...${NC}"
echo "Firebase Project: $PROJECT"

# Use the correct Firebase project
firebase use $PROJECT || {
    echo -e "${RED}Error: Could not select Firebase project${NC}"
    exit 1
}

# Update service worker cache version if not already done
echo -e "\n${YELLOW}Note: Make sure CACHE_VERSION in service-worker.js has been incremented!${NC}"
echo "Current version:"
grep "CACHE_VERSION" service-worker.js | head -1

if [[ "$ENVIRONMENT" == "production" ]]; then
    echo -e "\n${RED}=== PRODUCTION DEPLOYMENT ===${NC}"
    echo -e "${YELLOW}This will deploy to the live production environment!${NC}"
    echo -e "Continue? (yes/no)"
    read -r confirm
    if [[ "$confirm" != "yes" ]]; then
        echo "Deployment cancelled."
        exit 0
    fi
fi

# Deploy to Firebase Hosting
echo -e "\n${GREEN}Deploying to Firebase Hosting...${NC}"
firebase deploy --only hosting || {
    echo -e "${RED}Deployment failed!${NC}"
    exit 1
}

# If production, optionally deploy database rules
if [[ "$ENVIRONMENT" == "production" ]]; then
    echo -e "\n${YELLOW}Deploy database rules? (y/n)${NC}"
    read -r deploy_rules
    if [[ "$deploy_rules" == "y" ]]; then
        echo "Deploying database rules..."
        firebase deploy --only database || {
            echo -e "${RED}Database rules deployment failed!${NC}"
            exit 1
        }
    fi
fi

# Success message
echo -e "\n${GREEN}✓ Deployment successful!${NC}"
echo "Environment: $ENVIRONMENT"
echo "Project: $PROJECT"

# Show hosting URL
if [[ "$ENVIRONMENT" == "staging" ]]; then
    echo -e "\nStaging URL: ${GREEN}https://staging.dashboard-pecas.example.com${NC}"
else
    echo -e "\nProduction URL: ${GREEN}https://dashboard-pecas.example.com${NC}"
fi

# Post-deployment checks
echo -e "\n${GREEN}Post-deployment checks:${NC}"
echo "1. Verify the application loads correctly"
echo "2. Test critical user flows (login, create request, approve)"
echo "3. Check for console errors"
echo "4. Monitor Firebase Console for errors (first 15 minutes)"
echo "5. Check service worker is active and updated"

# Create deployment log
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_DIR="deployment-logs"
mkdir -p $LOG_DIR
LOG_FILE="$LOG_DIR/deploy_${ENVIRONMENT}_${TIMESTAMP}.log"

cat > $LOG_FILE <<EOF
Deployment Log
==============
Date: $(date)
Environment: $ENVIRONMENT
Project: $PROJECT
Deployed by: $(whoami)
Git commit: $(git rev-parse HEAD)
Git branch: $(git rev-parse --abbrev-ref HEAD)

Status: SUCCESS
EOF

echo -e "\n${GREEN}Deployment log saved to: ${LOG_FILE}${NC}"

exit 0
