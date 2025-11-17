export const environment = {
  production: false,
  apiUrl: 'http://localhost:4000/api',
  platformApiUrl: 'http://localhost:3000/api', // Platform server for notifications
  socketUrl: 'http://localhost:3001' // WebSocket server URL
};

// Log to verify development environment is loaded
console.log('⚠️ Development environment loaded:', {
  apiUrl: environment.apiUrl,
  platformApiUrl: environment.platformApiUrl,
  socketUrl: environment.socketUrl
});

