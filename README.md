# Admin Panel Frontend

Angular 17 application for the Admin Panel Dashboard of the MEAN Blog Platform.

## Features

- **Authentication**: Login for Admin and Editor roles
- **Dashboard**: Overview with analytics and charts
- **Article Management**: View, edit, and delete articles (Admin/Editor)
- **User Management**: Manage user roles and suspend/unsuspend accounts (Admin only)
- **Analytics**: View charts and analytics of articles

## Development

```bash
# Install dependencies
npm install

# Start development server (runs on port 4201)
npm start

# Build for production
npm run build
```

## Configuration

The API URL is configured in `src/environments/environment.ts`:
- Development: `http://localhost:4000/api`
- Production: Update `environment.production.ts`

## Default Admin Credentials

- Email: `admin@blogplateform.com`
- Password: `12345678`

## Port

The admin panel frontend runs on port **4201** to avoid conflicts with the main frontend (port 4200).
