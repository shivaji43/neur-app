#!/bin/bash

# change the default POSTGRES_USER and POSTGRES_PASSWORD 
# to the actual value defined in your .env
export POSTGRES_USER=${POSTGRES_USER:-"admin"}
export POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-"admin"}

DB_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5433/neurdb"
export DATABASE_URL=$DB_URL
export DIRECT_URL=$DB_URL

pnpm run dev:local