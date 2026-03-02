import { useAssistantToolUI } from "@assistant-ui/react";
import { CustomerListButton } from "../components/CustomerListButton";
import { AgentStatusIndicator } from "../components/AgentStatusIndicator";
import { ThreadListButton } from "../components/ThreadListButton";
import { ThreadMessagesButton } from "../components/ThreadMessagesButton";

export const ToolUIRegistry = () => {
  useAssistantToolUI({
    toolName: "agentStatus",
    render: ({ result }) => {
      if (!result) return null;
      return <AgentStatusIndicator steps={(result as any).steps ?? []} />;
    },
  });

  useAssistantToolUI({
    toolName: "ui",
    render: ({ result }) => {
      console.log("result: ", result);
      if (!result) return null;
      switch ((result as any)?.component?.subType) {
        case "card":
          switch ((result as any)?.component?.metadata) {
            case "customers":
            case "invoices":
            case "ledger":
              return <CustomerListButton result={result as any} />;
            case "thread":
            case "threads":
              return <ThreadListButton result={result as any} />;
            case "messages":
              return <ThreadMessagesButton result={result as any} />;
            default:
              return null;
          }
        case "button":
          return <button>Click me</button>;
        default:
          return null;
      }
    },
  });

  return null; // single return at the end
};
