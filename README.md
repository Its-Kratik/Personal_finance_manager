# Personal Finance Manager

A modern web application for tracking personal expenses built with Flask, SQLAlchemy, and vanilla JavaScript. Optimized for Render free-tier deployment.

## Features

- **User Authentication**: Secure login/register system
- **Expense Tracking**: Add, view, and delete expenses
- **Categories**: Organize expenses by categories
- **Analytics**: Visual charts showing spending patterns
- **Responsive Design**: Works on desktop and mobile
- **PWA Ready**: Installable web app

## Tech Stack

- **Backend**: Flask + SQLAlchemy + Gunicorn
- **Database**: SQLite (dev) / PostgreSQL (production)
- **Frontend**: HTML5 + CSS3 + Vanilla JavaScript
- **Charts**: Chart.js
- **Deployment**: Render

## Quick Start

### Local Development

1. Clone the repository
2. Create virtual environment:
python -m venv venv
source venv/bin/activate # On Windows: venv\Scripts\activate

text
3. Install dependencies:
pip install -r requirements.txt

text
4. Set environment variables:
cp .env.example .env

Edit .env with your settings
text
5. Run the application:
python controller.py

text

### Render Deployment

1. Fork this repository
2. Create a new Web Service on Render
3. Connect your GitHub repository
4. Configure deployment:
- **Build Command**: `chmod +x build.sh && ./build.sh`
- **Start Command**: `gunicorn controller:app`
- **Environment**: Add `SECRET_KEY` and `DATABASE_URL`
5. Create PostgreSQL database and link it

## Security Features

- Password hashing with Werkzeug
- Session-based authentication
- CSRF protection ready
- SQL injection prevention via SQLAlchemy
- Input validation and sanitization

## API Endpoints

- `POST /api/register` - User registration
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/categories` - Get categories
- `GET /api/expenses` - Get expenses (with filters)
- `POST /api/expenses` - Add expense
- `DELETE /api/expenses/<id>` - Delete expense
- `GET /api/summary` - Get analytics summary

## Environment Variables

- `SECRET_KEY`: Flask secret key for sessions
- `DATABASE_URL`: PostgreSQL connection string (production)
- `FLASK_ENV`: Environment (development/production)
- `LOG_LEVEL`: Logging level (INFO/DEBUG/ERROR)

## License

MIT License - see LICENSE file for details.
