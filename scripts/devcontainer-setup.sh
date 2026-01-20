# Runs on first build of dev container

# Install Zotero PPA
curl -sL https://raw.githubusercontent.com/retorquere/zotero-deb/master/install.sh | sudo bash

sudo apt update
sudo apt install zotero trash-cli -y
npm install
npm install -g prpm

# Download a sample paper pdf to help with testing the zotero plugin
cd /home/node
wget https://inbre.jabsom.hawaii.edu/wp-content/uploads/2017/05/Imaizumi-Yuko_Research-paper-2017.pdf
