import { z } from "zod";

export const leadActionSchema = z.object({
  contacted: z.boolean().optional(),
  booked: z.boolean().optional(),
  dismissed: z.boolean().optional(),
  notAFit: z.boolean().optional(),
  notes: z.string().optional()
});

export type LeadActionInput = z.infer<typeof leadActionSchema>;
