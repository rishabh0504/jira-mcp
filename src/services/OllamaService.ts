import { Ollama } from "@langchain/ollama";
import { AgentExecutor, initializeAgentExecutor } from "langchain/agents";
import { Service } from "typedi";
import { FetchJiraTicketsTool } from "../mcps/jira-mcp/services/FetchTicket";

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
      if (!this.agentExecutor) {
        await this.initializeAgent(); // Ensure the agent is initialized before invoking
      }

      if (this.agentExecutor) {
        console.log(`Fetching Jira tickets for project key: "${projectKey}"`);

        // Execute the agent with the provided project key
        const toolInput = { projectKey };
        const result = await this.agentExecutor.invoke(toolInput);

        console.log(`Jira tickets: ${result}`);
        return result;
      } else {
        throw new Error("AgentExecutor is not initialized.");
      }
    } catch (error) {
      console.error("Error while fetching Jira tickets", error);
      throw new Error("Failed to fetch Jira tickets.");
    }
  }
}
