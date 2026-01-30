import z from "zod";

/**
 * Validation regex helpers
 */
export const validLength = (min: number, max: number) =>
  new RegExp(`^[\\s\\S]{${min},${max}}$`);

export const validDoi = z
  .string()
  .regex(
    /^(?:10\.1002\/[^\s]+|10\.\d{4,9}\/[-._;()/:A-Z0-9]+)$/i,
    "Enter a valid DOI starting with '10.'",
  );

export const validUriPlaceholder = z
  .string()
  .regex(
    /^[a-zA-Z0-9-!@$&*()_=+;'/?.,~]+$/,
    "Only use letters, numbers, or any of - ! @ $ & * ( ) _ = + ; ' / ? . , ~ (no spaces nor tabs)",
  );
