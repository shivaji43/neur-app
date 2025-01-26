import { getAgentKit } from "../actions/ai";


/*
Server Utils
Only server side utility functions should be placed here.
Do not call these functions from the client side.
*/

/**
 * Bypasses verifyUser() and retrieves the agent kit for the given userId.
 * @param userId 
 * @returns Agent kit for userId
 */
export const retrieveAgentKitServer = async ({ userId, walletId }: {
  userId: string;
  walletId?: string;
}) => {
  return getAgentKit({ userId, walletId });
};
