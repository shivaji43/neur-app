export interface ToolActionResult {
  result?: string;
  message: string;
  addResultUtility?: (result: any) => void;
}

export type ToolUpdate = {
  type: string;
  toolCallId: string;
  result: string;
};
