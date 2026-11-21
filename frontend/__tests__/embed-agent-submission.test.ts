import { describe, expect, it } from "vitest";
import {
  AGENT_SUBMISSIONS,
  parseServiceUrl,
} from "../src/embed/agent-submission";
import { TEMPLATE_URI } from "../src/pages/np/create/components/templates/registry-metadata";

/**
 * An embedded form posts its answers to a signing service (np-user-story-service for
 * user stories) instead of signing in the browser.
 */
describe("submitting a user story to a signing service", () => {
  const toBody = AGENT_SUBMISSIONS[TEMPLATE_URI.USER_STORY];

  it("sends the template's fields under the names the service takes", () => {
    expect(
      toBody({
        US: "F2A-CS2-US4",
        label: "F2A CS2 US4",
        user: "researcher",
        action: "use model outputs",
        purpose: "I can compute indicators",
        domains: ["http://aims.fao.org/aos/agrovoc/c_203"],
        challenges: ["https://example.org/flood"],
        exposedSectors: ["https://example.org/health"],
        digitalObjectTypes: [],
        isExampleNanopub: true,
        // what the form also submits for the in-browser generator
        st03: [{ domain: "http://aims.fao.org/aos/agrovoc/c_203" }],
        _apiLabels: { "https://example.org/flood": "Flood" },
      }),
    ).toEqual({
      id: "F2A-CS2-US4",
      label: "F2A CS2 US4",
      user: "researcher",
      action: "use model outputs",
      purpose: "I can compute indicators",
      domain: ["http://aims.fao.org/aos/agrovoc/c_203"],
      challenge: ["https://example.org/flood"],
      exposed: ["https://example.org/health"],
      DO: [],
      example: true,
      labels: { "https://example.org/flood": "Flood" },
      website: "",
    });
  });

  it("sends nothing personal: the agent publishes", () => {
    const body = toBody({ label: "x", authorName: "A Person" });
    expect(Object.keys(body)).not.toContain("authorName");
    expect(Object.keys(body)).not.toContain("authorOrcid");
  });

  it("is not an example unless asked", () => {
    expect(toBody({}).example).toBe(false);
  });
});

describe("the service a form may post to", () => {
  it("takes https", () => {
    expect(
      parseServiceUrl(
        "https://np-user-story.netlify.app/.netlify/functions/user-story",
      )?.href,
    ).toBe("https://np-user-story.netlify.app/.netlify/functions/user-story");
  });

  it("takes http only on localhost", () => {
    expect(parseServiceUrl("http://localhost:8888/x")).not.toBeNull();
    expect(parseServiceUrl("http://example.org/x")).toBeNull();
  });

  it("refuses what is not a web address", () => {
    expect(parseServiceUrl(null)).toBeNull();
    expect(parseServiceUrl("javascript:alert(1)")).toBeNull();
    expect(parseServiceUrl("not a url")).toBeNull();
  });
});
