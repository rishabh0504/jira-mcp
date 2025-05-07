import { Body, JsonController, Post } from "routing-controllers";
import { Service } from "typedi";
import winston from "winston";
import { OllamaService } from "../../src/services/OllamaService";
const logger = winston.createLogger({
  level: "info", // Change the level as needed (info, debug, error)
  format: winston.format.simple(),
  transports: [
    new winston.transports.Console(),
    // Optionally, you can add a file transport
    // new winston.transports.File({ filename: 'combined.log' })
  ],
});
@Service()
@JsonController("/ollama")
export class OllamaController {
  constructor(private readonly ollamaService: OllamaService) {}

  // Endpoint for testing general LLM completion functionality
  @Post("/complete")
  public async complete(@Body() body: { inputText: string }) {
    const { inputText } = body;

    // Log when inputText is missing
    if (!inputText) {
      logger.warn("❌ Missing 'inputText' in request body");
      return { error: "Missing 'inputText' in request body" };
    }

    try {
      // Log the inputText received and the initiation of Jira ticket fetch
      logger.info("Received inputText, initiating Jira ticket fetch.", {
        inputText,
      });

      // Call the service method to fetch Jira tickets
      const completion = await this.ollamaService.getJiraTickets(inputText);

      // Log the success of the Jira ticket fetch
      logger.info("Jira tickets successfully fetched.", {
        inputText,
        completion,
      });

      return { completion };
    } catch (error: any) {
      // Log error when something goes wrong
      logger.error(
        `❌ Error occurred while fetching Jira tickets: ${error.message}`,
        {
          inputText,
          error: error.message,
        }
      );
      return { error: "Internal server error: " + error.message };
    }
  }
}
