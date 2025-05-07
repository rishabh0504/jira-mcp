import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import axios from "axios";

// Define input schema
const inputSchema = z.object({
  projectKey: z
    .string()
    .describe("Jira project key to fetch tickets from (e.g., 'ENBDX')"),
});

export class FetchJiraTicketsTool extends DynamicStructuredTool<
  typeof inputSchema
> {
  constructor() {
    super({
      name: "fetch_jira_tickets",
      description: "Fetch all Jira tickets for a given project key.",
      schema: inputSchema,
      func: async ({ projectKey }) => {
        try {
          const JIRA_BASE_URL = process.env.JIRA_BASE_URL!;
          const JIRA_AUTH = Buffer.from(
            `${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`
          ).toString("base64");

          const response = await axios.get(
            `${JIRA_BASE_URL}/rest/api/2/search?jql=project=${projectKey}`,
            {
              headers: {
                Authorization: `Basic ${JIRA_AUTH}`,
                Accept: "application/json",
              },
            }
          );

          const issues = response.data.issues.map((issue: any) => ({
            key: issue.key,
            summary: issue.fields.summary,
            status: issue.fields.status.name,
            assignee: issue.fields.assignee?.displayName || "Unassigned",
          }));

          return JSON.stringify(issues, null, 2);
        } catch (error: any) {
          console.error(
            "❌ Error fetching Jira tickets:",
            error?.response?.data || error.message
          );
          return `Failed to fetch Jira tickets: ${error.message}`;
        }
      },
    });
  }
}
