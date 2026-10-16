# Task Management System

A task management application built with **Laravel 12**, **React**, **MySQL**, and **JWT authentication**. The React frontend communicates with Laravel through a REST API.

## Features

- User registration, login, and logout
- JWT-based API authentication
- Role-based access for `admin` and `user`
- Create, view, update, and delete tasks
- Admins can view all tasks and assign tasks to themselves or other users
- Regular users can manage only their own tasks
- Search by task title, status filtering, and pagination
- Server-side validation and authorization

## Technology Stack

- Backend: PHP 8.2+, Laravel 12
- Authentication: `php-open-source-saver/jwt-auth`
- Database: MySQL
- Frontend: React, Vite, Bootstrap 5
- HTTP client: Axios
- Icons: Lucide React

## Requirements

Install PHP 8.2+, Composer, Node.js/npm, MySQL, and Git.

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/HaRiGovinD-PS/task-management.git
cd task-management
```

### 2. Install backend dependencies

```bash
composer install
```

### 3. Configure environment variables

Copy `.env.example` to `.env`.

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Update `.env` with your local settings. For example:

```.env
APP_NAME="Task Management"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=task_management
DB_USERNAME=root
DB_PASSWORD=

ADMIN_EMAIL=admin@gmail.com
ADMIN_PASSWORD=admin@123
```

Create a MySQL database named `task_management` first. Change the database username and password to match your environment.

### 4. Generate application and JWT secrets

```bash
php artisan key:generate
php artisan jwt:secret
```

### 5. Run migrations

```bash
php artisan migrate
```

### 6. Create the admin account

Configure `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`, then run:

```bash
php artisan db:seed --class=AdminUserSeeder
```

The seeder creates or updates the configured admin account.

### 7. Run the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Vite normally serves the frontend at `http://localhost:5173`.

### 8. Start Laravel

From the project root, run:

```bash
php artisan serve
```

Laravel normally serves the backend at `http://127.0.0.1:8000`. Keep both development servers running.

## Login

Open the frontend URL printed by Vite and sign in with the admin email and password configured in `.env`. Public registration creates regular `user` accounts; use the seeder to create the admin.

## API Endpoints

| Method | Endpoint | Description | Authentication |
|---|---|---|---|
| `POST` | `/register` | Register a user | Public |
| `POST` | `/login` | Log in and receive a JWT | Public |
| `GET` | `/me` | Get the authenticated user | Required |
| `POST` | `/logout` | Invalidate the current JWT | Required |
| `GET` | `/tasks` | List tasks; supports search, status filter, pagination | Required |
| `POST` | `/tasks` | Create a task | Required |
| `GET` | `/tasks/{id}` | View a task | Required |
| `PUT/PATCH` | `/tasks/{id}` | Update a task | Required |
| `DELETE` | `/tasks/{id}` | Delete a task | Required |
| `GET` | `/users` | List users for task assignment | Admin only |

Task list query parameters:
- `search`: search task titles
- `status`: `Pending`, `In Progress`, or `Completed`
- `page`: page number

Example: `GET /tasks?search=report&status=Pending&page=1`

For protected endpoints, include the token returned by `/login`:

```text
Authorization: Bearer YOUR_JWT_TOKEN
Accept: application/json
```

## Authorization Rules

- Public registration creates a regular `user`.
- Admins can list all tasks and assign tasks to any user.
- Regular users can list and manage only their own tasks.
- The `/users` endpoint is restricted to admins.
