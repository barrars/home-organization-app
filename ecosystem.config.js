module.exports = {
  apps: [
    {
      name: 'home-org',
      script: 'npm',
      args: 'start',
      cwd: '/home/scott/home-organization-app',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        ALLOWED_ORIGINS: 'https://chores.dailydocket.org',
      },
    },
  ],
}
