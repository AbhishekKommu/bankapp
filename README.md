# NovaBank — Banking Management System

A full-stack banking management system built with **Flask**, **SQLite**, and
vanilla **HTML/CSS/JavaScript**. It includes user registration & login,
multi-account management, deposits, withdrawals, transfers between accounts,
and a REST API that powers a clean, responsive dashboard.

## Tech Stack

| Layer      | Technology                                   |
|------------|-----------------------------------------------|
| Backend    | Python, Flask, Flask-Login, Flask-SQLAlchemy   |
| Database   | SQLite                                         |
| Frontend   | HTML5, CSS3 (custom, no framework), vanilla JS |
| Auth       | Session-based auth with hashed passwords       |

## Project Structure

```
bankapp/
├── app.py                 # Flask app factory / entry point
├── config.py               # App configuration
├── extensions.py            # db, login_manager, cors instances
├── models.py                # User, Account, Transaction models
├── requirements.txt
├── routes/
│   ├── auth.py              # /api/auth/*        (register, login, logout, me)
│   ├── accounts.py          # /api/accounts/*    (CRUD)
│   ├── transactions.py      # /api/transactions/* (deposit, withdraw, transfer)
│   └── pages.py             # server-rendered page routes
├── templates/
│   ├── login.html
│   ├── register.html
│   └── dashboard.html
├── static/
│   ├── css/style.css
│   ├── js/auth.js
│   ├── js/dashboard.js
│   └── images/logo.svg
└── database/                # bank.db (SQLite) is created here automatically
```

## Setup & Run

```bash
# 1. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the app
python app.py
```

The app runs at **http://localhost:5000**. The SQLite database
(`database/bank.db`) and all tables are created automatically on first run.

Optional: set a custom secret key before running in production:

```bash
export SECRET_KEY="a-long-random-string"
```

## REST API Reference

All request/response bodies are JSON. Authenticated endpoints use a secure
session cookie set on login — the frontend already sends `credentials:
same-origin` with every request.

### Auth — `/api/auth`
| Method | Endpoint    | Description                     |
|--------|-------------|----------------------------------|
| POST   | `/register` | Create a new user                |
| POST   | `/login`    | Log in, starts a session          |
| POST   | `/logout`   | Log out (auth required)           |
| GET    | `/me`       | Get current user profile          |

### Accounts — `/api/accounts` (all require auth)
| Method | Endpoint                       | Description                     |
|--------|---------------------------------|----------------------------------|
| GET    | `/`                              | List the current user's accounts |
| POST   | `/`                              | Open a new account                |
| GET    | `/<id>`                          | Get one account                   |
| PUT    | `/<id>`                          | Update account type / active flag |
| DELETE | `/<id>`                          | Close an account (balance must be 0) |
| GET    | `/<id>/transactions`             | List an account's transactions    |

### Transactions — `/api/transactions` (all require auth)
| Method | Endpoint    | Body                                                       |
|--------|-------------|--------------------------------------------------------------|
| POST   | `/deposit`  | `{ account_id, amount, description? }`                       |
| POST   | `/withdraw` | `{ account_id, amount, description? }`                       |
| POST   | `/transfer` | `{ from_account_id, to_account_number, amount, description? }` |

## Security Notes

- Passwords are hashed with Werkzeug's `generate_password_hash` (never stored in plain text).
- Sessions are HTTP-only, `SameSite=Lax` cookies managed by Flask-Login.
- Every account/transaction endpoint scopes queries to `current_user.id`, so
  users can only see and modify their own accounts.
- Server-side validation guards against negative amounts, overdrafts, and
  self-transfers.

## Notes for Production

- Set `SECRET_KEY` via environment variable and disable `debug=True`.
- Put the app behind a WSGI server (gunicorn/uwsgi) and a reverse proxy.
- Swap SQLite for PostgreSQL/MySQL by changing `DATABASE_URL`.
