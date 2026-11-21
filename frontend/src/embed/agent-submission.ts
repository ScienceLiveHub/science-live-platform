/**
 * Submitting an embedded creation form to a signing service.
 *
 * An embedded form (`/embed/create`) is filled in by people who have no Science Live
 * account and may have no ORCID, so it cannot sign in the browser. It posts the answers
 * to a service run by the embedding organization, which holds a software agent's key,
 * signs and publishes. np-user-story-service (a Netlify function) is the first such
 * service.
 *
 * The key never reaches the browser: the service has it, the page only has its URL.
 */

import { API_LABELS_KEY } from "@/lib/nanopub-template";
import { TEMPLATE_URI } from "@/pages/np/create/components/templates/registry-metadata";
import ky from "ky";

type FormValues = Record<string, unknown>;

/** What the signing service answers */
export interface PublishAnswer {
  published?: boolean;
  uri?: string | null;
  error?: string;
  /** Fields the service's shape has no place for, reported rather than dropped */
  ignored?: string[];
}

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String).filter(Boolean) : [];

/**
 * For each template that can be submitted to a signing service: the request body that
 * service expects, made from the values the template's form submits.
 */
export const AGENT_SUBMISSIONS: Record<
  string,
  (values: FormValues) => Record<string, unknown>
> = {
  // np-user-story-service: POST {id, label, user, action, purpose, domain[], challenge[],
  // exposed[], DO[], labels, example}. No author fields: the agent publishes, and nothing
  // personal goes into a record that cannot be withdrawn.
  [TEMPLATE_URI.USER_STORY]: (v) => ({
    id: v.US,
    label: v.label,
    user: v.user,
    action: v.action,
    purpose: v.purpose,
    domain: strings(v.domains),
    challenge: strings(v.challenges),
    exposed: strings(v.exposedSectors),
    DO: strings(v.digitalObjectTypes),
    example: v.isExampleNanopub === true,
    // names of the terms picked from the lists, which the service records as
    // nt:hasLabelFromApi so the story reads with names rather than addresses
    labels: v[API_LABELS_KEY] ?? {},
    website: "", // the service's honeypot: people leave it empty
  }),
};

/**
 * The service URL from the embed parameters, or null if it is not one to post to:
 * https only, or http on localhost for development.
 */
export function parseServiceUrl(raw: string | null): URL | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol === "https:" || (url.protocol === "http:" && local)) {
      return url;
    }
  } catch {
    // not a URL
  }
  return null;
}

/** Post the answers; the service's own error message is passed on when it gives one */
export async function submitToService(
  service: URL,
  body: Record<string, unknown>,
): Promise<PublishAnswer> {
  const response = await ky.post(service, {
    json: body,
    throwHttpErrors: false,
    timeout: 60000,
    retry: 0,
  });
  let answer: PublishAnswer = {};
  try {
    answer = (await response.json()) as PublishAnswer;
  } catch {
    // an answer that is not JSON says nothing more than its status
  }
  if (!response.ok) {
    throw new Error(
      answer.error || `the publishing service answered ${response.status}`,
    );
  }
  return answer;
}
