import { definedTools } from "./tools/defined_fi";
import { jupiterTools } from "./tools/jupiter";
import { solanaTools } from "./tools/solana";
import { twitterTools } from "./tools/twitter";

// const toolhouse = new Toolhouse({
//     apiKey: process.env.TOOLHOUSE_API_KEY,
//     provider: "vercel",
// });

// const thTools = await toolhouse.getTools() as Record<string, CoreTool<any, any>>;

export const neurAgentTools = {
    ...solanaTools,
    ...jupiterTools,
    ...definedTools,
    ...twitterTools,
}