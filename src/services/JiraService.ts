import { Service } from "typedi";
import { Ollama } from "@langchain/ollama";
import {
  AgentExecutor,
  initializeAgentExecutorWithOptions,
} from "langchain/agents";
import winston from "winston";
import { FetchJiraTicketsTool } from "../mcps/jira-mcp/services/FetchTicket";
import { CreateJiraTicketTool } from "../mcps/jira-mcp/services/CreateJira";
import { JiraDebugTool } from "../mcps/jira-mcp/services/JiraDebugTool";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.simple(),
  transports: [new winston.transports.Console()],
});

@Service()
export class JiraService {
  private ollama: Ollama;
  private agentExecutor: AgentExecutor | null = null;
  private fetchJiraTicketsTool: FetchJiraTicketsTool;
  private createJiraTicketTool: CreateJiraTicketTool;
  private jiraDebugTool: JiraDebugTool;

  constructor() {
    this.ollama = new Ollama({
      model: "llama3.2:3b", // Adjust model as needed
      temperature: 0,
      baseUrl: process.env.OLLAMA_HOST!,
    });

    this.fetchJiraTicketsTool = new FetchJiraTicketsTool();
    this.createJiraTicketTool = new CreateJiraTicketTool();
    this.jiraDebugTool = new JiraDebugTool();

    // Log environment variables safely (without revealing full API token)
    this.logEnvironmentSafely();
  }

  // Log environment variables in a safe way for debugging
  private logEnvironmentSafely() {
    const baseUrl = process.env.JIRA_BASE_URL || "NOT SET";
    const email = process.env.JIRA_EMAIL || "NOT SET";
    const apiTokenSet = process.env.JIRA_API_TOKEN ? "SET (hidden)" : "NOT SET";

    logger.info(`Jira configuration:`, {
      JIRA_BASE_URL: baseUrl,
      JIRA_EMAIL: email,
      JIRA_API_TOKEN: apiTokenSet,
    });
  }

  public async initializeAgent() {
    if (!this.agentExecutor) {
      // Initialize with all Jira tools including the debug tool
      this.agentExecutor = await initializeAgentExecutorWithOptions(
        [
          this.fetchJiraTicketsTool,
          this.createJiraTicketTool,
          this.jiraDebugTool,
        ],
        this.ollama,
        {
          agentType: "zero-shot-react-description",
          verbose: true,
        }
      );
      console.log("✅ Jira Agent Executor Initialized");
    }
  }

  // Method to diagnose Jira configuration issues
  public async debugJiraConnection(): Promise<any> {
    logger.info("Running Jira connection diagnostics");
    try {
      const result = await this.jiraDebugTool.invoke({ input: "" });
      return result;
    } catch (error: any) {
      logger.error("Jira diagnostics failed:", error.message);
      return `Failed to run Jira diagnostics: ${error.message}`;
    }
  }

  // Main method to interact with Jira based on natural language requests
  public async interactWithJira(query: string): Promise<any> {
    try {
      // Special case for debug requests
      if (
        query.toLowerCase().includes("debug") ||
        query.toLowerCase().includes("diagnose") ||
        query.toLowerCase().includes("test connection")
      ) {
        logger.info("Detected debug request, running diagnostics");
        return await this.debugJiraConnection();
      }

      // First, analyze the query to determine what Jira operation is needed
      const operation = await this.determineJiraOperation(query);

      // Direct invocation based on operation type
      if (operation.type === "fetch") {
        logger.info(
          `Direct invocation of fetch tickets for project: ${operation.projectKey}`
        );
        try {
          return await this.fetchJiraTicketsTool.invoke({
            input: operation.projectKey,
          });
        } catch (error: any) {
          logger.error(`Direct fetch failed: ${error.message}`);
          // Fall back to agent
          return await this.useJiraAgent(query);
        }
      } else if (operation.type === "create") {
        if (operation.isComplete) {
          logger.info(
            `Direct invocation of create ticket with: ${JSON.stringify(
              operation.ticketData
            )}`
          );
          try {
            return await this.createJiraTicketTool.invoke(operation.ticketData);
          } catch (error: any) {
            logger.error(`Direct create failed: ${error.message}`);
            // Fall back to agent
            return await this.useJiraAgent(query);
          }
        } else {
          // If we don't have complete data for creation, use the agent
          logger.info(`Incomplete ticket data, falling back to agent`);
          return await this.useJiraAgent(query);
        }
      } else {
        // For ambiguous or complex operations, use the agent
        logger.info(`Ambiguous operation, using Jira agent`);
        return await this.useJiraAgent(query);
      }
    } catch (error: any) {
      logger.error(`Error in Jira interaction: ${error.message}`);
      throw new Error(`Jira interaction failed: ${error.message}`);
    }
  }

  // Determine what Jira operation the user is trying to perform
  private async determineJiraOperation(query: string): Promise<any> {
    // Simple heuristic detection of fetch vs create operation
    const queryLower = query.toLowerCase();

    // Check for fetch-related keywords
    if (
      queryLower.includes("get") ||
      queryLower.includes("fetch") ||
      queryLower.includes("list") ||
      queryLower.includes("show") ||
      queryLower.includes("find") ||
      queryLower.includes("display")
    ) {
      // Try to extract project key - typically uppercase letters followed by dash or numbers
      const projectKeyMatch = query.match(/\b([A-Z]+(?:-\d+)?)\b/);
      const projectKey = projectKeyMatch ? projectKeyMatch[0] : "";

      return {
        type: "fetch",
        projectKey: projectKey || "UNKNOWN", // If no project key found, the agent will handle it
      };
    }
    // Check for create-related keywords
    else if (
      queryLower.includes("create") ||
      queryLower.includes("add") ||
      queryLower.includes("new") ||
      queryLower.includes("make")
    ) {
      // Try to extract project, summary, and description
      const projectKeyMatch = query.match(/\b([A-Z]+(?:-\d+)?)\b/);

      // Simplistic extraction - in production, you'd use NLP
      const summaryMatch =
        queryLower.includes("title:") || queryLower.includes("summary:");
      const descriptionMatch =
        queryLower.includes("description:") || queryLower.includes("details:");

      const projectKey = projectKeyMatch ? projectKeyMatch[0] : "";

      // Only attempt direct creation if we have all required fields
      const isComplete = !!projectKey && summaryMatch && descriptionMatch;

      let ticketData = {};
      if (isComplete) {
        const summaryPattern = /(title|summary):\s*([^,\.]+)/i;
        const descriptionPattern = /(description|details):\s*([^,\.]+)/i;

        const summaryMatch = query.match(summaryPattern);
        const descriptionMatch = query.match(descriptionPattern);

        ticketData = {
          project: projectKey,
          summary: summaryMatch ? summaryMatch[2].trim() : "",
          description: descriptionMatch ? descriptionMatch[2].trim() : "",
          issueType: queryLower.includes("bug") ? "Bug" : "Task",
        };
      }

      return {
        type: "create",
        isComplete,
        projectKey,
        ticketData,
      };
    }

    // Default - let the agent figure it out
    return {
      type: "unknown",
    };
  }

  // Use the LLM agent as a fallback for complex requests
  private async useJiraAgent(query: string): Promise<any> {
    if (!this.agentExecutor) {
      logger.info("Agent not initialized, initializing now");
      await this.initializeAgent();
    }

    if (this.agentExecutor) {
      logger.info(`Using Jira agent for: "${query}"`);

      try {
        const result = await this.agentExecutor.invoke({
          input: query,
        });

        logger.info(`Agent successfully processed Jira request`);
        return this.cleanResult(result.output);
      } catch (error: any) {
        logger.error(`Agent execution failed: ${error.message}`);
        throw new Error(`Failed to process Jira request: ${error.message}`);
      }
    } else {
      throw new Error("Failed to initialize Jira agent");
    }
  }

  // Clean up result formatting
  private cleanResult(responseText: string): any {
    try {
      // Try to find any JSON in the response
      const jsonMatch = responseText.match(/\{.*\}/s);
      if (jsonMatch) {
        const jsonPart = jsonMatch[0];
        return JSON.parse(jsonPart);
      }

      // If no JSON is found, return the plain text
      return responseText.trim();
    } catch (e) {
      logger.warn("Failed to parse response as JSON:", { responseText });
      return responseText.trim();
    }
  }
}
