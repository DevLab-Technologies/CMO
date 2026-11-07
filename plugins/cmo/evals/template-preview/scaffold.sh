#!/bin/sh
# Stages the Lumen Books fixture workspace, and links the user's renderer install
# (~/.cmo/render, from the README) so the eval workspace can find Playwright.
set -e
fx="$(cd "$(dirname "$0")/../../tests/fixtures" && pwd)"
cp -R "$fx/brand-pack/.cmo" .
real_home=$(eval echo "~$(id -un)")
if [ -d "$real_home/.cmo/render/node_modules" ]; then
  ln -s "$real_home/.cmo/render/node_modules" node_modules
fi
