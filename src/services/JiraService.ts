import { Ollama } from "@langchain/ollama";
import {
  AgentExecutor,
  initializeAgentExecutorWithOptions,
} from "langchain/agents";
import { Service } from "typedi";
import winston from "winston";
import { createJiraTicketTool } from "../mcps/jira-mcp/services/CreateJiraTicket";
import { fetchJiraTicketsTool } from "../mcps/jira-mcp/services/FetchTicket";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.simple(),
  transports: [new winston.transports.Console()],
});

@Service()
export class JiraService {
  private ollama: Ollama;
  private agentExecutor: AgentExecutor | null = null;

  constructor() {
    this.ollama = new Ollama({
      model: "llama3.1:8b", // Adjust model as needed
      temperature: 0,
      baseUrl: process.env.OLLAMA_HOST!,
    });
  }

  public async initializeAgent() {
    if (!this.agentExecutor) {
      // Initialize with all Jira tools including the debug tool
      this.agentExecutor = await initializeAgentExecutorWithOptions(
        [fetchJiraTicketsTool, createJiraTicketTool],
        this.ollama,
        {
          agentType: "zero-shot-react-description",
          verbose: true,
        }
      );
      console.log("✅ Jira Agent Executor Initialized");
    }
  }

  // Main method to interact with Jira based on natural language requests
  public async interactWithJira(query: string): Promise<any> {
    try {
      return await this.useJiraAgent(query);
    } catch (error: any) {
      logger.error(`Error in Jira interaction: ${error.message}`);
      throw new Error(`Jira interaction failed: ${error.message}`);
    }
  }

  private async useJiraAgent(query: string): Promise<any> {
    logger.info("useJiraAgent inside");
    if (!this.agentExecutor) {
      logger.info("Agent not initialized, initializing now");
      await this.initializeAgent();
    }

    if (this.agentExecutor) {
      logger.info(`Using Jira agent for: "${query}"`);

      try {
        const result = await this.agentExecutor!.invoke({
          input: `
          You have access to two tools:
          
          1. create_jira_ticket  
             Use this to create a new Jira issue of Epic/Story type only.  
             Expected input JSON:
             {
               "project": "string",             // Project key (e.g., "ENBDX")
               "summary": "string",             // Title of the issue
               "description": "string",         // Detailed description
               "issuetype": "string"            // Issue type (e.g., "Story", "Epic").
             }
        
          2. fetch_jira_tickets  
             Use this to fetch all tickets from a Jira project.  
             Expected input JSON:
             {
               "project_key": "string"          // The Jira project key
             }
          
          Your job:
          - Analyze the user query and determine the correct tool to use
          - Extract all required values
          - Respond with JSON only — in this exact format:
            {
              "tool": "create_jira_ticket" | "fetch_jira_tickets",
              "input": { ...tool-specific input fields... }
            }
          
          ⚠️ Output must be valid JSON. No comments, no extra text.
          User query:
          "${query}"
          `,
        });

        logger.info(`Agent successfully processed Jira request`);
        return result.output;
      } catch (error: any) {
        logger.error(`Agent execution failed: ${error.message}`);
        throw new Error(`Failed to process Jira request: ${error.message}`);
      }
    } else {
      throw new Error("Failed to initialize Jira agent");
    }
  }
}
