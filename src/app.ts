import dotenv from "dotenv";
import express from "express";
import "reflect-metadata";
import { useContainer, useExpressServer } from "routing-controllers";
import { Container } from "typedi";
import { McpServerService } from "./mcps/McpServer";

import { join } from "path";

// Load .env
dotenv.config();

// Setup IoC container
useContainer(Container);
// Setup Express
const app = express();
// app.use(express.json());

useExpressServer(app, {
  controllers: [join(__dirname, "/controllers/**/*.ts")],
  defaultErrorHandler: false,
});

// Start MCP Server
const mcpServerService = new McpServerService();
mcpServerService
  .start()
  .then(() => console.log("✅ MCP server initialized and running."))
  .catch((err: any) => console.error("❌ Failed to start MCP server:", err));

export default app;
