#!/bin/bash

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Navigate to project
cd /Users/josetomas/mundial-bets

# Start Next.js dev server
npm run dev
