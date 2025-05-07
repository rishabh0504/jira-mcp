import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

export function wrapLangChainTool<T extends z.ZodTypeAny>(
  tool: DynamicStructuredTool<T, any>
) {
  return {
    name: tool.name,
    description: tool.description,
    schema: tool.schema,
    run: async (input: z.infer<T>) => {
      return tool.func(input);
    },
  };
}
