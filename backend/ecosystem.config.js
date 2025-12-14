// PM2 配置文件 - 用于进程管理和自动重启
module.exports = {
  apps: [{
    name: 'xg-windsurf-api',
    script: 'src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
