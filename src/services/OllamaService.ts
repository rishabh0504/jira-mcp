import { Ollama } from "@langchain/ollama";
import {
  AgentExecutor,
  initializeAgentExecutorWithOptions,
} from "langchain/agents";
import { Service } from "typedi";
import winston from "winston";
import { sayHelloTool } from "../mcps/jira-mcp/services/sayHelloTool";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.simple(),
  transports: [new winston.transports.Console()],
});

@Service()
export class OllamaService {
  private ollama: Ollama;
  private agentExecutor: AgentExecutor | null = null;

  constructor() {
    this.ollama = new Ollama({
      model: "llama3.2:3b",
      temperature: 0,
      baseUrl: process.env.OLLAMA_HOST!,
    });
  }

  public async initializeAgent() {
    if (!this.agentExecutor) {
      this.agentExecutor = await initializeAgentExecutorWithOptions(
        [sayHelloTool],
        this.ollama,
        {
          agentType: "zero-shot-react-description",
          verbose: true,
        }
      );
      console.log("✅ Agent Executor Initialized");
    }
  }

  public async sayHello(name: string): Promise<any> {
    try {
      // Try direct tool invocation first (safer approach)
      try {
        logger.info(`Directly invoking sayHelloTool for: "${name}"`);
        const directResult = await sayHelloTool.invoke({ name });
        logger.info(`Direct tool invocation successful for: "${name}"`);
        return directResult.message || directResult;
      } catch (directError: any) {
        logger.warn(
          `Direct tool invocation failed, falling back to agent: ${directError?.message}`
        );

        // Initialize agent if needed
        if (!this.agentExecutor) {
          logger.info("AgentExecutor is not initialized, initializing agent.");
          await this.initializeAgent();
        }

        if (this.agentExecutor) {
          logger.info(`Sending greeting request via agent for: "${name}"`);

          // Be very explicit about how to use the tool
          const result = await this.agentExecutor.invoke({
            input: `I need to greet someone named ${name}. Use the say_hello tool with an object that has a name property: {name: "${name}"}`,
          });

          logger.info(
            `Successfully processed greeting request via agent for: "${name}"`
          );

          // Return the clean result
          return this.cleanResult(result.output);
        } else {
          logger.error("AgentExecutor is not initialized.");
          throw new Error("AgentExecutor is not initialized.");
        }
      }
    } catch (error: any) {
      logger.error(`❌ Error while greeting: "${name}"`, {
        error: error.message,
      });
      throw new Error(`Failed to say hello: ${error.message}`);
    }
  }

  private cleanResult(responseText: string): string {
    try {
      // Try to find any JSON in the response
      const jsonMatch = responseText.match(/\{.*\}/s);
      if (jsonMatch) {
        const jsonPart = jsonMatch[0];
        const jsonResponse = JSON.parse(jsonPart);
        return jsonResponse.message || jsonResponse.toString();
      }

      // If no JSON is found, return the plain text
      return responseText.trim();
    } catch (e) {
      logger.warn("Failed to parse response as JSON:", { responseText });
      return responseText.trim();
    }
  }
}
