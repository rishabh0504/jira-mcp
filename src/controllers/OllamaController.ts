import { JsonController, Post, Body } from "routing-controllers";
import { Service } from "typedi";
import { OllamaService } from "../../src/services/OllamaService";
import { Request, Response } from "express"; // Import Express types

@Service()
@JsonController("/ollama")
export class OllamaController {
  constructor(private readonly ollamaService: OllamaService) {}

  // Endpoint for testing general LLM completion functionality
  @Post("/complete")
  public async complete(@Body() body: { inputText: string }) {
    const { inputText } = body;

    if (!inputText) {
      return { error: "Missing 'inputText' in request body" };
    }

    try {
      const completion = await this.ollamaService.getJiraTickets(inputText);
      return { completion };
    } catch (error: any) {
      return { error: "Internal server error: " + error.message };
    }
  }
}
