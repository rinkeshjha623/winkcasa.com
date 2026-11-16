#!/bin/sh
# Run all tests: sh tests/run.sh
cd "$(dirname "$0")/.." && node --no-warnings --import ./tests/register.mjs --test "tests/**/*.test.mjs" 2>&1
