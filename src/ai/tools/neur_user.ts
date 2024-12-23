import { z } from "zod";
import { ToolConfig } from "../providers";

export const neurUserTools: ToolConfig[] = [
    {
        displayName: "Neur User",
        description: "Get the user's information",
        parameters: z.object({}),
        execute: async () => {
            return { user: "user" };
        },
    },
];
