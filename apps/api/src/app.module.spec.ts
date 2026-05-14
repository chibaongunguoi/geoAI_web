import { Test } from "@nestjs/testing";
import { AppModule } from "./app.module";

describe("AppModule", () => {
  it("compiles all module-level guard dependencies", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    await moduleRef.close();
  });
});
