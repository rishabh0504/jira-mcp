import { DynamicStructuredTool } from "@langchain/core/tools";
import axios from "axios";
import winston from "winston";
import { z } from "zod";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Empty schema since we don't need parameters
const emptySchema = z.object({
  input: z.string().optional().describe("Optional parameter, not used"),
});

export class JiraDebugTool extends DynamicStructuredTool<typeof emptySchema> {
  constructor() {
    super({
      name: "jira_debug",
      description: "Debug Jira connection and authentication issues.",
      schema: emptySchema,
      func: async () => {
        logger.info(`🔍 Testing Jira connection and authentication`);

        try {
          // Get environment variables
          const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
          // const JIRA_EMAIL = process.env.JIRA_EMAIL;
          // const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

          const JIRA_USER = process.env.JIRA_USER;
          const JIRA_PASSWORD = process.env.JIRA_PASSWORD;

          // Check if environment variables are set
          const results = {
            environment: {
              JIRA_BASE_URL: JIRA_BASE_URL ? "✅ Set" : "❌ Missing",
              JIRA_USER: JIRA_USER ? "✅ Set" : "❌ Missing",
              JIRA_PASSWORD: JIRA_PASSWORD ? "✅ Set" : "❌ Missing",
            },
            connection: "Not tested yet",
            authentication: "Not tested yet",
            myself: "Not fetched yet",
            projects: "Not fetched yet",
          };

          if (!JIRA_BASE_URL || !JIRA_USER || !JIRA_PASSWORD) {
            return JSON.stringify(
              {
                success: false,
                message: "Missing required environment variables",
                results,
              },
              null,
              2
            );
          }

          // Test basic connection (no auth)
          try {
            await axios.get(`${JIRA_BASE_URL}/status`, {
              validateStatus: () => true,
              timeout: 5000,
            });
            results.connection = "✅ Connected to Jira server";
          } catch (error: any) {
            results.connection = `❌ Connection failed: ${error.message}`;
            return JSON.stringify(
              {
                success: false,
                message: "Could not connect to Jira server",
                results,
              },
              null,
              2
            );
          }

          // Test authentication by fetching current user
          //   const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString(
          //     "base64"
          //   );

          const auth = Buffer.from(`${JIRA_USER}:${JIRA_PASSWORD}`).toString(
            "base64"
          );

          try {
            const myselfResponse = await axios.get(
              `${JIRA_BASE_URL}/rest/api/2/myself`,
              {
                headers: {
                  Authorization: `Basic ${auth}`,
                  Accept: "application/json",
                },
                validateStatus: () => true,
                timeout: 5000,
              }
            );

            if (myselfResponse.status === 200) {
              results.authentication = "✅ Authentication successful";
              results.myself = myselfResponse.data;
            } else {
              results.authentication = `❌ Authentication failed: ${myselfResponse.status} ${myselfResponse.statusText}`;
            }
          } catch (error: any) {
            results.authentication = `❌ Authentication request failed: ${error.message}`;
          }

          // Test project access
          try {
            const projectsResponse = await axios.get(
              `${JIRA_BASE_URL}/rest/api/2/project`,
              {
                headers: {
                  Authorization: `Basic ${auth}`,
                  Accept: "application/json",
                },
                validateStatus: () => true,
                timeout: 5000,
              }
            );

            if (projectsResponse.status === 200) {
              const projects = projectsResponse.data.map((p: any) => ({
                key: p.key,
                name: p.name,
              }));
              results.projects = projects;
            } else {
              results.projects = `❌ Project fetch failed: ${projectsResponse.status} ${projectsResponse.statusText}`;
            }
          } catch (error: any) {
            results.projects = `❌ Project request failed: ${error.message}`;
          }

          return JSON.stringify(
            {
              success:
                results.authentication === "✅ Authentication successful",
              message: "Jira connection diagnostic complete",
              results,
            },
            null,
            2
          );
        } catch (error: any) {
          logger.error(`❌ Error during Jira diagnostics:`, error.message);
          return JSON.stringify(
            {
              success: false,
              message: `Error during Jira diagnostics: ${error.message}`,
            },
            null,
            2
          );
        }
      },
    });
  }
}
