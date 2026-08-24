import { defineConfig } from "vitest/config";
import {
  hostedIntegrationRequested,
  prepareHostedIntegrationEnvironment,
} from "./src/lib/hosted-test-readiness";

prepareHostedIntegrationEnvironment(process.env);
process.env.DATABASE_URL ??= "postgresql://localhost/careerpath_test";
process.env.JWT_SECRET ??= "test-only-jwt-secret";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    fileParallelism: !hostedIntegrationRequested(process.env),
  },
});
