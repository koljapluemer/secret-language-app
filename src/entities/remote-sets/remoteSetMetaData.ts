import { z } from "zod";


export const remoteSetMetaDataSchema = z.object({
    title: z.string(),
    preferredMode: z.string().optional(),
    description: z.string().optional(),
})