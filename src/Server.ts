import "@tsed/platform-log-request"; // remove this import if you don&#x27;t want log request
import "@tsed/platform-express";
import "@tsed/ajv";
import "@tsed/swagger";

import { join } from "node:path";
import { Configuration } from "@tsed/di";
import { application } from "@tsed/platform-http";

import { PlatformCache } from "@tsed/platform-cache";
import redisStore from "cache-manager-ioredis";

import { config } from "./config";
import * as v1 from "./controllers/v1";
import { envs } from "./config/envs";
import { RedisShutdownService } from "./services/RedisShutdownService";

@Configuration({
  ...config,
  acceptMimes: ["application/json"],
  httpPort: process.env.PORT || 4001,
  httpsPort: false,
  mount: {
    "/v1": [...Object.values(v1)]
  },
  cache: {
    ttl: envs.REDIS_TTL,
    store: redisStore.create({ host: envs.REDIS_HOST, port: envs.REDIS_PORT }),
    prefix: process.env.NODE_ENV
  },
  imports: [PlatformCache, RedisShutdownService],
  swagger: [
    {
      path: "/v1/docs",
      specVersion: "3.0.1",
      pathPatterns: ["/v1/**"]
    }
  ],
  middlewares: [
    "cors",
    "cookie-parser",
    "compression",
    "method-override",
    "json-parser",
    { use: "urlencoded-parser", options: { extended: true } }
  ]
})
export class Server {
  protected app = application();
}
