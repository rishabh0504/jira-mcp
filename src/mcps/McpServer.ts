const {
  McpServer,
} = require("../../node_modules/@modelcontextprotocol/sdk/dist/cjs/server/mcp.js");
const {
  StdioServerTransport,
} = require("../../node_modules/@modelcontextprotocol/sdk/dist/cjs/server/stdio.js");

export class McpServerService {
  private server: any;

  constructor() {
    this.server = new McpServer({
      name: "Jira Integration MCP Server",
      version: "1.0.0",
    });
  }

  public async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log("✅ MCP server is running...");
  }
}
