#!/bin/bash

# Runs on first build of dev container

# Install Zotero PPA
curl -sL https://raw.githubusercontent.com/retorquere/zotero-deb/master/install.sh | sudo bash

sudo apt update
sudo apt upgrade -y
sudo apt install zotero trash-cli magic-wormhole desktop-file-utils -y

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
# Some servers randomly return 403 error when they detect a server is downloading a file, even if a user-agent is specified.
# Running the same wget command multiple times in succession usually resolves it. This will retry up to 10 times, at 2 second intervals.
for i in {1..10}; do wget --debug --user-agent="Mozilla/5.0 (X11; Linux x86_64)" https://oem.bmj.com/content/oemed/79/12/795.full.pdf && break || sleep 2; done

# Install Serena for efficient agentic coding lookup https://github.com/oraios/serena#quick-start
uv tool install -p 3.13 serena-agent@latest --prerelease=allow
