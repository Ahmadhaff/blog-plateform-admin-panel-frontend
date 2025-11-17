export const environment = {
  production: true,
  apiUrl: 'https://blog-plateform-admin-panel-backend.onrender.com/api',
  platformApiUrl: 'https://blog-plateform-plateform-backend.onrender.com/api', // Platform server for notifications
  socketUrl: 'https://blog-plateform-websocket-backend.onrender.com' // WebSocket server URL (Socket.IO handles wss:// automatically)
};

// Log to verify production environment is loaded
console.log('✅ Production environment loaded:', {
  apiUrl: environment.apiUrl,
  platformApiUrl: environment.platformApiUrl,
  socketUrl: environment.socketUrl
});

