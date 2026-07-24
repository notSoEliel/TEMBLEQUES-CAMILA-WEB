import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createTemblequesMcpServer } from "./server.js";

const server = createTemblequesMcpServer();
const transport = new StdioServerTransport();
await server.connect(transport);
