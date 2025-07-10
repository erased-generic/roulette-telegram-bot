const { execSync } = require('child_process')

function gitRevision() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: __dirname }).toString().trim()
  } catch {
    return 'unknown'
  }
}

module.exports = {
  apps: [
    {
      name: 'roulette-telegram-bot',
      script: 'dist/src/bot.js',
      instances: 1,
      watch: false,
      autorestart: false,
      time: true,
      env: {
        GIT_COMMIT: gitRevision(),
      },
    },
  ],
}
