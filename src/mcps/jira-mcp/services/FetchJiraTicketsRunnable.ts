import { Runnable, RunnableConfig } from "@langchain/core/runnables";
import { FetchJiraTicketsTool } from "./FetchTicket";

export class FetchJiraTicketsRunnable extends Runnable<
  any,
  any,
  RunnableConfig<Record<string, any>>
> {
  private fetchJiraTicketsTool: FetchJiraTicketsTool;

  constructor() {
    super();
    this.fetchJiraTicketsTool = new FetchJiraTicketsTool();
  }

  // Implement the `invoke` method as required by the Runnable interface
  async invoke(inputs: any): Promise<any> {
    const { projectKey } = inputs;
    return await this.fetchJiraTicketsTool.invoke({ projectKey });
  }

  // Implement the `lc_namespace` property as required by the Runnable interface
  lc_namespace: string[] = ["jira", "fetch_tickets"];
}
