import { z } from "zod";

export const glossSchema = z.object({
    id: z.string().optional(),
    description: z.string(),
    descriptions: z.array(z.object({
        languageCode: z.string(),
        description: z.string()
    })).optional()
})
