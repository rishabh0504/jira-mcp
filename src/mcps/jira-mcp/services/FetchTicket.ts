import { DynamicStructuredTool } from "@langchain/core/tools";
import axios from "axios";
import winston from "winston";
import { z } from "zod";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.simple(),
  transports: [new winston.transports.Console()],
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
          const JIRA_EMAIL = process.env.JIRA_EMAIL!;
          const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN!;

          const JIRA_USER = process.env.JIRA_USER;
          const JIRA_PASSWORD = process.env.JIRA_PASSWORD;
          // For debugging - don't include this in production code
          logger.info(`Using Jira credentials: ${JIRA_EMAIL}`);

          // Check if environment variables are set
          if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
            throw new Error("Missing required Jira environment variables");
          }

          // The URL for the Jira API
          const url = `${JIRA_BASE_URL}/rest/api/2/search?jql=project=${projectKey}`;

          logger.info(`Calling Jira API: ${url}`);

          // For Jira Server, try using Basic Auth with username/password approach
          // const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString(
          //   "base64"
          // );

          const auth = Buffer.from(`${JIRA_USER}:${JIRA_PASSWORD}`).toString(
            "base64"
          );

          const response = await axios.get(url, {
            headers: {
              Authorization: `Basic ${auth}`,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            // Debug info and extra options that help with local Jira servers
            validateStatus: null, // Accept any status code to better debug
            maxRedirects: 5, // Handle redirects
          });

          // Log response status for debugging
          logger.info(`Jira API response status: ${response.status}`);

          if (response.status !== 200) {
            logger.error(`Jira API error: ${response.status}`, response.data);
            throw new Error(
              `Jira API returned status ${response.status}: ${JSON.stringify(
                response.data
              )}`
            );
          }

          console.log(JSON.stringify(response.data.issues));

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
          // Enhanced error logging
          logger.error(
            `❌ Error fetching Jira tickets for ${projectKey}:`,
            error?.response?.status,
            error?.response?.statusText,
            error?.response?.data || error.message
          );

          // Build a more helpful error message
          let errorMessage = `Failed to fetch Jira tickets: ${error.message}`;

          if (error.response) {
            errorMessage += ` (Status: ${error.response.status})`;

            // Add authentication advice
            if (error.response.status === 401) {
              errorMessage += `. Authentication failed. Please check your Jira credentials and API token.`;
            }
          }

          return errorMessage;
        }
      },
    });
  }
}
