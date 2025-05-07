import { Service } from "typedi";

@Service()
export class HelloService {
  getMessage(): string {
    return "Hello from Service!";
  }
}
