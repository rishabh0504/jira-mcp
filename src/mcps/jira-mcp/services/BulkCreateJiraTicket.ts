import axios from "axios";
import { DynamicStructuredTool } from "langchain/tools";
import winston from "winston";

// Logger setup
const logger = winston.createLogger({
  level: "info",
  format: winston.format.simple(),
  transports: [new winston.transports.Console()],
});

// Tool definition
export const bulkCreateJiraTicketsTool = new DynamicStructuredTool({
  name: "bulk_create_jira_tickets",
  description: "Create multiple Jira tickets in one request.",
  schema: {},
  func: async (input: any) => {
    const { issues } = JSON.parse(input) || {};

    try {
      const JIRA_BASE_URL = process.env.JIRA_BASE_URL!;
      const JIRA_USER = process.env.JIRA_USER!;
      const JIRA_PASSWORD = process.env.JIRA_PASSWORD!;
      const JIRA_AUTH = Buffer.from(`${JIRA_USER}:${JIRA_PASSWORD}`).toString(
        "base64"
      );

      const url = `${JIRA_BASE_URL}/rest/api/2/issue/bulk`;

      const payload = {
        issueUpdates: issues.map((issue: any) => {
          const fields: any = {
            project: { key: issue.project },
            summary: issue.summary,
            description: issue.description,
            issuetype: { name: issue.issueType || "Story" },
          };

          if (issue.issueType === "Epic" && issue.epic_name) {
            fields.customfield_10104 = issue.epic_name;
          }

          return { fields };
        }),
      };

      logger.info(`📤 Bulk Payload: ${JSON.stringify(payload, null, 2)}`);

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Basic ${JIRA_AUTH}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      const created = response.data.issues.map((i: any) => ({
        key: i.key,
        self: i.self,
        status: "Created",
      }));

      logger.info(
        `✅ Tickets created: ${created.map((t: any) => t.key).join(", ")}`
      );
      return JSON.stringify(created, null, 2);
    } catch (error: any) {
      logger.error(
        `❌ Error in bulk ticket creation:`,
        error?.response?.data || error.message
      );
      return `Failed to create bulk Jira tickets: ${error.message}`;
    }
  },
  returnDirect: true,
});
