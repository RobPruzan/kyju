import { serve } from "@hono/node-server";

import { Hono, type MiddlewareHandler } from "hono";
import { type Server as HttpServer } from "node:http";

import { cors } from "hono/cors";
import { injectWebSocket } from "./inject-websocket";
export const createServer = () => {
  const app = new Hono();
  app.use("*", cors());

  const port = 4200;
  const hostname = "localhost";
  const $server = serve(
    {
      fetch: app.fetch,
      port,
      hostname,
    },
    (info) => {
      console.log(`Server is running on http://localhost:${info.port}`);
    }
  );

  const server = $server.listen(port, hostname);
  injectWebSocket(server as HttpServer); // safe assert // safe assert https://github.com/orgs/honojs/discussions/1781#discussioncomment-7827318
};
