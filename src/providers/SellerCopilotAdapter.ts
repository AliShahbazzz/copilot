import type { ChatModelAdapter } from "@assistant-ui/react";
import type { StatusStep } from "../components/AgentStatusIndicator";

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

function buildAgentStatusBlock(steps: StatusStep[]) {
  return {
    type: "tool-call" as const,
    toolCallId: "agent-status",
    toolName: "agentStatus",
    args: {},
    argsText: "{}",
    result: { steps: steps.map((s) => ({ ...s })) },
  };
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

    const response = await fetch(`http://localhost:2024/api/zopilot/stream`, {
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
    });

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
    let isStructuredResponse: boolean | null = null;
    let messageExtracted = "";
    let inMessageValue = false;
    let messageValueDone = false;

    // Status tracking
    const statusSteps: StatusStep[] = [];
    let hasStatusUpdate = false;

    function handleStatus(data: Record<string, unknown>): boolean {
      const phase = data.phase as string;

      if (phase === "thinking") {
        statusSteps.push({ label: (data.label as string) || "Analyzing your request", done: false });
        return true;
      }

      if (phase === "tool_start") {
        // Complete any currently running step (e.g. the "thinking" step)
        const lastRunning = [...statusSteps].reverse().findIndex((s) => !s.done);
        if (lastRunning >= 0) {
          statusSteps[statusSteps.length - 1 - lastRunning].done = true;
        }
        statusSteps.push({ label: (data.label as string) || `Running ${data.tool}`, done: false });
        return true;
      }

      if (phase === "tool_done") {
        const lastRunning = [...statusSteps].reverse().findIndex((s) => !s.done);
        if (lastRunning >= 0) {
          statusSteps[statusSteps.length - 1 - lastRunning].done = true;
        }
        return true;
      }

      return false;
    }

    function buildContent() {
      return [
        // Status indicator always first (if any steps)
        ...(statusSteps.length > 0 ? [buildAgentStatusBlock(statusSteps)] : []),
        // Streaming text
        ...(accumulatedText ? [{ type: "text" as const, text: accumulatedText }] : []),
        // UI card(s)
        ...Array.from(uiPayloads.entries()).map(([toolName, payload]) => ({
          type: "tool-call" as const,
          toolCallId: toolName,
          toolName,
          args: {},
          argsText: "{}",
          result: payload,
        })),
      ];
    }

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

          if (currentEvent === "status") {
            hasStatusUpdate = handleStatus(data);
            if (hasStatusUpdate) {
              const content = buildContent();
              if (content.length > 0) yield { content };
            }
          } else if (currentEvent === "token") {
            const token = data.content as string;
            tokenBuffer += token;

            // Mark all remaining running steps as done once text starts
            statusSteps.forEach((s) => { s.done = true; });

            if (isStructuredResponse === null && tokenBuffer.trim().length > 0) {
              isStructuredResponse = tokenBuffer.trimStart().startsWith("{");
            }

            if (!isStructuredResponse) {
              accumulatedText += token;
            } else {
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
                  const remaining = tokenBuffer.slice(tokenBuffer.indexOf('"message"'));
                  const afterMatch = remaining.match(/"message"\s*:\s*"([\s\S]*)/);
                  if (afterMatch) {
                    const { extracted, done } = extractJsonString(afterMatch[1]);
                    messageExtracted = extracted;
                    messageValueDone = done;
                    accumulatedText = messageExtracted;
                  }
                }
              }
            }
          } else if (currentEvent === "ui") {
            uiPayloads.set("ui", data.payload);
          } else if (currentEvent === "error") {
            throw new Error(data.message);
          } else if (currentEvent === "message" && !accumulatedText) {
            accumulatedText = data.content;
            statusSteps.forEach((s) => { s.done = true; });
          }

          currentEvent = "";

          if (accumulatedText || uiPayloads.size > 0 || statusSteps.length > 0) {
            yield { content: buildContent() };
          }
        } catch (e) {
          if (e instanceof Error && e.message !== "skip") throw e;
        }
      }
    }
  },
});
