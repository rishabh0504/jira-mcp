import { DynamicStructuredTool } from "@langchain/core/tools";
import axios from "axios";
import winston from "winston";
import { z } from "zod";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.simple(),
  transports: [new winston.transports.Console()],
});

// Schema for creating a Jira ticket
const createTicketSchema = z.object({
  project: z.string().describe("The Jira project key (e.g., 'ENBDX')"),
  summary: z.string().describe("Short summary/title of the ticket"),
  description: z.string().describe("Detailed description of the ticket"),
  issueType: z
    .string()
    .default("Task")
    .describe("Type of issue (e.g., 'Bug', 'Task', 'Story')"),
  priority: z
    .string()
    .optional()
    .describe("Priority of the ticket (e.g., 'High', 'Medium', 'Low')"),
  assignee: z.string().optional().describe("Username of the assignee"),
});

export class CreateJiraTicketTool extends DynamicStructuredTool<
  typeof createTicketSchema
> {
  constructor() {
    super({
      name: "create_jira_ticket",
      description: "Create a new Jira ticket in a specified project.",
      schema: createTicketSchema,
      func: async ({
        project,
        summary,
        description,
        issueType,
        priority,
        assignee,
      }) => {
        logger.info(`📝 Creating Jira ticket in project: ${project}`);
        try {
          const JIRA_BASE_URL = process.env.JIRA_BASE_URL!;
          const JIRA_AUTH = Buffer.from(
            `${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`
          ).toString("base64");

          const url = `${JIRA_BASE_URL}/rest/api/2/issue/`;

          const payload = {
            fields: {
              project: {
                key: project,
              },
              summary: summary,
              description: description,
              issuetype: {
                name: issueType || "Task",
              },
              ...(priority && { priority: { name: priority } }),
              ...(assignee && { assignee: { name: assignee } }),
            },
          };

          logger.info(
            `Creating ticket with payload:`,
            JSON.stringify(payload, null, 2)
          );

          const response = await axios.post(url, payload, {
            headers: {
              Authorization: `Basic ${JIRA_AUTH}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          });

          const newTicket = {
            key: response.data.key,
            self: response.data.self,
            status: "Created",
          };

          logger.info(`✅ Successfully created ticket: ${newTicket.key}`);
          return JSON.stringify(newTicket, null, 2);
        } catch (error: any) {
          logger.error(
            `❌ Error creating Jira ticket in ${project}:`,
            error?.response?.data || error.message
          );
          return `Failed to create Jira ticket: ${error.message}`;
        }
      },
    });
  }
}
