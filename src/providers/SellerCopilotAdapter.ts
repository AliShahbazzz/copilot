import type { ChatModelAdapter } from '@assistant-ui/react';

type ToolStatusPayload = {
  phase: string;
  message: string;
  tool?: string;
};

export const createSellerCopilotAdapter = (
  getToken: () => string,
  threadId: string,
  config: {
    sellerWorkspaceId?: string;
    waConfigId?: string;
    sellerDetails?: object;
  },
  options?: {
    onStatusUpdate?: (payload: ToolStatusPayload) => void;
  },
): ChatModelAdapter => ({
  async *run({ messages, abortSignal }) {
    const lastMessage = messages.at(-1);
    const text = lastMessage?.content
      .filter((c) => c.type === 'text')
      .map((c) => (c as { type: 'text'; text: string }).text)
      .join('');

    const response = await fetch(
      `https://playground-qa.zotok.ai/api/zopilot/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          thread_id: threadId,
          message: text,
          seller_workspace_id: config.sellerWorkspaceId,
          wa_config_id: config.waConfigId,
          seller_details: config.sellerDetails,
        }),
        signal: abortSignal,
      }
    );

    if (!response.ok || !response.body) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let accumulatedText = '';
    const uiPayloads = new Map<string, object>();
    let buffer = '';
    let currentEvent = ''; // ← MUST be outside the while loop

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('event:')) {
          currentEvent = line.slice(6).trim();
          continue;
        }

        if (!line.startsWith('data:')) continue;

        try {
          const data = JSON.parse(line.slice(5).trim());

          if (currentEvent === 'token') {
            accumulatedText += data.content;
          } else if (currentEvent === 'ui') {
            const key = data.tool ?? 'ui';
            uiPayloads.set(key, data.payload);
          } else if (currentEvent === 'error') {
            throw new Error(data.message);
          } else if (currentEvent === 'message' && !accumulatedText) {
            accumulatedText = data.content;
          } else if (currentEvent === 'status') {
            const phase = data.phase as string | undefined;
            const tool = data.tool as string | undefined;
            const statusMessage =
              (data.message as string | undefined) ||
              (phase === 'graph_update'
                ? 'Agent is gathering information...'
                : phase === 'custom_update'
                  ? 'Agent is preparing UI output...'
                  : 'Agent is processing...');

            options?.onStatusUpdate?.({
              phase: phase ?? 'status',
              message: statusMessage,
              tool,
            });
          }

          currentEvent = ''; // reset after consuming the data line

          if (accumulatedText || uiPayloads.size > 0) {
            yield {
              content: [
                ...(accumulatedText
                  ? [{ type: 'text' as const, text: accumulatedText }]
                  : []),
                ...Array.from(uiPayloads.entries()).map(
                  ([toolName, payload]) => ({
                    type: 'tool-call' as const,
                    toolCallId: toolName,
                    toolName,
                    args: {},
                    argsText: '{}',
                    result: payload,
                  })
                ),
              ],
            };
          }
        } catch (e) {
          if (e instanceof Error && e.message !== 'skip') throw e;
        }
      }
    }
  },
});
