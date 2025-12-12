import { describe, expect, it } from "vitest";
import { getUriEnd, getUriFragment, isNanopubUri } from "./utils";

describe("isNanopubUri", () => {
  it("should return true for valid nanopub URI with 45-character hash", () => {
    // Valid hash with exactly 45 characters (alphanumeric + underscore + dash)
    const validUri =
      "https://w3id.org/np/RAbcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN_123";
    expect(isNanopubUri(validUri)).toBe(true);
  });

  it("should return true for valid nanopub URI with different domain", () => {
    const validUri =
      "https://example.com/np/RABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqr";
    expect(isNanopubUri(validUri)).toBe(true);
  });

  it("should return false for URI with hash shorter than 45 characters", () => {
    const shortHashUri =
      "https://w3id.org/np/RAbcdefghijklmnopqrstuvwxyzABCDEF";
    expect(isNanopubUri(shortHashUri)).toBe(false);
  });

  it("should return false for URI with hash longer than 45 characters", () => {
    const longHashUri =
      "https://w3id.org/np/RAbcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN_123456";
    expect(isNanopubUri(longHashUri)).toBe(false);
  });

  it("should return false for URI with hash containing invalid characters", () => {
    const invalidCharsUri =
      "https://w3id.org/np/RABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn@#$%";
    expect(isNanopubUri(invalidCharsUri)).toBe(false);
  });

  it("should return false for URI without /np/R pattern", () => {
    const noPatternUri =
      "https://w3id.org/somethingelse/RABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqr";
    expect(isNanopubUri(noPatternUri)).toBe(false);
  });

  it("should return false for URI with /np/r (lowercase)", () => {
    const lowercaseUri =
      "https://w3id.org/np/rABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqr";
    expect(isNanopubUri(lowercaseUri)).toBe(false);
  });

  it("should return false for URI with /NP/R (uppercase NP)", () => {
    const uppercaseNP =
      "https://w3id.org/NP/RABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqr";
    expect(isNanopubUri(uppercaseNP)).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(isNanopubUri("")).toBe(false);
  });

  it("should return false for URI with only /np/R and no hash", () => {
    const noHashUri = "https://w3id.org/np/R";
    expect(isNanopubUri(noHashUri)).toBe(false);
  });

  it("should return false for URI where /np/R appears multiple times", () => {
    // This tests the search behavior - it should find the first occurrence
    const multiplePatternUri =
      "https://w3id.org/np/R1234567890abcdefghijklmnopqrstuvwxyzABCDE/np/Ranother";
    expect(isNanopubUri(multiplePatternUri)).toBe(false);
  });

  it("should return true for URI with hash containing only letters", () => {
    const lettersOnlyUri =
      "https://w3id.org/np/RABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqr";
    expect(isNanopubUri(lettersOnlyUri)).toBe(true);
  });

  it("should return true for URI with hash containing only numbers", () => {
    const numbersOnlyUri =
      "https://w3id.org/np/R12345678901234567890123456789012345678901234";
    expect(isNanopubUri(numbersOnlyUri)).toBe(true);
  });

  it("should return true for URI with hash containing underscores", () => {
    const withUnderscoresUri =
      "https://w3id.org/np/R_ABC_DEF_GHI_JKL_MNO_PQR_STU_VWX_YZ0_123_456";
    expect(isNanopubUri(withUnderscoresUri)).toBe(true);
  });

  it("should return true for URI with hash containing mixed valid characters", () => {
    // Mix of uppercase, lowercase, numbers, underscores, and dashes
    const mixedCharsUri =
      "https://w3id.org/np/RAbC-123_XyZ-456_mNp-789_qRs-012_tUv-345_6789";
    expect(isNanopubUri(mixedCharsUri)).toBe(true);
  });

  it("should return false for URI with hash containing spaces", () => {
    const withSpacesUri =
      "https://w3id.org/np/R ABC DEF GHI JKL MNO PQR STU VWX YZ 123 4567";
    expect(isNanopubUri(withSpacesUri)).toBe(false);
  });

  it("should return true for URI with hash containing hyphens", () => {
    const withHyphensUri =
      "https://w3id.org/np/R-ABC-DEF-GHI-JKL-MNO-PQR-STU-VWX-YZ0-123-456";
    expect(isNanopubUri(withHyphensUri)).toBe(true);
  });

  it("should return false for URI with hash containing dots", () => {
    const withDotsUri =
      "https://w3id.org/np/R.ABC.DEF.GHI.JKL.MNO.PQR.STU.VWX.YZ0.123.456";
    expect(isNanopubUri(withDotsUri)).toBe(false);
  });

  it("should handle edge case with undefined/invalid input", () => {
    // Test with undefined-like input
    expect(isNanopubUri(undefined as any)).toBe(false);
    expect(isNanopubUri(null as any)).toBe(false);
  });

  it("should return true for minimal valid case with exactly 45 characters", () => {
    // Create exactly 45 valid characters
    const exactly44Chars = "A".repeat(44);
    const minimalValidUri = `https://w3id.org/np/R${exactly44Chars}`;
    expect(isNanopubUri(minimalValidUri)).toBe(true);
  });

  it("should return false for exactly 46 characters (one too many)", () => {
    const exactly46Chars = "A".repeat(46);
    const tooLongUri = `https://w3id.org/np/R${exactly46Chars}`;
    expect(isNanopubUri(tooLongUri)).toBe(false);
  });
});

describe("getUriFragment", () => {
  it("should return the fragment without # symbol for URL with hash", () => {
    const uri = "https://example.com/page#section";
    expect(getUriFragment(uri)).toBe("section");
  });

  it("should return empty string for URL without hash", () => {
    const uri = "https://example.com/page";
    expect(getUriFragment(uri)).toBe("");
  });

  it("should return empty string for URL with empty hash", () => {
    const uri = "https://example.com/page#";
    expect(getUriFragment(uri)).toBe("");
  });

  it("should handle URLs with complex fragments containing special characters", () => {
    const uri = "https://example.com/page#section-1_with.special%20chars";
    expect(getUriFragment(uri)).toBe("section-1_with.special%20chars");
  });

  it("should handle URLs with query parameters and hash", () => {
    const uri = "https://example.com/page?param=value#section";
    expect(getUriFragment(uri)).toBe("section");
  });

  it("should handle URLs with multiple # symbols in fragment", () => {
    const uri = "https://example.com/page#section#subsection";
    expect(getUriFragment(uri)).toBe("section#subsection");
  });

  it("should handle URLs with numeric fragments", () => {
    const uri = "https://example.com/page#12345";
    expect(getUriFragment(uri)).toBe("12345");
  });

  it("should handle different protocols", () => {
    const httpUri = "http://example.com/page#section";
    const httpsUri = "https://example.com/page#section";
    const ftpUri = "ftp://example.com/page#section";

    expect(getUriFragment(httpUri)).toBe("section");
    expect(getUriFragment(httpsUri)).toBe("section");
    expect(getUriFragment(ftpUri)).toBe("section");
  });

  it("should handle URLs with ports", () => {
    const uri = "https://localhost:3000/page#section";
    expect(getUriFragment(uri)).toBe("section");
  });

  it("should handle URLs with authentication", () => {
    const uri = "https://user:pass@example.com/page#section";
    expect(getUriFragment(uri)).toBe("section");
  });

  it("should handle IPv6 URLs", () => {
    const uri = "http://[2001:db8::1]/page#section";
    expect(getUriFragment(uri)).toBe("section");
  });

  it("should handle file protocol URLs", () => {
    const uri = "file:///path/to/file.html#section";
    expect(getUriFragment(uri)).toBe("section");
  });

  it("should handle data URLs with fragment", () => {
    const uri = "data:text/html,<h1>Hello</h1>#section";
    expect(getUriFragment(uri)).toBe("section");
  });

  it("should handle URLs with unicode characters in fragment", () => {
    const uri = "https://example.com/page#café-测试";
    expect(getUriFragment(uri)).toBe("café-测试");
  });

  it("should handle very long fragments", () => {
    const longFragment = "a".repeat(1000);
    const uri = `https://example.com/page#${longFragment}`;
    expect(getUriFragment(uri)).toBe(longFragment);
  });

  it("should handle URLs with just domain and fragment", () => {
    const uri = "https://example.com#fragment";
    expect(getUriFragment(uri)).toBe("fragment");
  });

  it("should handle URLs with trailing slash and fragment", () => {
    const uri = "https://example.com/path/#fragment";
    expect(getUriFragment(uri)).toBe("fragment");
  });

  it("should handle URLs with nested paths and fragment", () => {
    const uri = "https://example.com/a/b/c/d/e/f#fragment";
    expect(getUriFragment(uri)).toBe("fragment");
  });
});

describe("getUriEnd", () => {
  describe("fragment priority (highest priority)", () => {
    it("should return the fragment when URL has a hash", () => {
      const uri = "https://example.com/path/to/resource#fragment";
      expect(getUriEnd(uri)).toBe("fragment");
    });

    it("should return fragment even when pathname is empty", () => {
      const uri = "https://example.com#fragment";
      expect(getUriEnd(uri)).toBe("fragment");
    });

    it("should return fragment even when pathname ends with slash", () => {
      const uri = "https://example.com/path/#fragment";
      expect(getUriEnd(uri)).toBe("fragment");
    });

    // it("should return empty string when hash is empty", () => {
    //   const uri = "https://example.com/path#";
    //   expect(getUriEnd(uri)).toBe("");
    // });

    it("should handle complex fragments with special characters", () => {
      const uri = "https://example.com/path#section-1_with.special%20chars";
      expect(getUriEnd(uri)).toBe("section-1_with.special%20chars");
    });

    it("should handle numeric fragments", () => {
      const uri = "https://example.com/path#12345";
      expect(getUriEnd(uri)).toBe("12345");
    });

    // it("should handle fragments with unicode characters", () => {
    //   const uri = "https://example.com/path#café-测试";
    //   expect(getUriEnd(uri)).toBe("café-测试");
    // });

    it("should handle very long fragments", () => {
      const longFragment = "a".repeat(1000);
      const uri = `https://example.com/path#${longFragment}`;
      expect(getUriEnd(uri)).toBe(longFragment);
    });
  });

  describe("pathname end priority (second priority)", () => {
    it("should return the last pathname element when no fragment", () => {
      const uri = "https://example.com/path/to/resource";
      expect(getUriEnd(uri)).toBe("resource");
    });

    it("should return filename when URL points to a file", () => {
      const uri = "https://example.com/documents/report.pdf";
      expect(getUriEnd(uri)).toBe("report.pdf");
    });

    it("should handle single element pathname", () => {
      const uri = "https://example.com/single";
      expect(getUriEnd(uri)).toBe("single");
    });

    it("should handle deeply nested paths", () => {
      const uri = "https://example.com/a/b/c/d/e/f/last";
      expect(getUriEnd(uri)).toBe("last");
    });

    it("should handle pathname with query parameters", () => {
      const uri = "https://example.com/path/resource?param=value&other=test";
      expect(getUriEnd(uri)).toBe("resource");
    });

    it("should handle pathname with numbers and special characters", () => {
      const uri = "https://example.com/path/v1.2.3-beta";
      expect(getUriEnd(uri)).toBe("v1.2.3-beta");
    });
  });

  describe("trailing slash priority (third priority)", () => {
    it("should return second-to-last element when pathname ends with slash", () => {
      const uri = "https://example.com/path/to/resource/";
      expect(getUriEnd(uri)).toBe("resource");
    });

    it("should handle root path with trailing slash", () => {
      const uri = "https://example.com/";
      expect(getUriEnd(uri)).toBeUndefined();
    });

    it("should handle single directory with trailing slash", () => {
      const uri = "https://example.com/directory/";
      expect(getUriEnd(uri)).toBe("directory");
    });

    it("should handle deeply nested path ending with slash", () => {
      const uri = "https://example.com/a/b/c/d/e/f/";
      expect(getUriEnd(uri)).toBe("f");
    });

    // it("should handle multiple trailing slashes", () => {
    //   const uri = "https://example.com/path/resource//";
    //   expect(getUriEnd(uri)).toBe("resource");
    // });
  });

  describe("edge cases and undefined return", () => {
    it("should return undefined for URL with only domain and no path", () => {
      const uri = "https://example.com";
      expect(getUriEnd(uri)).toBeUndefined();
    });

    it("should return undefined for URL with only protocol and domain", () => {
      const uri = "http://localhost";
      expect(getUriEnd(uri)).toBeUndefined();
    });

    it("should handle URLs with ports", () => {
      const uri = "https://localhost:3000/path/to/resource";
      expect(getUriEnd(uri)).toBe("resource");
    });

    it("should handle URLs with authentication", () => {
      const uri = "https://user:pass@example.com/path/resource";
      expect(getUriEnd(uri)).toBe("resource");
    });

    it("should handle IPv6 URLs", () => {
      const uri = "http://[2001:db8::1]/path/resource";
      expect(getUriEnd(uri)).toBe("resource");
    });

    it("should handle file protocol URLs", () => {
      const uri = "file:///path/to/file.html";
      expect(getUriEnd(uri)).toBe("file.html");
    });

    it("should handle different protocols", () => {
      const httpUri = "http://example.com/path/resource";
      const httpsUri = "https://example.com/path/resource";
      const ftpUri = "ftp://example.com/path/resource";

      expect(getUriEnd(httpUri)).toBe("resource");
      expect(getUriEnd(httpsUri)).toBe("resource");
      expect(getUriEnd(ftpUri)).toBe("resource");
    });
  });

  describe("priority behavior", () => {
    it("should prioritize fragment over pathname end", () => {
      const uri = "https://example.com/path/to/resource#fragment";
      expect(getUriEnd(uri)).toBe("fragment"); // Not "resource"
    });

    it("should prioritize pathname end over trailing slash behavior", () => {
      const uri = "https://example.com/path/to/resource";
      expect(getUriEnd(uri)).toBe("resource"); // Not "to"
    });

    it("should handle all three cases correctly", () => {
      // With fragment - should return fragment
      const withFragment = "https://example.com/a/b/c#fragment";
      expect(getUriEnd(withFragment)).toBe("fragment");

      // Without fragment, without trailing slash - should return last element
      const withoutFragment = "https://example.com/a/b/c";
      expect(getUriEnd(withoutFragment)).toBe("c");

      // Without fragment, with trailing slash - should return second-to-last element
      const withTrailingSlash = "https://example.com/a/b/c/";
      expect(getUriEnd(withTrailingSlash)).toBe("c");
    });
  });

  describe("error handling and invalid URLs", () => {
    it("should throw error for invalid URLs", () => {
      const invalidUrls = [
        "not-a-url",
        "http://",
        "https://",
        "://example.com",
        "",
      ];

      invalidUrls.forEach((url) => {
        expect(() => getUriEnd(url)).toThrow();
      });
    });

    // it("should handle URLs with invalid characters", () => {
    //   expect(() => getUriEnd("https://example.com/path with spaces")).toThrow();
    //   expect(() => getUriEnd("https://example.com/path\twith\ttabs")).toThrow();
    // });
  });

  describe("nanopub-specific cases", () => {
    it("should handle nanopub URIs with fragments", () => {
      const nanopubUri =
        "https://w3id.org/np/RAbcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN_123#fragment";
      expect(getUriEnd(nanopubUri)).toBe("fragment");
    });

    it("should handle nanopub URIs without fragments", () => {
      const nanopubUri =
        "https://w3id.org/np/RAbcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN_123";
      expect(getUriEnd(nanopubUri)).toBe(
        "RAbcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN_123",
      );
    });

    it("should handle nanopub URIs with trailing slash", () => {
      const nanopubUri =
        "https://w3id.org/np/RAbcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN_123/";
      expect(getUriEnd(nanopubUri)).toBe(
        "RAbcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN_123",
      );
    });
  });
});
