import type { ChatModelAdapter } from "@assistant-ui/react";

function extractJsonString(raw: string): { extracted: string; done: boolean } {
  let result = "";
  let i = 0;
  while (i < raw.length) {
    const char = raw[i];
    if (char === "\\") {
      const next = raw[i + 1];
      if (next === '"') result += '"';
      else if (next === "n") result += "\n";
      else if (next === "t") result += "\t";
      else if (next === "\\") result += "\\";
      else result += next ?? "";
      i += 2;
    } else if (char === '"') {
      return { extracted: result, done: true };
    } else {
      result += char;
      i++;
    }
  }
  return { extracted: result, done: false };
}

export const createSellerCopilotAdapter = (
  getToken: () => string,
  threadId: string,
  config: {
    sellerWorkspaceId?: string;
    waConfigId?: string;
    sellerDetails?: object;
  },
): ChatModelAdapter => ({
  async *run({ messages, abortSignal }) {
    const lastMessage = messages.at(-1);
    const text = lastMessage?.content
      .filter((c) => c.type === "text")
      .map((c) => (c as { type: "text"; text: string }).text)
      .join("");

    const response = await fetch(
      `https://playground-qa.zotok.ai/api/zopilot/stream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
      },
    );

    if (!response.ok || !response.body) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let accumulatedText = "";
    const uiPayloads = new Map<string, object>();
    let currentEvent = "";
    let buffer = "";
    let tokenBuffer = "";
    let isStructuredResponse: boolean | null = null; // null = not yet determined
    let messageExtracted = "";
    let inMessageValue = false;
    let messageValueDone = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("event:")) {
          currentEvent = line.slice(6).trim();
          continue;
        }

        if (!line.startsWith("data:")) continue;

        try {
          const data = JSON.parse(line.slice(5).trim());

          if (currentEvent === "token") {
            const token = data.content as string;
            tokenBuffer += token;

            // Determine on first non-whitespace content whether this is JSON
            if (
              isStructuredResponse === null &&
              tokenBuffer.trim().length > 0
            ) {
              isStructuredResponse = tokenBuffer.trimStart().startsWith("{");
            }

            if (!isStructuredResponse) {
              // Plain text — stream directly
              accumulatedText += token;
            } else {
              // JSON response — extract only "message" field value
              if (!messageValueDone) {
                if (!inMessageValue) {
                  const match = tokenBuffer.match(/"message"\s*:\s*"([\s\S]*)/);
                  if (match) {
                    inMessageValue = true;
                    const afterQuote = match[1];
                    const { extracted, done } = extractJsonString(afterQuote);
                    messageExtracted = extracted;
                    messageValueDone = done;
                    accumulatedText = messageExtracted;
                  }
                } else {
                  // Already inside message value, process new token
                  const remaining = tokenBuffer.slice(
                    tokenBuffer.indexOf('"message"'),
                  );
                  const afterMatch = remaining.match(
                    /"message"\s*:\s*"([\s\S]*)/,
                  );
                  if (afterMatch) {
                    const { extracted, done } = extractJsonString(
                      afterMatch[1],
                    );
                    messageExtracted = extracted;
                    messageValueDone = done;
                    accumulatedText = messageExtracted;
                  }
                }
              }
            }
          } else if (currentEvent === "ui") {
            const key = "ui";
            uiPayloads.set(key, data.payload);
          } else if (currentEvent === "error") {
            throw new Error(data.message);
          } else if (currentEvent === "message" && !accumulatedText) {
            accumulatedText = data.content;
          }

          currentEvent = ""; // reset after consuming the data line

          if (accumulatedText || uiPayloads.size > 0) {
            yield {
              content: [
                ...(accumulatedText
                  ? [{ type: "text" as const, text: accumulatedText }]
                  : []),
                ...Array.from(uiPayloads.entries()).map(
                  ([toolName, payload]) => ({
                    type: "tool-call" as const,
                    toolCallId: toolName,
                    toolName,
                    args: {},
                    argsText: "{}",
                    result: payload,
                  }),
                ),
              ],
            };
          }
        } catch (e) {
          if (e instanceof Error && e.message !== "skip") throw e;
        }
      }
    }
  },
});
