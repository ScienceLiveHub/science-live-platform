#!/bin/bash

# Runs on first build of dev container

# Install Zotero PPA
curl -sL https://raw.githubusercontent.com/retorquere/zotero-deb/master/install.sh | sudo bash

sudo apt update
sudo apt upgrade -y
sudo apt install zotero trash-cli magic-wormhole -y

# Update to yarn 4+, which is sometimes needed for using local dev versions of nanopub-js
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
corepack enable
yarn set version berry

npm install

# Setup and dependencies for Playwright (Chrome etc)
npx playwright install-deps
npx playwright install

# Download some sample paper pdfs to help with testing the zotero plugin
cd /home/node
wget https://inbre.jabsom.hawaii.edu/wp-content/uploads/2017/05/Imaizumi-Yuko_Research-paper-2017.pdf
wget --debug --user-agent="Mozilla/5.0 (X11; Linux x86_64)" https://oem.bmj.com/content/oemed/79/12/795.full.pdf
