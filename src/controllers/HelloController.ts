import { JsonController, Get } from "routing-controllers";
import { Service } from "typedi";

@Service()
@JsonController("/hello")
export class HelloController {
  @Get("/")
  sayHello() {
    return { message: "Hello from controller!" };
  }
}
