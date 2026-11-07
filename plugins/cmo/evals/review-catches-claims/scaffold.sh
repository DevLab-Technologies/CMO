#!/bin/sh
# Stages the Lumen Books fixture workspace (a fictional brand) in the eval workspace.
set -e
fx="$(cd "$(dirname "$0")/../../tests/fixtures" && pwd)"
cp -R "$fx/brand-pack/.cmo" .
