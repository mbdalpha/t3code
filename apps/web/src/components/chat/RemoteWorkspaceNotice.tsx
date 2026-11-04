import type { ServerProvider } from "@t3tools/contracts";
import { CloudIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

export function RemoteWorkspaceNotice(props: {
  workspaceLocation: ServerProvider["workspaceLocation"];
}) {
  if (props.workspaceLocation !== "remote") return null;
  return (
    <div
      className="mt-3 min-w-0 shrink-0"
      style={{
        marginInlineStart: "calc(var(--chat-lane-inset-start, 0px) + 1rem)",
        marginInlineEnd: "calc(var(--chat-lane-inset-end, 0px) + 1rem)",
      }}
    >
      <Alert variant="info" role="status" controlAlignment="first-line">
        <CloudIcon />
        <AlertTitle>Remote agent workspace</AlertTitle>
        <AlertDescription>
          The agent edits a separate checkout. Git, terminal and preview controls use this T3
          environment. Files aren't synchronized.
        </AlertDescription>
      </Alert>
    </div>
  );
}
