import { z } from "zod";
import { DynamicStructuredTool } from "langchain/tools";

// Define the tool
export const sayHelloTool = new DynamicStructuredTool({
  name: "say_hello",
  description: "Greets a user by name",
  schema: z.object({
    name: z.string().describe("The name of the person to greet"), // Input schema validation
  }),
  func: async (item: any) => {
    console.log("====================================================", item);
    return { message: `Hello, ${item?.name}, I come from tools!` }; // Structured output
  },
});

// Use this tool in your AgentExecutor or agent workflow
