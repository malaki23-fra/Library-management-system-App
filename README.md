# Library Management System

Full-stack Library Management System built with **React** (frontend) and **Express.js + SQLite** (backend).

## Features

### Book Management
- Add, update, and delete books (Title, Author, Genre, ISBN, Quantity)
- Track stock levels
- Highlight low-stock books (< 2 copies)

### Availability & Transactions
- Add stock when new books arrive
- Borrow books (deduct stock)
- Return books (restore stock)
- Full transaction history log

### User Management
- Login system with JWT authentication
- Admin can add / update / delete users
- Roles: `admin` and `member`

### Dashboard
- Overview stats (total books, stock, low stock, users)
- Book availability table
- Recent transactions

## Project Structure

```
library-app/
├── frontend/          # React (Vite) application
│   ├── src/
│   │   ├── components/
│   │   ├── context/   # AuthContext
│   │   ├── pages/     # Dashboard, Books, Transactions, Users, Login
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── backend/           # Express + SQLite
│   ├── db.js          # Database setup & seeding
│   ├── server.js      # API routes
│   └── package.json
└── README.md
```

## Prerequisites

- Node.js 18+ and npm

## Setup & Run

### Run the app

```bash
cd frontend
npm install
npm run build
cd ../backend
npm install
npm start
```

Open **http://localhost:5002**. The backend serves the browser app and API from the same address.

Default admin credentials (created on first run):
- **Membership ID:** `ADMIN001`
- **Password:** `admin123`

### Optional development mode

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on **http://localhost:3001**

The Vite dev server proxies `/api` requests to the backend on port 5002. Choose **Database** in the sidebar to view live records from `backend/library.db`.

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | Login | Public |
| GET | `/api/books` | List all books | Public |
| POST | `/api/books` | Create book | Admin |
| PUT | `/api/books/:id` | Update book | Admin |
| DELETE | `/api/books/:id` | Delete book | Admin |
| GET | `/api/transactions` | List transactions | Auth |
| POST | `/api/transactions/add-stock` | Add stock | Admin |
| POST | `/api/transactions/borrow` | Borrow book | Auth |
| POST | `/api/transactions/return` | Return book | Auth |
| GET | `/api/users` | List users | Admin |
| POST | `/api/users` | Create user | Admin |
| PUT | `/api/users/:id` | Update user | Admin |
| DELETE | `/api/users/:id` | Delete user | Admin |
| GET | `/api/dashboard` | Dashboard stats | Auth |

## Technology Stack

- **Frontend:** React 18, React Router, Hooks, CSS
- **Backend:** Express.js, better-sqlite3, bcryptjs, jsonwebtoken, cors
- **Database:** SQLite (file-based, auto-created)

## Notes

- SQLite is used for simplicity and zero-config setup. The schema and queries are standard SQL and can be adapted to MySQL/PostgreSQL if required.
- All protected routes require a JWT token in the `Authorization: Bearer <token>` header.
- Low-stock books (quantity < 2) are highlighted in yellow on the Dashboard and Books pages.

## Submission

This project contains:
- `frontend/` – React application
- `backend/` – Express + SQLite backend


## Install on Node.js 24

Backend: open a terminal in `backend`, then run `npm install` and `npm start`.
Frontend: open a second terminal in `frontend`, then run `npm install` and `npm run dev`.

The backend uses a newer `better-sqlite3` version to address Node.js 24 install compatibility.
