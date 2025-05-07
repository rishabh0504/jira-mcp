import { Ollama } from "@langchain/ollama";
import {
  AgentExecutor,
  initializeAgentExecutorWithOptions,
} from "langchain/agents";
import { Service } from "typedi";
import winston from "winston";
import { sayHelloTool } from "../mcps/jira-mcp/services/sayHelloTool";
import { JsonOutputParser } from "@langchain/core/output_parsers";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.simple(),
  transports: [new winston.transports.Console()],
});

@Service()
export class OllamaService {
  private ollama: Ollama;
  private agentExecutor: AgentExecutor | null = null;
  private initializedPromise: Promise<void> | null = null;

  constructor() {
    this.ollama = new Ollama({
      model: "llama3.1:8b",
      temperature: 0,
      baseUrl: process.env.OLLAMA_HOST!,
    });
    this.initializedPromise = this.initializeAgent(); // Start initialization immediately
  }

  private async initializeAgent(): Promise<void> {
    try {
      this.agentExecutor = await initializeAgentExecutorWithOptions(
        [sayHelloTool],
        this.ollama,
        {
          agentType: "zero-shot-react-description",
          verbose: true,
        }
      );
      console.log("✅ Agent Executor Initialized");
    } catch (error) {
      logger.error("Error initializing agent:", error);
      throw new Error("Failed to initialize agent executor.");
    }
  }

  public async sayHello(name: string): Promise<string> {
    try {
      // Wait for the agent to be initialized
      await this.initializedPromise;

      logger.info(`Sending greeting request via agent for: "${name}"`);

      const result = await this.agentExecutor!.invoke({
        input: ` We have tool like say_hello, if you this is what user has requested, please use this tool with input as  { "name" : "${name}" }`,
      });

      logger.info(`Agent successfully returned result for "${name}"`);
      return this.cleanResult(result.output);
    } catch (error: any) {
      logger.error(`❌ Error while greeting: "${name}"`, {
        error: error.message,
      });
      throw new Error(`Failed to say hello: ${error.message}`);
    }
  }

  private cleanResult(responseText: string): string {
    try {
      const jsonMatch = responseText.match(/\{.*\}/s);
      if (jsonMatch) {
        const jsonPart = jsonMatch[0];
        const jsonResponse = JSON.parse(jsonPart);
        return jsonResponse.message || jsonResponse.toString();
      } else {
        return responseText.trim(); // Return plain text if no JSON
      }
    } catch (e) {
      logger.warn("Failed to parse response as JSON:", { responseText });
      return responseText.trim();
    }
  }
}
