// import { z } from "zod";
// import { twitterClient } from "@/lib/twitter-client";
// import type { SearchResponse, TwitterUser, UserTimelineResponse } from "@/types/twitter";

// const usernameSchema = z.string()
//     .min(1, 'Username cannot be empty')
//     .max(15, 'Username cannot exceed 15 characters')
//     .regex(/^[A-Za-z0-9_]+$/, 'Invalid Twitter username format. Only letters, numbers, and underscores are allowed.')
//     .describe('The Twitter username to query.');

// const searchQuerySchema = z.string()
//     .min(1, 'Search query cannot be empty')
//     .max(500, 'Search query is too long')
//     .describe('The search query to find tweets.');

// const paginationSchema = z.object({
//     limit: z.number().min(1).max(100).optional(),
//     cursor: z.string().optional(),
// }).describe('Pagination parameters for the request.');

// type SearchParams = {
//     query: string;
//     limit?: number;
//     cursor?: string;
//     includeReplies?: boolean;
// };

// type UserTimelineParams = {
//     username: string;
//     limit?: number;
//     cursor?: string;
//     includeReplies?: boolean;
//     includeRetweets?: boolean;
// };

// type UserParams = {
//     username: string;
// };

// type SearchUsersParams = {
//     query: string;
//     limit?: number;
//     cursor?: string;
// };

// const twitter = {
//     searchTweets: {
//         description: 'Search for tweets using a query string. Returns tweets matching the search criteria.',
//         parameters: z.object({
//             query: searchQuerySchema,
//             ...paginationSchema.shape,
//             includeReplies: z.boolean().optional(),
//         }),
//         execute: async ({ query, limit, cursor, includeReplies }: SearchParams): Promise<SearchResponse> => {
//             return await twitterClient.searchTweets({
//                 query,
//                 limit,
//                 cursor,
//                 includeReplies,
//             });
//         },
//     },

//     getUserTimeline: {
//         description: 'Get tweets from a specific user\'s timeline. Returns a list of their recent tweets.',
//         parameters: z.object({
//             username: usernameSchema,
//             ...paginationSchema.shape,
//             includeReplies: z.boolean().optional(),
//             includeRetweets: z.boolean().optional(),
//         }),
//         execute: async ({ username, limit, cursor, includeReplies, includeRetweets }: UserTimelineParams): Promise<UserTimelineResponse> => {
//             return await twitterClient.getUserTimeline({
//                 username,
//                 limit,
//                 cursor,
//                 includeReplies,
//                 includeRetweets,
//             });
//         },
//     },

//     getUser: {
//         description: 'Get detailed information about a Twitter user by their username.',
//         parameters: z.object({
//             username: usernameSchema,
//         }),
//         execute: async ({ username }: UserParams): Promise<TwitterUser> => {
//             return await twitterClient.getUser({ username });
//         },
//     },

//     searchUsers: {
//         description: 'Search for Twitter users by a query string. Returns matching user profiles.',
//         parameters: z.object({
//             query: searchQuerySchema,
//             ...paginationSchema.shape,
//         }),
//         execute: async ({ query, limit = 20, cursor }: SearchUsersParams): Promise<SearchResponse> => {
//             return await twitterClient.searchTweets({
//                 query: `from:${query}`,
//                 limit,
//                 cursor,
//             });
//         },
//     },

//     getTrendingTopics: {
//         description: 'Get current trending topics on Twitter.',
//         parameters: z.object({}),
//         execute: async (): Promise<SearchResponse> => {
//             return await twitterClient.searchTweets({
//                 query: "trending",
//                 limit: 10,
//             });
//         },
//     },
// }

export const twitterTools = {

}
