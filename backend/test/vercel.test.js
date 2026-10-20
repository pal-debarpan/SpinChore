import { describe, it, expect, beforeAll } from "vitest";
import handler from "../../api/index.js";

describe("Vercel Serverless Handler", () => {
  beforeAll(() => {
    process.env.SKIP_DB = "true";
  });

  it("successfully responds to /api/health", async () => {
    let statusCode = 200;
    let headers = {};
    let responseBody = null;

    const req = {
      method: "GET",
      url: "/api/health",
      headers: { host: "localhost" },
    };

    const res = {
      statusCode: 200,
      setHeader: (key, val) => {
        headers[key] = val;
      },
      getHeader: (key) => headers[key],
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: (data) => {
        responseBody = data;
        return res;
      },
      end: (chunk) => {
        if (chunk && !responseBody) {
          try {
            responseBody = JSON.parse(chunk);
          } catch {
            responseBody = chunk;
          }
        }
        return res;
      },
    };

    await handler(req, res);

    expect(statusCode).toBe(200);
    expect(responseBody?.data?.ok).toBe(true);
    expect(responseBody?.data?.service).toBe("spinchore-api");
  });
});
