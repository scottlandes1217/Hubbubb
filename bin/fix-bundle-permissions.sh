#!/bin/bash
set -e

# Fix permissions for bundle path at runtime
chown -R rails:rails /usr/local/bundle

exec "$@" 