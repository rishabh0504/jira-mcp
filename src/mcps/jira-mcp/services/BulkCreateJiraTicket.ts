import axios from "axios";
import { DynamicStructuredTool } from "langchain/tools";
import winston from "winston";
import { z } from "zod";

// Logger setup
const logger = winston.createLogger({
  level: "info",
  format: winston.format.simple(),
  transports: [new winston.transports.Console()],
});

// Schema for a single ticket
const singleTicketSchema = z.object({
  project: z.string(),
  summary: z.string(),
  description: z.string(),
  issueType: z.string().default("Task"),
  priority: z.string().optional(),
  assignee: z.string().optional(),
});

// Bulk ticket schema
const bulkCreateSchema = z.object({
  tickets: z.array(singleTicketSchema).describe("List of tickets to create"),
});

// Tool definition
export const createJiraTicketsBulkTool = new DynamicStructuredTool({
  name: "create_jira_tickets_bulk",
  description: "Create multiple Jira tickets in a single bulk API call.",
  schema: bulkCreateSchema,
  func: async (input: any) => {
    const { tickets } = input;

    const JIRA_BASE_URL = process.env.JIRA_BASE_URL!;
    const JIRA_USER = process.env.JIRA_USER!;
    const JIRA_PASSWORD = process.env.JIRA_PASSWORD!;
    const JIRA_AUTH = Buffer.from(`${JIRA_USER}:${JIRA_PASSWORD}`).toString(
      "base64"
    );

    const url = `${JIRA_BASE_URL}/rest/api/2/issue/bulk`;

    const issueUpdates = tickets.map((ticket: any) => {
      const { project, summary, description, issueType, priority, assignee } =
        ticket;
      return {
        fields: {
          project: { key: project },
          summary,
          description,
          issuetype: { name: issueType || "Task" },
          ...(priority && { priority: { name: priority } }),
          ...(assignee && { assignee: { name: assignee } }),
        },
      };
    });

    const payload = { issueUpdates };

    logger.info(`📝 Bulk creating ${issueUpdates.length} Jira tickets`);

    try {
      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Basic ${JIRA_AUTH}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      const createdTickets = response.data.issues.map((issue: any) => ({
        key: issue.key,
        self: issue.self,
        status: "Created",
      }));

      logger.info(`✅ Created ${createdTickets.length} tickets`);
      return JSON.stringify(createdTickets, null, 2);
    } catch (error: any) {
      logger.error(
        `❌ Bulk ticket creation failed`,
        error?.response?.data || error.message
      );
      return `Failed to create tickets: ${
        error?.response?.data?.errorMessages || error.message
      }`;
    }
  },
  returnDirect: true,
});
