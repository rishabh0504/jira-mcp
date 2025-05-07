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
           Use this to create a new Jira issue of type "Story" or "Epic".

  
              Required JSON input:

                - For an "Epic":
                  {
                    "tool": "create_jira_ticket",
                    "input": {
                      "project": "string",
                      "summary": "string",
                      "description": "string",
                      "issuetype": "Epic",
                      "epic_name": "string"
                    }
                  }

                - For a "Story":
                  {
                    "tool": "create_jira_ticket",
                    "input": {
                      "project": "string",
                      "summary": "string",
                      "description": "string",
                      "issuetype": "Story"
                    }
                  }

                
 

        2. fetch_jira_tickets  
           Use this to fetch all tickets from a Jira project.  
           Expected input JSON:
           {
             "project_key": "string"            // The Jira project key
           }
        
        Your job:
        - Analyze the user query to determine which tool to use
        - Extract or infer all required values
        - Default to "Story" if issue type is not specified
        - If "issuetype" is "Epic", you **must** include the "epic_name" field (same as summary if not provided).
        - Respond with valid JSON only, in this exact format:
          {
            "tool": "create_jira_ticket" | "fetch_jira_tickets",
            "input": { ...tool-specific input fields... }
          }
        
        ⚠️ Output must be strictly valid JSON. No comments, explanations, markdown, or extra formatting.
        
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
