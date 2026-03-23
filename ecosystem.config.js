module.exports = {
  apps: [
    {
      name: "web",
      script: "node_modules/.bin/next",
      args: "start",
      instances: 1,
      env: {
        PORT: 3000,
        NODE_ENV: "production",
      },
      max_memory_restart: "512M",
      error_file: "./logs/web-error.log",
      out_file: "./logs/web-out.log",
      merge_logs: true,
      restart_delay: 5000,
      max_restarts: 10,
    },
    {
      name: "workers",
      script: "node_modules/.bin/tsx",
      args: "workers/index.ts",
      instances: 1,
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: "1G",
      error_file: "./logs/workers-error.log",
      out_file: "./logs/workers-out.log",
      merge_logs: true,
      restart_delay: 5000,
      max_restarts: 10,
    },
  ],
};
