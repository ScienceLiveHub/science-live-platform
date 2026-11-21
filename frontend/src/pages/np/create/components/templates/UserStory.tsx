import ShowOptionalWrapper from "@/components/formedible/wrappers/optional-suffix-global-wrapper";
import { useFormedible } from "@/hooks/use-formedible";
import { API_LABELS_KEY } from "@/lib/nanopub-template";
import { THINGS_BY_NANOPUB_TYPE } from "@/lib/queries";
import { fetchPossibleValuesFromQuads } from "@/lib/rdf";
import { executeBindSparql, NANOPUB_SPARQL_ENDPOINT_FULL } from "@/lib/sparql";
import { validUriPlaceholder } from "@/lib/validation";
import { useEffect, useState } from "react";
import z from "zod";
import {
  NanopubEditorOptionFields,
  NanopubTemplateDefComponentProps,
} from "./component-registry";
import {
  USER_STORY_DOMAIN_OPTIONS,
  USER_STORY_TERM_TYPES,
} from "./user-story-terms";

/**
 * Form for the FAIR2Adapt "User Story" template (RACciFqZ…): a need written as
 * "As a … I want to … so that …", linked to the domains it covers, the climate risks it
 * faces and the sectors exposed to them.
 *
 * Template placeholders → form fields:
 * - `US` (LocalResource): short name, minted under the new nanopub
 * - `label`, `user`, `action`, `purpose`: literals
 * - `domain` (RestrictedChoice) → st03, `challenge` → st04, `exposed` → st05 and
 *   `DO` (optional) → st09: GuidedChoice, all repeatable statements
 */

type Option = { value: string; label: string };

type TermKey = keyof typeof USER_STORY_TERM_TYPES;

function useStoryOptions() {
  const [options, setOptions] = useState<Record<TermKey | "domain", Option[]>>({
    domain: [],
    challenge: [],
    exposed: [],
    digitalObject: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadTerms = async (key: TermKey) => {
      const rows = await executeBindSparql(
        THINGS_BY_NANOPUB_TYPE,
        { type: USER_STORY_TERM_TYPES[key] },
        NANOPUB_SPARQL_ENDPOINT_FULL,
        controller.signal,
      );
      // A term republished under a new label can appear twice: keep one per URI
      const byUri = new Map<string, string>();
      for (const r of rows) {
        if (!byUri.has(r.thing)) byUri.set(r.thing, r.label);
      }
      return [...byUri].map(([value, label]) => ({ value, label }));
    };

    const loadDomains = async () =>
      (await fetchPossibleValuesFromQuads(USER_STORY_DOMAIN_OPTIONS))
        .map((o) => ({ value: o.name, label: o.description }))
        .sort((a, b) => a.label.localeCompare(b.label));

    Promise.all([
      loadDomains(),
      loadTerms("challenge"),
      loadTerms("exposed"),
      loadTerms("digitalObject"),
    ])
      .then(([domain, challenge, exposed, digitalObject]) => {
        setOptions({ domain, challenge, exposed, digitalObject });
        setLoading(false);
      })
      .catch((e) => {
        if (e?.name === "AbortError") return;
        console.error("Failed to load user story options:", e);
        setError("Could not load the lists. Please reload the page.");
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  return { options, loading, error };
}

export default function UserStory({
  submit,
  prefilledData = {},
}: NanopubTemplateDefComponentProps) {
  const { options, loading, error } = useStoryOptions();

  const schema = z.object({
    US: validUriPlaceholder.min(1, "Give the story a short name"),
    label: z.string().min(3).max(200),
    user: z.string().min(2).max(300),
    action: z.string().min(3).max(1000),
    purpose: z.string().min(3).max(1000),
    domains: z.array(z.string()).min(1, "Pick at least one domain"),
    challenges: z.array(z.string()).min(1, "Pick at least one risk"),
    exposedSectors: z
      .array(z.string())
      .min(1, "Pick at least one exposed sector"),
    digitalObjectTypes: z.array(z.string()).optional(),
  });

  const choice = (
    name: string,
    label: string,
    list: Option[],
    description: string,
    required = true,
  ) => ({
    name,
    type: "multicombobox",
    label,
    description,
    required,
    options: list,
    disabled: loading,
    section: { title: "What it is about" },
    multiComboboxConfig: {
      searchable: true,
      placeholder: loading ? "Loading..." : `Select ${label.toLowerCase()}...`,
      searchPlaceholder: `Search ${label.toLowerCase()}...`,
      noOptionsText: error || "Nothing matches",
    },
  });

  const { Form } = useFormedible({
    schema,
    fields: [
      {
        name: "label",
        type: "text",
        label: "Title",
        placeholder: "e.g., F2A CS2 US4",
        description: "How the story is listed and cited",
        required: true,
        section: { title: "The story" },
      },
      {
        name: "user",
        type: "text",
        label: "As a",
        placeholder: "e.g., researcher",
        description: "Who you are, or who needs this",
        required: true,
        section: { title: "The story" },
      },
      {
        name: "action",
        type: "textarea",
        label: "I want to",
        placeholder: "e.g., use model outputs",
        description: "What you want to do",
        required: true,
        section: { title: "The story" },
      },
      {
        name: "purpose",
        type: "textarea",
        label: "So that",
        placeholder: "e.g., I can compute indicators",
        description: "Why it matters, what it lets you do",
        required: true,
        section: { title: "The story" },
      },
      choice(
        "domains",
        "Domains",
        options.domain,
        "The fields the story covers",
      ),
      choice(
        "challenges",
        "Risks",
        options.challenge,
        "The climate risks it faces",
      ),
      choice(
        "exposedSectors",
        "Exposed sectors",
        options.exposed,
        "What is exposed to those risks",
      ),
      choice(
        "digitalObjectTypes",
        "Digital object types",
        options.digitalObject,
        "Kinds of data, models or other digital objects it calls for",
        false,
      ),
      {
        name: "US",
        type: "text",
        label: "Short name",
        placeholder: "e.g., F2A-CS2-US4",
        description:
          "Used in the story's permanent address: letters, digits and dashes",
        required: true,
        section: { title: "Identifier" },
      },
      ...NanopubEditorOptionFields,
    ],
    globalWrapper: ShowOptionalWrapper,
    submitLabel: "Generate Nanopublication",
    collapseLabel: "Hide",
    expandLabel: "Show",
    formOptions: {
      defaultValues: {
        US: "",
        label: "",
        user: "",
        action: "",
        purpose: "",
        domains: [],
        challenges: [],
        exposedSectors: [],
        digitalObjectTypes: [],
        ...prefilledData,
      },
      onSubmit: async ({ value }) => {
        const v = value as any;

        // Multi-selections → the template's repeatable statements
        v.st03 = (v.domains ?? []).map((domain: string) => ({ domain }));
        v.st04 = (v.challenges ?? []).map((challenge: string) => ({
          challenge,
        }));
        v.st05 = (v.exposedSectors ?? []).map((exposed: string) => ({
          exposed,
        }));
        v.st09 = (v.digitalObjectTypes ?? []).map((DO: string) => ({ DO }));

        // Labels of the terms picked from the API-backed lists, recorded in the
        // pubinfo (nt:hasLabelFromApi) so the story reads with names, not URIs
        const picked = new Set<string>([
          ...(v.challenges ?? []),
          ...(v.exposedSectors ?? []),
          ...(v.digitalObjectTypes ?? []),
        ]);
        const labels: Record<string, string> = {};
        for (const o of [
          ...options.challenge,
          ...options.exposed,
          ...options.digitalObject,
        ]) {
          if (picked.has(o.value)) labels[o.value] = o.label;
        }
        v[API_LABELS_KEY] = labels;

        await submit(v);
      },
    },
  });

  return <Form />;
}
