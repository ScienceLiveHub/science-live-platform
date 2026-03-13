# How to make a new release

1. Change the `"version": ...` in zotero/package.json to a new version number.
2. Commit and push then tag it as v0.3.0 either in github or run e.g. `git tag v1.0.0` then `git push origin v1.0.0`.
3. Run the Zotero [Plugin Release workflow](https://github.com/ScienceLiveHub/science-live-platform/actions/workflows/zotero-release.yml) in github.
4. The plugin should automatically build and update the release as well, which means zotero users with auto-updates turned on will also get the update.
