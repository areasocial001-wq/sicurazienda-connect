import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.f2367ac0837941b58b34174852585767',
  appName: 'SicurAzienda',
  webDir: 'dist',
  server: {
    url: 'https://f2367ac0-8379-41b5-8b34-174852585767.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#FFD700',
      showSpinner: false
    }
  }
};

export default config;