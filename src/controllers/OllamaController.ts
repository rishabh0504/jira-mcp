import { Body, JsonController, Post } from "routing-controllers";
import { Service } from "typedi";
import winston from "winston";
import { OllamaService } from "../../src/services/OllamaService";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.simple(),
  transports: [new winston.transports.Console()],
});

@Service()
@JsonController("/ollama")
export class OllamaController {
  constructor(private readonly ollamaService: OllamaService) {}

  @Post("/complete")
  public async complete(@Body() body: { query: string }) {
    const { query } = body;

    if (!query) {
      logger.warn("❌ Missing 'query' in request body");
      return { error: "Missing 'query' in request body" };
    }

    try {
      logger.info("Received greeting request", { name: query });

      // Call the service method to say hello
      const result = await this.ollamaService.sayHello(query);

      logger.info("Greeting completed successfully", {
        name: query,
        result,
      });

      // Format the response in a consistent way
      return {
        success: true,
        message: result,
      };
    } catch (error: any) {
      logger.error(`❌ Error in greeting endpoint: ${error.message}`, {
        name: query,
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
