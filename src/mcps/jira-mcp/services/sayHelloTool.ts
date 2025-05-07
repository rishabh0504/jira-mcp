import { DynamicStructuredTool } from "langchain/tools";

// Define the tool
export const sayHelloTool = new DynamicStructuredTool({
  name: "say_hello",
  description: "Greets a user by name",
  schema: {},
  func: async (name: any) => {
    console.log("===============================>>>", name);
    return `Hello, ${name}, I come from tools!`;
  },
  returnDirect: true,
});
