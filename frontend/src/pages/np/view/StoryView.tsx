import { useNanopub } from "@/hooks/use-nanopub";
import { NanopubStore } from "@/lib/nanopub-store";
import { NS } from "@/lib/rdf";
import ky from "ky";
import { DataFactory } from "n3";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "./story.css";

/**
 * StoryView — renders a published *story* nanopublication as the reader-facing blog,
 * reproducing the deterministic GitHub-Pages page (`build_story.py` `render_synthesis`)
 * with the exact blog stylesheet (`story.css`, scoped under `.storywrap`).
 *
 * The story nanopub is the driver/manifest: it names the apex (`schema:about` — the
 * Research Synthesis) and carries the framing, hero and evidence figures (each
 * `schema:about` an outcome). We fetch the full constellation from the apex via the
 * platform's `/np/constellation` (public read, reusing `buildConstellation`) — the
 * limbs, each outcome's verdict, the synthesis sections, the CiTO relations and the
 * per-chain references — and render it as a "constellation display". The audience
 * tabs come from the pinned summary nanopubs. Public: no account needed to read.
 *
 * Deep-link: /np/story?uri=<story-nanopub-uri>.
 */
const { namedNode } = DataFactory;
const SCHEMA = "https://schema.org/";
const S = (p: string) => namedNode(SCHEMA + p);
// sciencelive/np/… redirects to the HTML viewer; np/… returns TriG — use np/… to load.
const npLoad = (uri?: string) => uri?.replace("/sciencelive/np/", "/np/");

// ---------- text helpers
const tail = (uri?: string | null) => (uri ? uri.replace(/[/#]$/, "").split(/[/#]/).pop() || "" : "");
const prettify = (s?: string) => (s || "").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[-_]+/g, " ").trim();
const relLabel = (uri?: string) => {
  const w = prettify(tail(uri) || uri);
  return w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : "";
};
const firstSentence = (t?: string) => {
  if (!t) return "";
  const s = t.trim();
  // End a sentence only at .!? followed by whitespace + a capital letter (or end of
  // text), so abbreviations like "et al. (2021)" or "e.g." don't cause a false break.
  const m = s.match(/^[\s\S]*?[.!?](?=\s+[A-Z]|\s*$)/);
  return (m ? m[0] : s).trim();
};
const initials = (name?: string) => {
  const p = (name || "").split(/\s+/).filter(Boolean);
  return (p.length > 1 ? p[0][0] + p[p.length - 1][0] : p[0]?.slice(0, 2) || "?").toUpperCase();
};
function verdictClass(v?: string): "ok" | "warn" | "bad" {
  const k = (v || "").toLowerCase().replace(/\s+/g, "");
  if (k.includes("partial") || k.includes("mixed")) return "warn";
  if (k.includes("contradict") || k.includes("refut") || k.includes("notsupport") || k.includes("fail")) return "bad";
  return "ok";
}
function ProseBlocks({ text }: { text?: string }) {
  if (!text?.trim()) return null;
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <>
      {blocks.map((b, i) => {
        const lines = b.split(/\n/).map((l) => l.trim()).filter(Boolean);
        if (lines.length > 1 && lines.every((l) => /^[-*•]\s+/.test(l)))
          return <ul key={i} className="prose-list">{lines.map((l, j) => <li key={j}>{l.replace(/^[-*•]\s+/, "")}</li>)}</ul>;
        if (lines.length > 1 && lines.every((l) => /^\d+[.)]\s+/.test(l)))
          return <ol key={i} className="prose-list">{lines.map((l, j) => <li key={j}>{l.replace(/^\d+[.)]\s+/, "")}</li>)}</ol>;
        return <p key={i}>{b}</p>;
      })}
    </>
  );
}
const npHref = (uri: string) => `/np/?uri=${encodeURIComponent(uri)}`;

// ---------- the constellation (subset of the API's Constellation)
type ConStep = {
  step: string;
  uri: string;
  label?: string;
  text?: string;
  type?: string;
  conclusion?: string;
  repository?: string;
  relations?: string[];
  targets?: string[];
};
type Chain = {
  id: string;
  outcomeUri: string;
  outcomeVerdict: string;
  outcomeConfidence: string;
  citoRelations: string[];
  steps: ConStep[];
};
type Synthesis = { uri: string; label: string; synthesis: string; conditions: string; limitations: string; recommendations: string };
type ConNode = { uri: string; label?: string; date?: string; creators?: string[]; creatorNames?: string[] };
// The author's display name for a node: prefer the resolved foaf:name, fall back to the ORCID.
const nodeAuthor = (nd?: ConNode): string => nd?.creatorNames?.find(Boolean) || citeName(nd?.creators);
type Constellation = { entry: string; paperDoi: string; researchSynthesis: Synthesis | null; chains: Chain[]; nodes: ConNode[] };

// A reference citation for one nanopub, built from its constellation node —
// "Name. (year). Title [Nanopublication]. uri" — mirroring build_story.py citation_parts.
function citeName(creators?: string[]): string {
  const c = creators?.[0];
  if (!c) return "";
  return /orcid\.org/.test(c) ? `ORCID ${tail(c)}` : c;
}
// "Name. (year). " when either is known, else "" — avoids a bare "Anonymous. (n.d.)."
function citePrefix(name?: string, date?: string | null): string {
  const year = date?.slice(0, 4);
  if (name && year) return `${name}. (${year}). `;
  if (name) return `${name}. `;
  if (year) return `(${year}). `;
  return "";
}

// ---------- the story nanopub (driver)
type Figure = { url: string; caption?: string; doi?: string; about?: string; position: number };
type StoryData = {
  apex?: string;
  headline?: string;
  framing?: string;
  hero?: Figure;
  figures: Figure[];
  summaryUris: { uri: string; position: number }[];
};
function readFigure(store: NanopubStore, url: string, g: ReturnType<typeof namedNode>): Figure {
  const one = (p: string) => store.matchOne(namedNode(url), S(p), null, g)?.object.value;
  return { url, caption: one("caption"), doi: one("isBasedOn"), about: one("about"), position: Number(one("position")) || 0 };
}
function extractStory(store: NanopubStore): StoryData | null {
  if (!store.graphUris.assertion) return null;
  const g = namedNode(store.graphUris.assertion);
  const article = store.matchOne(null, NS.RDF("type"), S("Article"), g)?.subject;
  if (!article) return null;
  const a = namedNode(article.value);
  const first = (p: string) => store.matchOne(a, S(p), null, g)?.object.value;
  const heroUrl = first("image");
  return {
    apex: first("about"),
    headline: first("headline"),
    framing: first("abstract"),
    hero: heroUrl ? readFigure(store, heroUrl, g) : undefined,
    figures: store.getQuads(a, S("associatedMedia"), null, g).map((q) => readFigure(store, q.object.value, g)).sort((x, y) => x.position - y.position),
    summaryUris: store.getQuads(a, S("hasPart"), null, g).map((q) => ({
      uri: q.object.value,
      position: Number(store.matchOne(namedNode(q.object.value), S("position"), null, g)?.object.value) || 0,
    })).sort((x, y) => x.position - y.position),
  };
}

// ---------- a limb = a chain + the story figure depicting its outcome
type Limb = {
  heading: string;
  verdict: string;
  vclass: "ok" | "warn" | "bad";
  confidence: string;
  relation: string;
  conclusion: string;
  outcomeUri: string;
  citoUri?: string;
  archive?: string;
  figure?: Figure;
  steps: ConStep[];
};
function limbFromChain(chain: Chain, figures: Figure[]): Limb {
  const step = (k: string) => chain.steps.find((s) => s.step === k);
  const outcome = step("Outcome");
  return {
    heading: step("Claim")?.label || outcome?.label || "Replication limb",
    verdict: prettify(chain.outcomeVerdict) || "",
    vclass: verdictClass(chain.outcomeVerdict),
    confidence: prettify(chain.outcomeConfidence) || "",
    relation: chain.citoRelations?.[0] ? relLabel(chain.citoRelations[0]) : "",
    conclusion: outcome?.conclusion || "",
    outcomeUri: chain.outcomeUri,
    citoUri: step("CiTO")?.uri,
    // The Zenodo archived-release DOI (hasOutcomeRepository). The GitHub repo +
    // Jupyter Book are resolved from it (Zenodo record → codeRepository → GitHub
    // Pages), see resolveArchive.
    archive: outcome?.repository,
    figure: figures.find((f) => tail(f.about) === tail(chain.outcomeUri)),
    steps: chain.steps,
  };
}

// Resolve a Zenodo archived-release DOI to its GitHub repository and (if it
// publishes GitHub Pages) its Jupyter Book URL — mirroring build_story.py's
// zenodo_repo() + github_meta(). Both APIs are public and CORS-friendly.
type ArchiveLinks = { repo?: string; book?: string };
async function resolveArchive(doiUrl: string): Promise<ArchiveLinks> {
  const m = doiUrl.match(/zenodo\.(\d+)/);
  if (!m) return {};
  try {
    const rec = await ky.get(`https://zenodo.org/api/records/${m[1]}`, { timeout: 20000 }).json<{
      metadata?: { related_identifiers?: { identifier?: string }[]; custom?: Record<string, string> };
    }>();
    const cands = [
      ...(rec.metadata?.related_identifiers ?? []).map((r) => r.identifier),
      rec.metadata?.custom?.["code:codeRepository"],
    ];
    let repo: string | undefined;
    for (const c of cands) {
      const g = String(c ?? "").match(/https:\/\/github\.com\/[\w.\-]+\/[\w.\-]+/);
      if (g) { repo = g[0]; break; }
    }
    if (!repo) return {};
    const slug = repo.replace("https://github.com/", "");
    const gh = await ky.get(`https://api.github.com/repos/${slug}`, { timeout: 20000 }).json<{ homepage?: string; has_pages?: boolean }>();
    return { repo, book: gh.has_pages && gh.homepage ? gh.homepage : undefined };
  } catch {
    return {};
  }
}

// Resolve a paper DOI to a citation — title + "Authors · Year · Journal" — via DOI
// content negotiation (CSL JSON), mirroring build_story.py's link_label(). doi.org
// is CORS-enabled, so this runs client-side.
type PaperCitation = { doi: string; title?: string; sub?: string };
async function resolvePaperCitation(doiUrl: string): Promise<PaperCitation> {
  try {
    const d = await ky
      .get(doiUrl, {
        headers: { Accept: "application/vnd.citationstyles.csl+json" },
        timeout: 20000,
      })
      .json<{
        title?: string;
        author?: { family?: string }[];
        issued?: { "date-parts"?: number[][] };
        "container-title"?: string;
      }>();
    const who = (d.author ?? [])
      .slice(0, 3)
      .map((a) => a.family)
      .filter(Boolean)
      .join(", ");
    const year = d.issued?.["date-parts"]?.[0]?.[0];
    const sub = [who, year ? String(year) : "", d["container-title"]]
      .filter(Boolean)
      .join(" · ");
    return { doi: doiUrl, title: d.title, sub };
  } catch {
    return { doi: doiUrl };
  }
}

// The "original study" a replication draws from is the DOI its outcomes CITE (the
// CiTO citation target), NOT the constellation's `paperDoi` heuristic, which can
// pick the replication's own paper. Take the most common non-Zenodo doi.org
// target across the chains, falling back to paperDoi.
function drawnFromDoi(con: Constellation | null): string {
  const targets = (con?.chains ?? [])
    .flatMap((c) => c.steps.find((s) => s.step === "CiTO")?.targets ?? [])
    .filter((t) => /doi\.org/.test(t) && !/zenodo/.test(t));
  const counts = new Map<string, number>();
  for (const t of targets) counts.set(t, (counts.get(t) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return top || con?.paperDoi || "";
}

// ---------- pinned audience summary
type Summary = { uri: string; audienceLabel: string; text: string };
function audienceLabel(uri?: string): string {
  if (!uri) return "Summary";
  const u = uri.toLowerCase();
  if (u.includes("secondary") || u.includes("school") || u.includes("student")) return "For schools";
  if (u.includes("q2388316") || u.includes("public")) return "For the public";
  return prettify(tail(uri)).replace(/\b\w/g, (c) => c.toUpperCase());
}
function AudiencePanel({ s, hero }: { s: Summary; hero?: Figure }) {
  const blocks = s.text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const [title, ...rest] = blocks;
  const who = s.audienceLabel.replace(/^For\s+/i, "");
  return (
    <article className="article">
      <div className="ai-banner">
        <span className="ai-tag">AI-generated summary</span>
        A plain-language retelling for {who}, written by an AI from the verified record. It
        simplifies and never overrides the signed science.{" "}
        <a href={npHref(s.uri)}>View the signed summary →</a>
      </div>
      <p className="eyebrow">Plain-language summary</p>
      <h1>{title}</h1>
      {hero && (
        <figure className="fig wide">
          <img src={hero.url} alt="Overview image of the study" loading="lazy" />
          {hero.caption && <figcaption>{hero.caption}</figcaption>}
        </figure>
      )}
      {rest.map((para, i) => {
        const m = para.match(/^([A-Z][^:]{1,40}):\s+([\s\S]+)$/);
        return m ? (
          <div key={i}>
            <h2 className="sec">{m[1]}</h2>
            <ProseBlocks text={m[2]} />
          </div>
        ) : (
          <p key={i}>{para}</p>
        );
      })}
    </article>
  );
}

// ---------- one limb card in the Record
function LimbCard({ limb, i, n, links }: { limb: Limb; i: number; n: number; links?: ArchiveLinks }) {
  const lead = firstSentence(limb.conclusion);
  const more = limb.conclusion.trim().length > lead.length + 20;
  return (
    <article className={`limb ${limb.vclass}`} id={`limb-${i}`}>
      <div className="limbhead">
        <span className="limbindex">Replication {i} of {n}</span>
        <h3>{limb.heading}</h3>
      </div>
      <div className="limbmeta">
        {limb.verdict && (
          <a className={`verdict ${limb.vclass}`} href={npHref(limb.outcomeUri)}>
            <span className="dot"></span> {limb.verdict}
          </a>
        )}
        {limb.confidence && <span className="tag">{limb.confidence}</span>}
        {limb.relation &&
          (limb.citoUri ? (
            <a className="relpill" href={npHref(limb.citoUri)}>{limb.relation}</a>
          ) : (
            <span className="relpill">{limb.relation}</span>
          ))}
      </div>
      {limb.figure && (
        <figure className="limbfig">
          <img src={limb.figure.url} alt="Result figure for this replication" loading="lazy" />
          {limb.figure.caption && <figcaption>{limb.figure.caption}</figcaption>}
        </figure>
      )}
      {lead && <p className="limblead">{lead}</p>}
      {more && (
        <details className="limbmore">
          <summary>Full conclusion</summary>
          <div className="cbody"><ProseBlocks text={limb.conclusion} /></div>
        </details>
      )}
      <div className="limblinks">
        <a href={npHref(limb.outcomeUri)}>Full replication chain →</a>
        {links?.book && <a href={links.book} target="_blank" rel="noopener">Jupyter Book</a>}
        {links?.repo && <a href={links.repo} target="_blank" rel="noopener">Repository</a>}
        {limb.archive && <a href={limb.archive} target="_blank" rel="noopener">Archived release</a>}
      </div>
    </article>
  );
}

export default function StoryView() {
  const [searchParams] = useSearchParams();
  const storyUri = searchParams.get("uri") ?? undefined;
  const { store, loading, error } = useNanopub(npLoad(storyUri));
  const data = useMemo(() => (store ? extractStory(store) : null), [store]);

  // apex nanopub — for the author byline + cite label (public read)
  const { store: apexStore } = useNanopub(npLoad(data?.apex));
  const author = useMemo(() => {
    if (!apexStore) return null;
    const c = apexStore.metadata.creators?.[0];
    return { orcid: c?.href, name: c?.name, created: apexStore.metadata.created };
  }, [apexStore]);

  // the full constellation (public /np/constellation, reusing buildConstellation)
  const [con, setCon] = useState<Constellation | null>(null);
  const [conState, setConState] = useState<"loading" | "done" | "error">("loading");
  useEffect(() => {
    let cancelled = false;
    const apex = data?.apex;
    if (!apex) return;
    setConState("loading");
    ky.get(`${import.meta.env.VITE_API_URL}/np/constellation`, {
      // Public endpoint — no credentials needed; keeps CORS simple for anonymous readers.
      // Default depth (5) already reaches the full graph for a synthesis apex; higher
      // depth only slows the SPARQL walk without adding chains.
      searchParams: { uri: apex },
      timeout: 130000,
    })
      .json<Constellation>()
      .then((c) => {
        if (cancelled) return;
        setCon(c);
        setConState("done");
      })
      .catch(() => {
        if (cancelled) return;
        setCon(null);
        setConState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [data?.apex]);

  // uri → node lookup, for reference citations (author/year/title per nanopub)
  const nodesByUri = useMemo(() => {
    const m = new Map<string, ConNode>();
    for (const nd of con?.nodes ?? []) m.set(nd.uri, nd);
    return m;
  }, [con]);

  // pinned audience summaries (public reads)
  const [summaries, setSummaries] = useState<Summary[]>([]);
  useEffect(() => {
    let cancelled = false;
    const uris = data?.summaryUris ?? [];
    Promise.all(
      uris.map(async ({ uri }) => {
        try {
          const s = await NanopubStore.load(npLoad(uri) ?? uri, false);
          const g = s.graphUris.assertion ? namedNode(s.graphUris.assertion) : undefined;
          const text = s.matchOne(null, NS.RDFS("comment"), null, g)?.object.value ?? "";
          const audience = s.matchOne(null, S("audience"), null, g)?.object.value;
          return { uri, audienceLabel: audienceLabel(audience), text } as Summary;
        } catch {
          return null;
        }
      }),
    ).then((rows) => !cancelled && setSummaries(rows.filter((r): r is Summary => !!r?.text)));
    return () => {
      cancelled = true;
    };
  }, [data?.summaryUris]);

  // Resolve each limb's Zenodo archive DOI → GitHub repo + Jupyter Book (public APIs).
  const [archiveLinks, setArchiveLinks] = useState<Record<string, ArchiveLinks>>({});
  useEffect(() => {
    const dois = [
      ...new Set(
        (con?.chains ?? [])
          .map((c) => c.steps.find((s) => s.step === "Outcome")?.repository)
          .filter((x): x is string => !!x && /zenodo\.\d+/.test(x)),
      ),
    ];
    if (!dois.length) return;
    let cancelled = false;
    Promise.all(dois.map(async (doi) => [doi, await resolveArchive(doi)] as const)).then((entries) => {
      if (!cancelled) setArchiveLinks(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [con]);

  // Resolve the "original study" DOI to a full citation (title/authors/year/journal).
  const [paper, setPaper] = useState<PaperCitation | null>(null);
  useEffect(() => {
    const doi = drawnFromDoi(con);
    if (!doi) {
      setPaper(null);
      return;
    }
    let cancelled = false;
    resolvePaperCitation(doi).then((c) => {
      if (!cancelled) setPaper(c);
    });
    return () => {
      cancelled = true;
    };
  }, [con]);

  const [tab, setTab] = useState("record");

  if (!storyUri) return <Centered>Provide a story URI: <code>?uri=…</code></Centered>;
  if (loading) return <Centered>Loading story…</Centered>;
  if (error) return <Centered>Could not load that story ({error}).</Centered>;
  if (!data) return <Centered>That nanopublication is not a story.</Centered>;

  const rs = con?.researchSynthesis;
  const drawnDoi = drawnFromDoi(con);
  const limbs = (con?.chains ?? []).map((c) => limbFromChain(c, data.figures));
  const n = limbs.length;
  const origClaim = firstSentence(rs?.synthesis);
  const citeText = `${author?.name ?? "—"}. (${author?.created?.slice(0, 4) ?? "n.d."}). ${rs?.label ?? data.headline ?? "Research synthesis"} [Nanopublication]. ${data.apex}`;

  return (
    <div className="storywrap">
      <div className="tabbar" role="tablist">
        <button className={`tab ${tab === "record" ? "active" : ""}`} type="button" onClick={() => setTab("record")}>
          The record
        </button>
        {summaries.map((s, i) => (
          <button key={s.uri} className={`tab ${tab === `sum-${i}` ? "active" : ""}`} type="button" onClick={() => setTab(`sum-${i}`)}>
            {s.audienceLabel}
          </button>
        ))}
      </div>

      <div className={`tabpanel ${tab === "record" ? "active" : ""}`} data-panel="record">
        <article className="article">
          <header className="head">
            <div className="headtop">
              <p className="eyebrow">Independent replication · research synthesis</p>
            </div>
            <h1>{data.headline || rs?.label || "Research synthesis"}</h1>
            {n > 0 && (
              <p className="deck">An independent replication — {n} {n === 1 ? "limb" : "limbs"}, composed into one finding.</p>
            )}
            {author?.name && (
              <div className="authorrow">
                <span className="avatar" aria-hidden="true">{initials(author.name)}</span>
                <span className="who">
                  <span className="name">{author.name}</span>
                  <span className="meta">
                    {author.orcid && <a href={author.orcid} target="_blank" rel="noopener">ORCID {tail(author.orcid)}</a>}
                    {author.created && ` · published ${author.created.slice(0, 10)}`}
                  </span>
                </span>
              </div>
            )}
          </header>

          {data.framing && <div className="synthlead"><ProseBlocks text={data.framing} /></div>}

          {(origClaim || drawnDoi) && (
            <div className="whatcard">
              <div>
                <span className="cardlabel">What is being replicated</span>
                {origClaim && <p className="qlabel">{origClaim}</p>}
              </div>
              <div className="drawn">
                <span className="cardlabel">Drawn from — the original study</span>
                {drawnDoi ? (
                  <>
                    {paper?.title && (
                      <p className="whatpaper">
                        <a href={drawnDoi} target="_blank" rel="noopener">{paper.title}</a>
                      </p>
                    )}
                    {paper?.sub && <p className="what">{paper.sub}</p>}
                    <p className="srcline"><a href={drawnDoi} target="_blank" rel="noopener">{drawnDoi}</a></p>
                  </>
                ) : (
                  <p className="what">No source identifier in the record.</p>
                )}
              </div>
            </div>
          )}

          {(author?.name || data.apex) && (
            <details className="citecard" id="cite">
              <summary className="cc-label">Cite this synthesis</summary>
              <div className="cc-body">
                <div className="citetext">{citeText}</div>
                <p className="cc-note">
                  The synthesis has a permanent identifier,{" "}
                  <a href={data.apex} target="_blank" rel="noopener">{data.apex}</a>, that always
                  resolves to the signed record. Citing it credits the replication and its author.
                </p>
              </div>
            </details>
          )}

          {limbs.length > 0 && (
            <aside className="bottomline">
              <span className="bl-label">The bottom line</span>
              <div className="bl-chips">
                {limbs.map((v, i) => (
                  <a key={i} className={`verdict ${v.vclass}`} href={v.citoUri ? npHref(v.citoUri) : `#limb-${i + 1}`}>
                    <span className="dot"></span> {v.relation || "Tested"}{v.verdict ? ` · ${v.verdict}` : ""}
                  </a>
                ))}
              </div>
            </aside>
          )}

          {data.hero && (
            <figure className="fig wide">
              <img src={data.hero.url} alt="Overview figure for the synthesis" loading="lazy" />
              {data.hero.caption && <figcaption><strong>Overview.</strong> {data.hero.caption}</figcaption>}
            </figure>
          )}

          {conState === "loading" && (
            <div className="empty" aria-live="polite">
              <strong>Loading the verified record…</strong>
              <br />
              Walking the nanopublication constellation to compose the synthesis. This can take up to a minute.
            </div>
          )}
          {conState === "error" && (
            <div className="empty">
              <strong>The verified record could not be loaded.</strong>
              <br />
              The constellation service did not respond in time. Reload the page to try again.
            </div>
          )}

          {rs?.synthesis && <div className="synthlead"><ProseBlocks text={rs.synthesis} /></div>}

          {limbs.length > 0 && (
            <>
              <h2 className="sec">The replication limbs</h2>
              <div className="limbwrap">{limbs.map((v, i) => <LimbCard key={i} limb={v} i={i + 1} n={n} links={archiveLinks[v.archive ?? ""]} />)}</div>
            </>
          )}

          {rs?.recommendations && (<><h2 className="sec">Recommendations</h2><ProseBlocks text={rs.recommendations} /></>)}
          {rs?.conditions && (<><h2 className="sec">Where this holds</h2><ProseBlocks text={rs.conditions} /></>)}
          {rs?.limitations && (<><h2 className="sec">Limitations</h2><ProseBlocks text={rs.limitations} /></>)}

          {conState === "done" && (
            <>
              <h2 className="sec">Responses</h2>
              <div className="empty">
                <strong>No approvals, disapprovals or comments yet.</strong>
                <br />
                Anyone with an ORCID can approve, disapprove or comment on any nanopublication in this synthesis.
              </div>
            </>
          )}

          {(rs || limbs.length > 0) && (
            <section className="refs wide" id="refs">
              <h2>References &mdash; nanopublications in this synthesis</h2>
              {rs && (
                <div className="refgroup accent">
                  <p className="refgroup-k">Synthesis</p>
                  <p className="refgroup-h">{rs.label || "Research synthesis"}</p>
                  <ol className="bib">
                    <li>
                      {citePrefix(author?.name || nodeAuthor(nodesByUri.get(rs.uri)), author?.created || nodesByUri.get(rs.uri)?.date)}{rs.label || "Research synthesis"} [Nanopublication].{" "}
                      <a className="u" href={npHref(rs.uri)}>{rs.uri}</a> <span className="nptype">Research Synthesis</span>
                    </li>
                  </ol>
                </div>
              )}
              {limbs.map((limb, i) => {
                const cito = limb.steps.find((s) => s.step === "CiTO");
                const cites = (cito?.targets ?? []).map((target, k) => ({ rel: cito?.relations?.[k] ?? cito?.relations?.[0], target }));
                return (
                  <div key={i} className={`refgroup ${limb.vclass}`}>
                    <p className="refgroup-k">Replication {i + 1} &middot; {limb.relation}</p>
                    <p className="refgroup-h">{limb.heading}</p>
                    {cites.length > 0 && (
                      <>
                        <p className="subref">Cites the following</p>
                        <ul className="creditlist citeslist">
                          {cites.map((c, k) => (
                            <li key={k}>
                              {c.rel && <span className="relpill">{relLabel(c.rel)}</span>}
                              <span className="ctitle">{nodesByUri.get(c.target)?.label || c.target}</span>
                              <a className="cu" href={/w3id\.org\/(sciencelive\/)?np\//.test(c.target) ? npHref(c.target) : c.target}>{c.target}</a>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    <p className="subref">Nanopublications in this chain</p>
                    <ol className="bib">
                      {limb.steps.map((st) => {
                        const nd = nodesByUri.get(st.uri);
                        return (
                          <li key={st.uri}>
                            {citePrefix(nodeAuthor(nd), nd?.date)}{nd?.label || st.label || prettify(st.step)} [Nanopublication].{" "}
                            <a className="u" href={npHref(st.uri)}>{st.uri}</a> <span className="nptype">{prettify(st.step)}</span>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                );
              })}
            </section>
          )}
        </article>
      </div>

      {summaries.map((s, i) => (
        <div key={s.uri} className={`tabpanel ${tab === `sum-${i}` ? "active" : ""}`} data-panel={`sum-${i}`}>
          <AudiencePanel s={s} hero={data.hero} />
        </div>
      ))}
    </div>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <main className="container mx-auto flex grow items-center justify-center p-6 text-center text-sm text-muted-foreground">
      <p>{children}</p>
    </main>
  );
}
