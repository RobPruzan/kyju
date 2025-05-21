// @ts-nocheck
import { serve } from "bun";

serve({
  port: 7001,
  async fetch(req) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    try {
      const file = Bun.file("/Users/robby/kyju/dist/index.js");
      console.log("file", file);

      if (!(await file.exists())) {
        console.log("nope", file);

        return new Response("Not found", { status: 404, headers: corsHeaders });
      }
      return new Response(file.stream(), {
        headers: {
          "Content-Type": "application/javascript",
          ...corsHeaders,
        },
      });
    } catch (error) {
      return new Response("Internal Server Error", { status: 500, headers: corsHeaders });
    }
  },
});
