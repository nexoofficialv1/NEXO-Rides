import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.astratechnologies.nexoride',
  appName: 'NEXO Ride',
  webDir: 'web',
  server: {
    // GitHub Actions will replace this with your live server URL during APK build.
    url: 'https://ride.nexoofficial.in/app/?v=1',
    cleartext: false
  }
};

export default config;
