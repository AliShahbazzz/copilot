import { useAssistantToolUI } from "@assistant-ui/react";
import { CustomerListButton } from "../components/CustomerListButton";
// import { ThreadListButton } from "../components/ThreadListButton";
// import { ThreadMessagesButton } from "../components/ThreadMessagesButton";

export const ToolUIRegistry = () => {
  useAssistantToolUI({
    toolName: "ui",
    render: ({ result }) => {
      console.log("result: ", result);
      if (!result) return null;
      switch ((result as any)?.component?.subType) {
        case "card":
          return <CustomerListButton result={result as any} />;
        case "button":
          return <button>Click me</button>;
        default:
          return null;
      }
    },
  });
  // useAssistantToolUI({
  //   toolName: "search_customers_master",
  //   render: ({ result }) => {
  //     if (!result) return null;
  //     return <CustomerListButton result={result as any} />;
  //   },
  // });

  // useAssistantToolUI({
  //   toolName: "search_threads",
  //   render: ({ result }) => {
  //     if (!result) return null;
  //     return <ThreadListButton result={result as any} />;
  //   },
  // });
  // useAssistantToolUI({
  //   toolName: "get_thread_messages",
  //   render: ({ result }) => {
  //     if (!result) return null;
  //     return <ThreadMessagesButton result={result as any} />;
  //   },
  // });

  return null; // single return at the end
};
