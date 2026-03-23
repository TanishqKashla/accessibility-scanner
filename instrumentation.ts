export async function register() {
  // Validate environment variables once at server startup
  const { validateEnv } = await import("./lib/env");
  validateEnv();
}
