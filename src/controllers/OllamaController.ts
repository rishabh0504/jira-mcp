import { JsonController, Post } from "routing-controllers";
import { Service } from "typedi";
import { OllamaService } from "../../src/services/OllamaService";
import { Request, Response } from "express"; // Import Express types

@Service()
@JsonController("/ollama")
export class OllamaController {
  constructor(private readonly ollamaService: OllamaService) {}

  // Endpoint for testing translation functionality
  @Post("/translate")
  public async translate(req: Request, res: Response) {
    const { input, output_language } = req.body;

    if (!input || !output_language) {
      return res
        .status(400)
        .json({ error: "Missing input or output_language" });
    }

    try {
      const translation = await this.ollamaService.getTranslatedResponse(
        input,
        output_language
      );
      return res.json({ translation });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message });
    }
  }

  // Endpoint for testing general LLM completion functionality
  @Post("/complete")
  public async complete(req: Request, res: Response) {
    const { inputText } = req.body;

    if (!inputText) {
      console.error("❌ Missing 'inputText' in request body");
      return res
        .status(400)
        .json({ error: "Missing 'inputText' in request body" });
    }

    try {
      const completion = await this.ollamaService.getLLMCompletion(inputText);
      return res.json({ completion });
    } catch (error: any) {
      console.error("❌ Error during LLM completion:", error.message);
      return res
        .status(500)
        .json({ error: "Internal server error: " + error.message });
    }
  }
}
