import { z } from "zod";

// Helper to coerce empty strings to undefined for optional fields
export const asOptional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(v => (v === '' ? undefined : v), schema.optional());

// Export for reuse in forms
export { asOptional as coerceEmptyToUndefined };