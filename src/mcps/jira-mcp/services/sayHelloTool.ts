import { DynamicStructuredTool } from "langchain/tools";

// Define the tool
export const sayHelloTool = new DynamicStructuredTool({
  name: "say_hello",
  description: "Greets a user by name",
  schema: {},
  func: async (input: any) => {
    const user = JSON.parse(input);
    console.log("===============================>>>", user);
    return `Hello, ${user.name}, I come from tools!`;
  },
  returnDirect: true,
});
