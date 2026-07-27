import { useFormedible } from "@/hooks/use-formedible";
import z from "zod";
import {
  NanopubEditorOptionFields,
  NanopubTemplateDefComponentProps,
} from "./component-registry";

/**
 * Science Live *story* template form.
 *
 * A story is a narrative COMPOSITION of a constellation (see the story template
 * `RA-qSk1k…`): it references the record via `schema:about` the apex, pins the AI
 * plain-language summary nanopubs as audience tabs, and carries a hero image plus
 * evidence figures. Everything except the title and framing is derived
 * deterministically from the constellation (by `build_story_draft.py`), so this
 * form only lets the human author **review** that composition and **edit the
 * title + framing** — the one editorial layer. The deterministic parts are shown
 * read-only and flow straight through to the published nanopub.
 *
 * `onSubmit` maps the draft's arrays onto the template's grouped/repeatable
 * placeholder names (`summaryGroup`, `figGroup`, `heroGroup`) — the shape the
 * template engine's `generateNanopublication` expects (Array<Record<placeholder,
 * value>> for repeatable groups, a single Record for the one-shot hero group).
 */

type StorySummary = { uri: string; position?: number | string; audience?: string };
type StoryFigure = {
  contentUrl: string;
  caption?: string;
  doi?: string | null;
  about?: string | null;
  position?: number | string;
};
type StoryHero = { contentUrl: string; caption?: string; doi?: string | null };
type StoryPrefill = {
  apex?: string;
  headline?: string;
  framing?: string;
  summaries?: StorySummary[];
  hero?: StoryHero | null;
  figures?: StoryFigure[];
};

const shortId = (uri?: string | null) =>
  uri ? uri.replace(/[/#]$/, "").split(/[/#]/).pop() : "";

export default function StoryTemplate({
  submit,
  prefilledData = {},
}: NanopubTemplateDefComponentProps) {
  const pd = prefilledData as StoryPrefill;
  const summaries = pd.summaries ?? [];
  const figures = pd.figures ?? [];
  const hero = pd.hero ?? null;

  const schema = z.object({
    headline: z.string().min(1, "A title is required"),
    framing: z.string().optional(),
  });

  const { Form } = useFormedible({
    schema,
    fields: [
      {
        name: "headline",
        type: "text",
        label: "Story title",
        placeholder: "A reader-facing headline for this story",
        required: true,
      },
      {
        name: "framing",
        type: "textarea",
        label: "Framing / introduction (optional)",
        placeholder:
          "A short human-written introduction. The record, summaries and figures below are composed automatically from the constellation.",
      },
      ...NanopubEditorOptionFields,
    ],
    submitLabel: "Generate Nanopublication",
    collapseLabel: "Hide",
    expandLabel: "Show",
    formOptions: {
      defaultValues: {
        headline: pd.headline ?? "",
        framing: pd.framing ?? "",
      },
      onSubmit: async ({ value }) => {
        const v = value as {
          headline: string;
          framing?: string;
          isExampleNanopub?: boolean;
        };
        const formValues: Record<string, unknown> = {
          // The story subject is a plain UriPlaceholder (a constant subject the
          // template's repeatable groups don't rename), so we pass a full URI —
          // <apex>/story — rather than a base-relative id.
          story: pd.apex ? `${pd.apex.replace(/\/+$/, "")}/story` : "",
          apex: pd.apex ?? "",
          headline: v.headline,
          // repeatable group -> Array<Record<placeholderShortName, string>>
          summaryGroup: summaries.map((s) => ({
            summaryUri: s.uri,
            summaryPos: String(s.position ?? ""),
          })),
          // repeatable group; empty optional sub-fields drop out at generation
          figGroup: figures.map((f) => ({
            figUrl: f.contentUrl,
            figCaption: f.caption ?? "",
            figDoi: f.doi ?? "",
            figAbout: f.about ?? "",
            figPos: String(f.position ?? ""),
          })),
          isExampleNanopub: !!v.isExampleNanopub,
        };
        const framing = (v.framing ?? "").trim();
        if (framing) formValues.framing = framing;
        // one-shot optional group -> a single Record (omit entirely if no hero)
        if (hero?.contentUrl) {
          formValues.heroGroup = {
            heroUrl: hero.contentUrl,
            heroCaption: hero.caption ?? "",
            heroDoi: hero.doi ?? "",
          };
        }
        await submit(formValues as Record<string, string | object>);
      },
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-4 text-sm">
        <p className="font-medium">
          This story composes the following, straight from the constellation
          (review only — not edited here):
        </p>
        <div className="break-all">
          <span className="text-muted-foreground">About (the record): </span>
          <code>{pd.apex || "—"}</code>
        </div>
        {summaries.length > 0 && (
          <div>
            <span className="text-muted-foreground">
              Audience tabs ({summaries.length}):
            </span>
            <ul className="mt-1 list-disc pl-5">
              {summaries.map((s) => (
                <li key={s.uri} className="break-all">
                  {s.audience ?? "audience"} —{" "}
                  <code>{shortId(s.uri)}</code>
                </li>
              ))}
            </ul>
          </div>
        )}
        {hero?.contentUrl && (
          <div className="break-all">
            <span className="text-muted-foreground">Hero image: </span>
            {hero.caption || shortId(hero.contentUrl)}
          </div>
        )}
        {figures.length > 0 && (
          <div>
            <span className="text-muted-foreground">
              Evidence figures ({figures.length}):
            </span>
            <ul className="mt-1 list-disc pl-5">
              {figures.map((f, i) => (
                <li key={i} className="break-all">
                  {f.caption || shortId(f.contentUrl)}
                  {f.about ? (
                    <span className="text-muted-foreground">
                      {" "}
                      · about {shortId(f.about)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <Form />
    </div>
  );
}
