# Runs on first build of dev container
sudo apt update
sudo apt install trash-cli -y
npm install
npm install -g prpm

# TODO: this is currently a special step for development with devcontainers.
# In the devcontainer.json you will see nanopub-js folder mounted, which must exist on the host
# at the same level as this project (science-live-platform) folder exists on the host.
# Then open the nanopub-js folder on the host and run `yarn install && cd nanopub-utils && npm run build`.
# The setup code below will link the built package to this project for easy developemnt with hot reload.
# In future we should remove all of this and publish the package properly.
# cd ../nanopub-js/
# npm link
# cd ../../science-live-platform/frontend/
# npm link @nanopub/utils
# cd ..

# cd ../nanopub-js/nanopub-display/
# npm link
# cd ../../science-live-platform/frontend/
# npm link @nanopub/display
# cd ..

cd ../nanopub-js/
npm link
cd ../science-live-platform/frontend/
npm link @nanopub/utils @nanopub/display
# npm link @nanopub/display
