// src/types/modelcontextprotocol-sdk.d.ts

declare module "@modelcontextprotocol/sdk" {
  export class JiraClient {
    constructor(config: {
      baseUrl: string;
      auth: { email: string; apiToken: string };
    });

    search(query: { jql: string }): Promise<any[]>;
    get(issueKey: string): Promise<any>;
    create(issueData: any): Promise<{ key: string }>;
  }
}

declare module "@modelcontextprotocol/sdk/server/mcp.js" {
  export class McpServer {
    constructor(config: { name: string; version: string });
    tool(name: string, handler: (args: any) => any): void;
    connect(transport: any): Promise<void>;
  }
}

declare module "@modelcontextprotocol/sdk/server/stdio.js" {
  export class StdioServerTransport {
    constructor();
  }
}

declare module "./jira-mcp/JiraTools.js" {
  export const CreateJiraIssueTool: { func: (args: any) => Promise<any> };
  export const FetchJiraTicketByIdTool: { func: (args: any) => Promise<any> };
  export const FetchJiraTicketsTool: { func: (args: any) => Promise<any> };
}
