# SpinChore 🧹

**A full-stack roommate chore management system built with React, Node.js, Express, and Supabase.**

SpinChore helps roommates organize household chores, distribute responsibilities fairly, track completion, and maintain a history of completed tasks. It combines a simple interactive interface with a backend-driven assignment system designed to keep household chores organized and transparent.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [How It Works](#how-it-works)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Database](#database)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)
- [Future Improvements](#future-improvements)
- [License](#license)

## Overview

Sharing a living space means sharing responsibilities. Without a clear system, chores can become repetitive, unevenly distributed, or easily forgotten.

SpinChore provides a centralized solution for managing roommates, maintaining a chore list, generating weekly assignments, tracking completed work, and reviewing historical activity.

The application follows a backend-first approach: the server manages assignment generation and persistence, while the frontend provides an interactive way to use and visualize the system.

## Features

### Roommate Management
- Add and manage roommates.
- Maintain an active roommate list.
- Keep assignments associated with the appropriate roommates.

### Chore Management
- Create and manage household chores.
- Assign difficulty levels to chores.
- Maintain a reusable list of available chores.

### Weekly Assignments
- Generate chore assignments for a week.
- Distribute chores across active roommates using the backend assignment logic.
- Account for changes in the household when regenerating eligible assignments.
- Prevent completed assignment history from being overwritten by unsafe regeneration.

### Interactive Spin Wheel
- Visualize roommate names through an animated spin wheel.
- Present assignment results through the frontend.
- Use backend-generated assignment data rather than independently deciding assignments in the browser.

### Completion Tracking
- Mark assigned chores as completed.
- Track completion timestamps.
- Preserve completed assignments as part of the historical record.

### Assignment History
- Retrieve assignment history for a roommate.
- Review previous assignments and completion status.
- Preserve past weeks when moving to a new assignment week.

### Persistent Storage
- Store application data in Supabase PostgreSQL.
- Keep assignment and completion information available after a page refresh.

## Tech Stack

| Technology | Purpose |
|---|---|
| React | Frontend user interface |
| Vite | Frontend development server and production build |
| JavaScript | Application logic |
| Tailwind CSS | UI styling |
| Node.js | Backend runtime |
| Express.js | REST API and request handling |
| Supabase | Managed PostgreSQL database |
| PostgreSQL | Persistent relational data storage |

## Architecture

SpinChore separates the user interface, backend business logic, and database.

```text
User
  |
  v
React + Vite Frontend
  |
  | HTTP requests
  v
Node.js + Express API
  |
  | Business logic and validation
  v
Supabase PostgreSQL
  |
  v
Persistent application data
```

**Frontend:** Handles user interactions, displays assignments, animates the wheel, and communicates with the API.

**Backend:** Validates requests, manages roommates and chores, generates weekly assignments, handles completion, and protects historical records.

**Database:** Stores persistent application data, including roommates, chores, assignments, and completion information according to the implemented schema.

## How It Works

### 1. Manage roommates and chores

Create the roommate list and add the household chores that need to be completed. Chores can include difficulty information used by the application's assignment logic.

### 2. Generate weekly assignments

The frontend requests assignments from the backend. The backend retrieves the relevant roommates and chores and applies the assignment-generation logic.

### 3. View the assignments

The weekly assignments are displayed in the dashboard. The spin wheel provides a visual way to present roommate names and assignment results.

### 4. Complete chores

When a roommate finishes a chore, the completion action is sent to the backend. The server updates the assignment and records its completion time.

### 5. Start another week

A new week receives its own assignments. Completed work from previous weeks should remain available as history instead of being overwritten.

### 6. Review history

The application can retrieve historical assignments for an individual roommate, making it easier to review previous responsibilities and completion records.

## Getting Started

### Prerequisites

Install the following before running the application:

- [Node.js](https://nodejs.org/) — use a version compatible with the project's dependencies.
- npm, included with Node.js.
- A [Supabase](https://supabase.com/) account and project.
- Git, if cloning the repository.

Check your installations:

```bash
node --version
npm --version
git --version
```

### 1. Clone the repository

Replace the placeholder URL with the actual GitHub repository URL.

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd <YOUR_REPOSITORY_FOLDER>
```

### 2. Install dependencies

Install the root dependencies if the root `package.json` defines the project's scripts and dependencies:

```bash
npm install
```

If the frontend and backend have separate `package.json` files and dependencies, install those as well:

```bash
cd backend
npm install
cd ../frontend
npm install
cd ..
```

Follow the actual folder structure of the repository; do not install dependencies in directories that do not contain a `package.json`.

### 3. Configure Supabase

1. Create a Supabase project.
2. Apply the SQL migrations included in the repository, using the migration instructions provided by the project.
3. Obtain the project URL and the appropriate server-side credential from your Supabase project settings.
4. Configure the backend environment variables as described below.

Do not run destructive SQL commands against a database containing data you want to preserve.

### 4. Configure environment variables

Create the environment files required by your application. Use the variable names expected by the actual source code.

Example backend `.env`:

```dotenv
PORT=3000
CORS_ORIGIN=http://localhost:5173
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_server_side_secret
```

Example frontend `.env`:

```dotenv
VITE_API_BASE_URL=http://localhost:3000
```

These are examples, not credentials. Keep the real values private.

If the repository uses different variable names, follow its implementation rather than copying these examples unchanged.

## Running the Application

Open separate terminals for the backend and frontend.

### Start the backend

From the repository root, use the backend script if one exists:

```bash
npm run dev:backend
```

Otherwise, navigate to the backend directory and run the development script defined in its `package.json`.

```bash
cd backend
npm run dev
```

### Start the frontend

In another terminal, use the root frontend script if available:

```bash
npm run dev:frontend
```

Otherwise:

```bash
cd frontend
npm run dev
```

Open the local URL printed by Vite, typically:

`http://localhost:5173`

The backend example above uses port `3000`. Confirm the configured port and frontend API base URL match your actual setup.

## API Documentation

The backend exposes REST endpoints for managing roommates, chores, weekly assignments, completion status, and history.

The following table lists the endpoint areas expected from the project's described functionality. **Verify every path and request format against the actual Express routes before treating this table as a definitive API reference.**

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Check whether the API is responding, if implemented |
| GET / POST | Roommate routes | Retrieve or create roommates |
| PATCH / PUT / DELETE | Roommate routes | Update or deactivate roommates, as implemented |
| GET / POST | Chore routes | Retrieve or create chores |
| PATCH / PUT / DELETE | Chore routes | Update or remove chores, as implemented |
| GET | `/assignments/current` | Retrieve current or selected weekly assignments |
| POST | `/assign/next-week` | Start the next assignment week |
| POST | Assignment completion route | Mark an assignment as completed |
| GET | `/history/:roommateId` | Retrieve assignment history for a roommate |

### API behavior

- Requests with invalid input should receive appropriate error responses.
- Assignment generation should be handled by the backend.
- Completed assignment history should be protected against accidental overwriting.
- Database operations should return clear success or error responses.

For exact request bodies, response examples, status codes, and all available routes, document the implementation from the backend route files and service functions.

## Database

SpinChore uses Supabase PostgreSQL for persistent data storage.

The database is responsible for retaining information such as:

- Roommates and their active status.
- Available chores and their attributes.
- Weekly chore assignments.
- Assignment completion status and timestamps.

The exact tables, columns, constraints, and relationships are defined by the SQL migrations included in the repository.

Apply migrations in the intended order when setting up a fresh database. Keep schema changes version-controlled so that the development environment can be recreated consistently.

## Testing

Automated tests help protect assignment behavior, API validation, persistence-related workflows, and frontend interactions.

Run the scripts defined by the repository's `package.json` files. For example, if these scripts exist:

```bash
npm test
```

Or run the backend and frontend suites independently from their respective directories.

### Recommended regression checks

- Adding a roommate and generating assignments.
- Ensuring the wheel does not show duplicate roommate names unintentionally.
- Generating a new week after the previous week's chores are completed.
- Refreshing the page and confirming that the selected week's assignments persist.
- Verifying that previous completion timestamps remain intact.
- Handling invalid requests and database errors.
- Building the frontend for production.

Use the actual test commands and test framework configured in the repository.

## Project Structure

The following is an illustrative structure. Adjust it to match the repository's real files and directories.

```text
SpinChore/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   └── services/
│   ├── test/
│   ├── migrations/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── ...
│   └── package.json
├── .gitignore
└── README.md
```

## Security Considerations

- Never commit `.env` files or live credentials.
- Keep Supabase service-role credentials exclusively on the server.
- Do not expose privileged database credentials through frontend variables prefixed with `VITE_`.
- Validate and sanitize user-controlled input on the backend.
- Configure CORS for the intended frontend origins.
- Avoid logging secrets or sensitive request data.
- Use appropriate database permissions and access controls.

## Troubleshooting

### Frontend cannot connect to the backend

- Confirm the backend is running.
- Check `VITE_API_BASE_URL`.
- Verify the backend port and CORS configuration.
- Restart the Vite development server after changing frontend environment variables.

### Database connection fails

- Check the Supabase project URL and server-side credential.
- Confirm that migrations have been applied.
- Verify the project's database availability and configuration.
- Check backend logs for the underlying error.

### Assignments do not persist after refreshing

- Confirm that the API returns the selected week's assignments.
- Check that the frontend requests the correct week.
- Inspect the backend response and database records.
- Verify that the assignment update operation succeeded.

### Tests fail

- Install dependencies in the correct directories.
- Configure the test environment as required.
- Review the first failing assertion and associated logs before changing application code.

## Future Improvements

Possible extensions include:

- More advanced fairness metrics across multiple weeks.
- Notifications and reminders for upcoming chores.
- User authentication and individual roommate accounts.
- Better filtering and reporting for assignment history.
- More comprehensive API integration tests.
- Accessibility improvements and additional mobile UI refinements.

These are potential future enhancements, not claims about currently implemented features.

## License

Made for learning purpose only by Debarpan Pal.

---

**Built as a practical full-stack project to explore REST API development, database persistence, assignment logic, and frontend–backend integration.**