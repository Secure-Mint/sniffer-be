import { Injectable, OnInit } from "@tsed/di";
import { PlatformCache } from "@tsed/platform-cache";

interface CacheWithClient {
  store?: {
    client?: {
      quit: () => Promise<void>;
    };
  };
}

@Injectable()
export class RedisShutdownService implements OnInit {
  constructor(private cache: PlatformCache) {}

  $onInit() {
    const quitRedis = async () => {
      const redisClient = (this.cache as CacheWithClient).store?.client;
      if (redisClient?.quit) {
        console.log("💥 Cleaning up Redis connection...");
        try {
          await redisClient.quit();
          console.log("✅ Redis connection closed");
        } catch (err) {
          console.warn("⚠️ Failed to close Redis:", err);
        }
      }
      process.exit(0);
    };

    // Bind to common signals
    process.once("SIGINT", quitRedis);
    process.once("SIGTERM", quitRedis);
    process.once("SIGUSR2", quitRedis); // for nodemon
  }
}
