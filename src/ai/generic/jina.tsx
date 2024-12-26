import { ExternalLink } from 'lucide-react';
import { z } from 'zod';

import { Card } from '@/components/ui/card';

// Types
interface JinaWebReaderResponse {
  content: string;
  url: string;
}

// Components
const WebContent = ({ content }: { content: JinaWebReaderResponse }) => {
  return (
    <Card className="relative overflow-hidden p-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <a
            href={content.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            {content.url}
            <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
          {content.content}
        </div>
      </div>
    </Card>
  );
};

// Tools Export
export const jinaTools = {
  readWebPage: {
    displayName: '📖 Read Web Page',
    description:
      'Convert any web page into a clean, readable text format that can be easily understood by AI models.',
    parameters: z.object({
      url: z
        .string()
        .url()
        .describe('The URL of the web page to read and convert to text'),
    }),
    execute: async ({ url }: { url: string }) => {
      try {
        const response = await fetch(`https://r.jina.ai/${url}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${process.env.JINA_API_KEY}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to read web page: ${response.statusText}`);
        }

        const content = await response.text();
        return {
          suppressFollowUp: true,
          data: {
            content,
            url,
          },
        };
      } catch (error) {
        throw new Error(
          `Failed to read web page: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
    },
    render: (raw: unknown) => {
      const result = raw as { data: JinaWebReaderResponse };
      return <WebContent content={result.data} />;
    },
  },
};
