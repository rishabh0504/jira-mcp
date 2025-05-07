import { DynamicStructuredTool } from "@langchain/core/tools";
import axios from "axios";
import winston from "winston";
import { z } from "zod";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.simple(),
  transports: [
    new winston.transports.Console(),
    // Optionally: add file logging
    // new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Correct schema expected by LangChain agent
const inputSchema = z.object({
  input: z
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
      func: async ({ input }) => {
        const projectKey = input;

        logger.info(`🔍 Fetching Jira tickets for project: ${projectKey}`);
        try {
          const JIRA_BASE_URL = process.env.JIRA_BASE_URL!;
          const JIRA_AUTH = Buffer.from(
            `${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`
          ).toString("base64");

          const url = `${JIRA_BASE_URL}/rest/api/2/search?jql=project=${projectKey}`;

          logger.info(`Calling url for extracting the information ::`, url);
          const response = await axios.get(url, {
            headers: {
              Authorization: `Basic ${JIRA_AUTH}`,
              Accept: "application/json",
            },
          });

          const issues = response.data.issues.map((issue: any) => ({
            key: issue.key,
            summary: issue.fields.summary,
            status: issue.fields.status.name,
            assignee: issue.fields.assignee?.displayName || "Unassigned",
          }));

          logger.info(
            `✅ Retrieved ${issues.length} tickets from project ${projectKey}`
          );
          return JSON.stringify(issues, null, 2);
        } catch (error: any) {
          logger.error(
            `❌ Error fetching Jira tickets for ${projectKey}:`,
            error?.response?.data || error.message
          );
          return `Failed to fetch Jira tickets: ${error.message}`;
        }
      },
    });
  }
}
