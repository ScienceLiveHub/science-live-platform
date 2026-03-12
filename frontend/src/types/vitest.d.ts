import "vitest";

declare module "vitest" {
  interface Assertion<T = any> {
    toMatchSerializedTrig(expected: string): Promise<void>;
  }
  interface AsymmetricMatchersContaining {
    toMatchSerializedTrig(expected: string): Promise<void>;
  }
}
