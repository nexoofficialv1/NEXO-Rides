module.exports = {
  apps: [
    {
      name: 'nexo-ride',
      script: 'server.js',
      cwd: '/var/www/nexo-ride/current',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '350M',
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: 3333,
        DATA_DIR: '/var/www/nexo-ride/current/data',
        UPLOAD_DIR: '/var/www/nexo-ride/current/data/uploads',
        SERVER_URL: 'https://ride.nexoofficial.in',
        DOMAIN_NAME: 'ride.nexoofficial.in',
        DEPLOY_PROVIDER: 'VPS'
      },
      error_file: '/var/log/nexo-ride/error.log',
      out_file: '/var/log/nexo-ride/out.log',
      time: true
    }
  ]
};
