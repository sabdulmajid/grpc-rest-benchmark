module.exports = {
  apps: [
    {
      name: "se464-lab",
      script: "./dist/main.js",
      args: "rest mysql",
      instances: 2,
      exec_mode: "cluster",
      env: {
        port: 3000,
      },
    },
  ],
};
