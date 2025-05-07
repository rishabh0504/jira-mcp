import { Body, JsonController, Post, Get } from "routing-controllers";
import { Service } from "typedi";
import winston from "winston";
import { JiraService } from "../../src/services/JiraService";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.simple(),
  transports: [new winston.transports.Console()],
});

@Service()
@JsonController("/jira")
export class JiraController {
  constructor(private readonly jiraService: JiraService) {}

  @Get("/debug")
  public async debugJiraConnection() {
    try {
      logger.info("Running Jira connection diagnostics from API endpoint");

      // const result = await this.jiraService.debugJiraConnection();

      // Parse the result if it's a JSON string
      // try {
      //   if (typeof result === "string") {
      //     return JSON.parse(result);
      //   }
      //   return result;
      // } catch (e) {
      //   return {
      //     success: false,
      //     message: "Failed to parse diagnostic results",
      //     data: result,
      //   };
      // }
      return true;
    } catch (error: any) {
      logger.error(`❌ Error in Jira debug endpoint:`, error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post("/interact")
  public async interactWithJira(@Body() body: { query: string }) {
    const { query } = body;

    if (!query) {
      logger.warn("❌ Missing 'query' in request body");
      return {
        success: false,
        error: "Missing 'query' in request body",
      };
    }

    try {
      logger.info(`Received Jira interaction request: "${query}"`);

      // Let the service determine the appropriate action
      const result = await this.jiraService.interactWithJira(query);

      logger.info(`Jira interaction completed successfully`);

      // Format the response
      let formattedResult;
      try {
        // If result is a string that contains JSON
        if (typeof result === "string" && result.trim().startsWith("{")) {
          formattedResult = JSON.parse(result);
        }
        // If result is already an object
        else if (typeof result === "object") {
          formattedResult = result;
        }
        // Plain string or other format
        else {
          formattedResult = { message: result };
        }
      } catch (e) {
        formattedResult = { message: result };
      }

      return {
        success: true,
        data: formattedResult,
      };
    } catch (error: any) {
      logger.error(`❌ Error in Jira interaction endpoint: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
