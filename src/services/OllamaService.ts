import { Ollama } from "@langchain/ollama";
import { PromptTemplate } from "@langchain/core/prompts";
import { Service } from "typedi";

@Service()
export class OllamaService {
  private ollama: Ollama;
  private prompt: PromptTemplate;
  private chain: any;

  constructor() {
    // Initialize Ollama with model and configuration
    this.ollama = new Ollama({
      model: "gemma3:4b", // Or your preferred local model
      temperature: 0,
      maxRetries: 2,
      baseUrl: process.env.OLLAMA_HOST!, // Make sure this is set in your .env
    });

    // Creating a dynamic prompt template with LangChain
    this.prompt = PromptTemplate.fromTemplate(
      "How to say {input} in {output_language}:\n"
    );

    // Create a chain that connects the prompt template to the Ollama LLM
    this.chain = this.prompt.pipe(this.ollama);
  }

  // Translation using prompt
  public async getTranslatedResponse(
    inputText: string,
    outputLanguage: string
  ): Promise<string> {
    try {
      console.log(
        `Translating "${inputText}" to "${outputLanguage}" using LangChain prompt`
      );

      const response = await this.chain.invoke({
        input: inputText,
        output_language: outputLanguage,
      });

      console.log(`Translation result: ${response.text}`);
      return response.text;
    } catch (error) {
      console.error("Error while generating translation", error);
      throw new Error("Failed to generate translation.");
    }
  }

  // Raw LLM completion (no prompt)
  public async getLLMCompletion(inputText: string): Promise<string> {
    try {
      console.log(`📤 Sending to Ollama: "${inputText}"`);

      const result = await this.ollama.invoke(inputText);

      console.log(`📥 Ollama responded: "${result}"`);
      return result;
    } catch (error: any) {
      console.error(
        "❌ Error while generating LLM completion:",
        error.message || error
      );
      throw new Error("Failed to generate completion from Ollama.");
    }
  }
}
