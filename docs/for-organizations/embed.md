# Embed Nanopublications

Embed nanopublication views directly into your website, reports, or documentation — no coding required. Just paste an iframe.

---

## Basic usage

```html
<iframe 
  src="https://platform.sciencelive4all.org/embed/view?uri=https://w3id.org/np/RA..."
  width="100%" 
  height="600" 
  frameborder="0">
</iframe>
```

Replace the `uri` parameter with any nanopublication URI. The embedded view renders the full template view (FORRT replication, PRISMA search strategy, AIDA sentence, etc.) without the Science Live navigation bar.

---

## Customization

You can customize the appearance using query parameters:

| Parameter | Description | Example |
|-----------|-------------|---------|
| `primaryColor` | Brand color (hex, without #) — applies to links, borders, accents | `primaryColor=0f4e8a` |
| `theme` | Force light or dark mode | `theme=light` or `theme=dark` |
| `bgColor` | Background color (hex) | `bgColor=f0f4f8` |
| `cardColor` | Card background color (hex) | `cardColor=ffffff` |
| `fgColor` | Text color (hex) | `fgColor=1a1a1a` |
| `borderRadius` | Border radius in pixels | `borderRadius=12` |
| `showShare` | Show/hide share menu | `showShare=false` |
| `showCitation` | Show/hide citation section | `showCitation=false` |
| `showReferences` | Show/hide referencing nanopubs | `showReferences=false` |

### Example: LifeWatch ERIC branding

```html
<iframe 
  src="https://platform.sciencelive4all.org/embed/view?uri=https://w3id.org/np/RA...&theme=light&primaryColor=0f4e8a"
  width="100%" 
  height="600" 
  frameborder="0">
</iframe>
```

### Example: Minimal embed (content only)

```html
<iframe 
  src="https://platform.sciencelive4all.org/embed/view?uri=https://w3id.org/np/RA...&showShare=false&showCitation=false&showReferences=false"
  width="100%" 
  height="400" 
  frameborder="0">
</iframe>
```

---

## Auto-resize

The embed sends its content height to the parent page via `postMessage`. Add this script to your page to auto-resize the iframe:

```html
<script>
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'nanopub-embed-resize') {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        if (iframe.contentWindow === event.source) {
          iframe.style.height = event.data.height + 'px';
        }
      });
    }
  });
</script>
```

---

## What can be embedded

Any nanopublication on the network can be embedded, including:

- **FORRT replication studies** — study design, outcomes, evidence
- **PRISMA systematic reviews** — research questions, search strategies, screening
- **AIDA sentences** — formal scientific claims
- **CiTO citations** — citation relationships between papers
- **Paper annotations** — quotations with interpretations
- **Research software** — software metadata and references
- **Datasets** — dataset descriptions and provenance

The embed automatically detects the template type and renders the appropriate view.

---

## Use cases

- **Journal websites** — embed nanopubs alongside published papers
- **Research portals** — show structured evidence on topic pages
- **Organizational reports** — include verifiable, citable evidence
- **Documentation sites** — embed live examples (like this documentation!)
- **WordPress / CMS** — paste the iframe in any HTML block

---

## Live demo

Visit the [embed demo page](https://platform.sciencelive4all.org/embed-demo.html) to see working examples with different configurations.

---

## Contact

Need help integrating nanopub embeds into your website?

**Email:** contact@vitenhub.no
