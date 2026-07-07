import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.astratechnologies.nexoride',
  appName: 'NEXO Ride',
  webDir: 'web',
  server: {
    // GitHub Actions will replace this with your live server URL during APK build.
    url: 'https://your-nexo-ride-server.example.com/app/?v=112v13',
    cleartext: false
  }
};

export default config;
