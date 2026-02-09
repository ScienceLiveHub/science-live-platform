# Zotero Nanopublication Plugin

> Create semantic nanopublications directly in Zotero - no external tools required.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Zotero](https://img.shields.io/badge/Zotero-7.0%2B-red)](https://www.zotero.org/)
[![Version](https://img.shields.io/github/v/release/ScienceLiveHub/science-live-platform)](https://github.com/ScienceLiveHub/science-live-platform/releases)

Transform your Zotero library into a semantic web publishing platform. Create, sign, and publish nanopublications **entirely within Zotero** using an embedded form interface.

---

## ✨ Features

- **All In-Zotero** - Complete workflow in Zotero tabs, no external websites
- **Smart Forms** - Auto-generated forms from nanopub templates
- **ORCID Signing** - Cryptographic signing with your ORCID (WASM-powered)
- **Multiple Templates** - CiTO, AIDA, Rosetta, and custom templates
- **Discovery** - Search for related nanopublications
- **Import** - Add nanopubs from the network to your library
- **Rich Notes** - Beautiful, interactive display of nanopubs
- **Dark Mode** - Seamless theme integration

---

## 🚀 Quick Start

### Installation

1. Download the latest `.xpi` file from [Releases](https://github.com/ScienceLiveHub/science-live-platform/releases)
2. In Zotero: **Tools → Plugins**
3. Click gear icon → **Install Plugin From File**
4. Select the downloaded XPI
5. Restart Zotero

### First Nanopub (5 minutes)

1. **Setup Profile:** File → Setup Nanopub Profile
   - Enter your name and ORCID
   - Keys generated automatically

2. **Choose a Paper:** Select any item in your library

3. **Create Nanopub:** Right-click → Create Nanopublication → Pick a template

4. **Fill Form:** Complete the form in the new Zotero tab

5. **Publish:** Click "Create & Publish" - done!

A rich note with your nanopub is automatically attached.

---

## 📖 How It Works

1. Select paper in Zotero
2. Choose template from browser
3. Fill form in Zotero tab
4. Auto-sign with ORCID
5. Publish to nanopub network
6. Rich note created

**No Nanodash. No external browser. All in Zotero!**

---

## 🎯 Use Cases

**Literature Reviews**

- Annotate papers semantically
- Describe relationships using CiTO
- Build connected reading notes

**Research Claims**

- Publish formal assertions (AIDA)
- Machine-readable findings
- Link to evidence

**Collaboration**

- Share semantic evaluations
- Discover related work
- Build on others' nanopubs

---

## 📚 Templates

### Research Summary (CiTO)

Describe paper relationships:

- `cites`, `extends`, `critiques`
- `supports`, `uses_method_in`
- ...and more

### Scientific Claim (AIDA)

Formal research assertions:

- Subject-predicate-object structure
- Machine-readable claims
- Link to evidence

### General Statement (Rosetta)

Flexible semantic statements:

- Connect concepts
- Link ideas
- General annotations

**+ Any custom template** from the nanopub network!

---

## 🛠️ Requirements

- Zotero 7.0 or later
- Internet connection
- ORCID account ([free signup](https://orcid.org))

---

## 📘 Documentation

**Full documentation:** http://sciencelive4all.org/zotero-plugin/

- [Installation Guide](http://sciencelive4all.org/zotero-plugin/getting-started/installation/)
- [Quick Start](http://sciencelive4all.org/zotero-plugin/getting-started/quick-start/)
- [Template Guide](http://sciencelive4all.org/zotero-plugin/user-guide/templates/)
- [Architecture](http://sciencelive4all.org/zotero-plugin/technical/architecture/)

---

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md)

**Development:**

Note: This parent monorepo has a vscode devcontainer set up with all pre-requisites, including Zotero itself, see [README](../README.md) in the repo root for setup.

Clone parent repo, set up devcontainer using vscode or similar, then run in the repo root:

```bash
npm install
cd zotero
npm run build
npm run start
```

---

## 🌍 Part of Science Live Platform

This plugin is part of [Science Live](https://sciencelive4all.org) - transforming research into FAIR knowledge bricks.

---

## 📜 License

MIT License - see [LICENSE](LICENSE)

---

## 🙏 Acknowledgments

Built on:

- [@sciencelivehub/nanopub-create](https://github.com/ScienceLiveHub/nanopub-create)
- [@sciencelivehub/nanopub-view](https://github.com/ScienceLiveHub/nanopub-view)
- [nanopub-rs](https://github.com/vemonet/nanopub-rs) (WASM signing)
- [Nanopub Network](http://nanopub.org) (Knowledge Pixels)

---

## 📧 Contact

- **Issues:** [GitHub Issues](https://github.com/ScienceLiveHub/science-live-platform/issues)
- **Email:** contact@vitenhub.no
- **Website:** https://sciencelive4all.org
