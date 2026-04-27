# How to make a new release

1. Change the e.g. `"version": "1.0.0"` in [zotero/package.json](package.json) to a new version number, commit and push.
2. Tag the commit in github e.g. `git tag v1.0.0` then `git push origin v1.0.0`.
3. Run the [Zotero Plugin Release workflow](https://github.com/ScienceLiveHub/science-live-platform/actions/workflows/zotero-release.yml) in github.
4. The plugin should automatically build and update the release as well, which means zotero users with auto-updates turned on will also get the update.
5. Check the auto-generated release notes in github, and make corrections where necessary, take a look at previous for ideas.
6. Test in Zotero via the auto-update to make sure everything works as expected.

# Supporting new versions of Zotero

1. Make sure `zotero-plugin-scaffold` is the latest version in [zotero/package.json](package.json).
2. Fix any breaking changes in the latest Zotero plugin API.
3. In [zotero/addon/manifest.json](addon/manifest.json) update `strict_max_version` to latest.
4. Test dev (update to latest Zotero in dev-container: `sudo apt update && sudo apt instal zotero`) and make a new release (see above).
