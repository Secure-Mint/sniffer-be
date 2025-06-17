import { Controller } from "@tsed/di";
import { Get } from "@tsed/schema";

@Controller("/health")
export class HealthController {
  @Get("/")
  get() {
    return "Sniffer is alive and well!";
  }
}
