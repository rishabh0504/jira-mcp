import { Ollama } from "@langchain/ollama";
import { AgentExecutor, initializeAgentExecutor } from "langchain/agents";
import { Service } from "typedi";
import winston from "winston";
import { FetchJiraTicketsTool } from "../mcps/jira-mcp/services/FetchTicket";
const logger = winston.createLogger({
  level: "info", // Change the level as needed (info, debug, error)
  format: winston.format.simple(),
  transports: [
    new winston.transports.Console(),
    // Optionally, you can add a file transport
    // new winston.transports.File({ filename: 'combined.log' })
  ],
});
// Define your service class@Service()
@Service()
export class OllamaService {
  private ollama: Ollama;
  private tool: FetchJiraTicketsTool;
  private agentExecutor: AgentExecutor | null = null;

  constructor() {
    this.ollama = new Ollama({
      model: "gemma3:4b", // Use your preferred model
      temperature: 0,
      maxRetries: 2,
      baseUrl: process.env.OLLAMA_HOST!,
    });

    this.tool = new FetchJiraTicketsTool();
  }

  // Initialize the agent executor asynchronously
  public async initializeAgent() {
    if (!this.agentExecutor) {
      this.agentExecutor = await initializeAgentExecutor(
        [this.tool],
        this.ollama,
        "zero-shot-react-description"
      );
      console.log("✅ Agent Executor Initialized");
    }
  }

  // Fetch Jira tickets using the agent executor
  public async getJiraTickets(projectKey: string): Promise<any> {
    try {
      // Log when checking if agentExecutor is initialized
      if (!this.agentExecutor) {
        logger.info("AgentExecutor is not initialized, initializing agent.");
        await this.initializeAgent(); // Ensure the agent is initialized before invoking
      }

      if (this.agentExecutor) {
        // Log when starting the Jira ticket fetch
        logger.info(`Fetching Jira tickets for project key: "${projectKey}"`);

        // Execute the agent with the provided project key
        const toolInput = { input: projectKey };
        const result = await this.agentExecutor.invoke(toolInput);

        // Log the fetched Jira tickets (or any relevant result)
        logger.info(
          `Jira tickets successfully fetched for project key: "${projectKey}"`,
          {
            result, // Log the actual result (ticket data)
          }
        );

        return result;
      } else {
        logger.error("AgentExecutor is not initialized.");
        throw new Error("AgentExecutor is not initialized.");
      }
    } catch (error: any) {
      // Log the error with the projectKey that caused it
      logger.error(
        `❌ Error while fetching Jira tickets for project key: "${projectKey}"`,
        {
          error: error.message,
        }
      );

      throw new Error("Failed to fetch Jira tickets.");
    }
  }
}
