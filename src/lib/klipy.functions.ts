import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { searchKlipyGifs } from "./klipy.server";

export const searchGifs = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z
      .object({
        q: z.string().optional().default(""),
        customerId: z.string().min(1),
        page: z.number().int().min(1).optional().default(1),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    return searchKlipyGifs(data);
  });
