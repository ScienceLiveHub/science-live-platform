import { findSameQuote, type PaperQuote } from "@/lib/quotes";
import { describe, expect, it } from "vitest";

const q = (np: string, quotation: string, quotationEnd = ""): PaperQuote => ({
  np,
  quotation,
  quotationEnd,
  comment: "",
  creator: "",
  date: "",
  requests: 0,
});

describe("findSameQuote", () => {
  const quotes = [
    q("whole", "Trees regrow   naturally."),
    q("long-a", "A long passage starts here.", "and ends like this."),
    q("long-b", "A long passage starts here.", "but ends differently."),
  ];

  it("matches a whole quote, ignoring whitespace", () => {
    expect(findSameQuote(quotes, " Trees regrow naturally. ")?.np).toBe(
      "whole",
    );
  });

  it("matches a start/end quote on both start and end", () => {
    expect(
      findSameQuote(
        quotes,
        "A long passage starts here.",
        "but ends differently.",
      )?.np,
    ).toBe("long-b");
  });

  it("does not match a start/end quote on its start alone", () => {
    expect(
      findSameQuote(quotes, "A long passage starts here."),
    ).toBeUndefined();
    expect(
      findSameQuote(quotes, "A long passage starts here.", "a third end."),
    ).toBeUndefined();
  });

  it("does not match a whole quote when an end is given", () => {
    expect(
      findSameQuote(quotes, "Trees regrow naturally.", "something else."),
    ).toBeUndefined();
  });

  it("ignores an empty quotation", () => {
    expect(findSameQuote([q("empty", "")], "")).toBeUndefined();
  });
});
