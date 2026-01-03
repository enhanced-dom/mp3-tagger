#!/bin/bash

# Define the minimum Node.js version required
MIN_NODE_VERSION="20.0.0"

# Get the current Node.js version
CURRENT_NODE_VERSION=$(node -v | sed 's/v//')

PARENT_PATH=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )

# Compare versions
if [[ $(printf "%s\n" "$CURRENT_NODE_VERSION" "$MIN_NODE_VERSION" | sort -V | head -n1) == "$MIN_NODE_VERSION" ]]; then
  cd "$PARENT_PATH"
  node ./index.mjs "$1"
else
  echo "Error: Node.js version is insufficient (needs minimum v20)"
fi