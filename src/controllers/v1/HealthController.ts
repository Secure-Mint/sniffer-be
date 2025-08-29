import { Controller } from "@tsed/di";
import { Get } from "@tsed/schema";

@Controller("/health")
export class HealthController {
  @Get("/")
  get() {
    return "Snifra is alive and well!";
  }
}
