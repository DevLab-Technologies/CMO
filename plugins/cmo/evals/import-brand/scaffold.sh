#!/bin/sh
set -e
fx="$(cd "$(dirname "$0")/../../tests/fixtures" && pwd)"
cp "$fx/import-source/acme-guidelines.md" .
