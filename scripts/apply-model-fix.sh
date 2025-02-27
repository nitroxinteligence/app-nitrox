#!/bin/bash

# Script to apply database structure fixes to the Supabase database
# This script will execute SQL migrations directly on your Supabase database

# Define colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo "Applying database fixes to Supabase..."

# Load environment variables
if [ -f .env.local ]; then
  echo "Loading environment variables from .env.local"
  set -a
  source .env.local
  set +a
else
  echo "${YELLOW}Warning: .env.local file not found. Using environment variables.${NC}"
fi

# Check for Supabase URL and key
if [ -z "$SUPABASE_URL" ] && [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "${RED}Error: Supabase URL not found in environment variables.${NC}"
  echo "Please set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL"
  exit 1
fi

if [ -z "$SUPABASE_SERVICE_KEY" ] && [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
  echo "${RED}Error: Supabase key not found in environment variables.${NC}"
  echo "Please set SUPABASE_SERVICE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY"
  exit 1
fi

# Use service key if available, otherwise use anon key
SUPABASE_URL=${SUPABASE_URL:-$NEXT_PUBLIC_SUPABASE_URL}
SUPABASE_KEY=${SUPABASE_SERVICE_KEY:-$NEXT_PUBLIC_SUPABASE_ANON_KEY}

# Show truncated values for security
echo "Using Supabase URL: ${SUPABASE_URL:0:20}..."
echo "Using Supabase Key: ${SUPABASE_KEY:0:10}..."

# Apply the first migration: create the main openai_usage table
echo "Step 1: Creating new openai_usage table with all required columns..."
SQL_CONTENT_1=$(cat supabase/migrations/20240801000008_create_new_openai_usage_table.sql)

if [ -z "$SQL_CONTENT_1" ]; then
  echo "${RED}Error: Could not read first migration file.${NC}"
  exit 1
fi

# Execute the first SQL against Supabase
echo "Executing main table creation migration..."
RESPONSE_1=$(curl -s -X POST \
  "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"${SQL_CONTENT_1}\"}")

# Check for errors in first migration
if [[ "$RESPONSE_1" == *"error"* ]]; then
  echo "${RED}Error executing main table creation:${NC}"
  echo "$RESPONSE_1"
  echo "${YELLOW}Continuing to next migration...${NC}"
else
  echo "${GREEN}Main table created successfully!${NC}"
fi

# Apply the second migration: create the daily aggregation table and function
echo "Step 2: Creating daily aggregation table and function..."
SQL_CONTENT_2=$(cat supabase/migrations/20240801000009_add_daily_aggregations.sql)

if [ -z "$SQL_CONTENT_2" ]; then
  echo "${RED}Error: Could not read second migration file.${NC}"
  exit 1
fi

# Execute the second SQL against Supabase
echo "Executing daily aggregation migration..."
RESPONSE_2=$(curl -s -X POST \
  "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"${SQL_CONTENT_2}\"}")

# Check for errors in second migration
if [[ "$RESPONSE_2" == *"error"* ]]; then
  echo "${RED}Error executing daily aggregation creation:${NC}"
  echo "$RESPONSE_2"
  exit 1
else
  echo "${GREEN}Daily aggregation table and function created successfully!${NC}"
fi

# Verify the result
echo ""
echo "${GREEN}Database structure has been fixed successfully!${NC}"
echo "You can now restart your application and check if the issue is resolved."
echo ""
echo "To verify the fix, check if both tables exist with the correct structure:"
echo "1. Main usage table: SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'openai_usage';"
echo "2. Daily aggregation table: SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'openai_usage_daily';"
echo "3. Aggregation function: SELECT proname FROM pg_proc WHERE proname = 'update_openai_usage_aggregations';"

exit 0 