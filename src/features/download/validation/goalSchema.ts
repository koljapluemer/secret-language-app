import { z } from "zod";

export const goalSchema = z.object({
    id: z.string().optional(),
    language: z.string(),
    title: z.string(),
    vocab: z.array(z.string()).optional(),
    glosses: z.array(z.string()).optional(),
    notes: z.array(z.string()).optional(),
    translations: z.array(z.string()).optional(),
    factCards: z.array(z.string()).optional(),
})