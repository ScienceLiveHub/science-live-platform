# Runs on first build of dev container

# Install Zotero PPA
curl -sL https://raw.githubusercontent.com/retorquere/zotero-deb/master/install.sh | sudo bash

sudo apt update
sudo apt install zotero trash-cli -y
npm install
npm install -g prpm
