# SecureOps - Incident Response Platform

A comprehensive cybersecurity incident response platform with real-time threat intelligence, IOC management, and automated reporting.

## Features

- **Incident Management**: Create, track, and manage security incidents
- **IOC Database**: Store and analyze Indicators of Compromise
- **Threat Attribution**: AI-powered threat actor attribution
- **Real-time Notifications**: Stay updated on incident status
- **Report Generation**: Automated incident reports in multiple formats
- **Team Collaboration**: Assign incidents and collaborate with team members
- **Analytics Dashboard**: Visualize security metrics and trends

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Cache**: Redis
- **Authentication**: JWT
- **Container**: Docker & Docker Compose

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development)
- PostgreSQL 15+ (for local development)

## Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/secureops.git
   cd secureops
   ```

2. **Set up environment variables**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your configurations
   ```

3. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost
   - API: http://localhost:3000
   - pgAdmin: http://localhost:5050

5. **Default credentials**
   - Email: `admin@secureops.com`
   - Password: `admin123`

## Local Development Setup

### Backend Setup

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Set up PostgreSQL**
   ```sql
   CREATE DATABASE secureops;
   ```

3. **Run migrations**
   ```bash
   psql -U postgres -d secureops -f migrations/001-initial-schema.sql
   ```

4. **Start the server**
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Serve frontend files**
   ```bash
   cd frontend
   # Use any static file server
   npx serve -s . -p 8080
   ```

## API Documentation

### Authentication

**Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Register**
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "analyst"
}
```

### Incidents

**Get all incidents**
```http
GET /api/incidents
Authorization: Bearer <token>
```

**Create incident**
```http
POST /api/incidents
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Ransomware Attack",
  "description": "...",
  "organization": "Example Corp",
  "incidentDate": "2024-01-15T10:00:00Z",
  "type": "ransomware",
  "severity": "critical"
}
```

## Project Structure

```
secureops/
├── backend/
│   ├── src/
│   │   ├── config/        # Configuration files
│   │   ├── controllers/   # Route controllers
│   │   ├── middleware/    # Express middleware
│   │   ├── models/        # Database models
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   └── utils/         # Utility functions
│   ├── migrations/        # Database migrations
│   ├── uploads/          # File uploads
│   └── server.js         # Entry point
├── frontend/
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── assets/
├── docker-compose.yml
└── README.md
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | development |
| `PORT` | Server port | 3000 |
| `DB_HOST` | PostgreSQL host | localhost |
| `DB_PORT` | PostgreSQL port | 5432 |
| `DB_NAME` | Database name | secureops |
| `DB_USER` | Database user | postgres |
| `DB_PASSWORD` | Database password | - |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRE` | Token expiration | 7d |

## Testing

```bash
cd backend
npm test
```

## Production Deployment

1. **Update environment variables** for production
2. **Use HTTPS** with proper SSL certificates
3. **Set up reverse proxy** (Nginx)
4. **Enable firewall** rules
5. **Set up monitoring** and logging
6. **Regular backups** of database

## Security Considerations

- All passwords are hashed using bcrypt
- JWT tokens expire after 7 days
- Rate limiting enabled on API endpoints
- Input validation on all forms
- SQL injection protection via parameterized queries
- XSS protection headers enabled

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support, email support@secureops.com or create an issue in the repository.
