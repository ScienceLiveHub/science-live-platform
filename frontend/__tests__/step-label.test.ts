import { describe, expect, it } from "vitest";
import { stepTypeLabel } from "@/pages/np/view/step-label";

describe("stepTypeLabel", () => {
  it("names spine steps by their step name", () => {
    expect(stepTypeLabel({ step: "Outcome" })).toBe("Outcome");
    expect(stepTypeLabel({ step: "ResearchSoftware" })).toBe("Research Software");
  });

  it("lets an attached nanopublication name itself from its template", () => {
    expect(
      stepTypeLabel({ step: "Attached", stepType: "Declaring a Dataset (adjusted version)" }),
    ).toBe("Declaring a Dataset");
    expect(
      stepTypeLabel({ step: "Attached", stepType: "Geographical Coverage" }),
    ).toBe("Geographical Coverage");
  });

  it("falls back when an older API sent no template label", () => {
    expect(stepTypeLabel({ step: "Attached" })).toBe("Nanopublication");
  });
});
