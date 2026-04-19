import { expect } from "vitest";
import { NanopubStore } from "../src/lib/nanopub-store";

expect.extend({
  async toMatchSerializedTrig(received: string, expected: string) {
    // Compare serialized versions to ensure quads match
    const receivedSerialized = (
      await NanopubStore.loadString(received)
    ).serialize();
    const expectedSerialized = (
      await NanopubStore.loadString(expected)
    ).serialize();

    return {
      // do not alter your "pass" based on isNot. Vitest does it for you
      pass: receivedSerialized === expectedSerialized,
      message: () => "Serialized TriG did not match.",
      actual: receivedSerialized,
      expected: expectedSerialized,
    };
  },
});
