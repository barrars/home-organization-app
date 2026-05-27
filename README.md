# Home Organization App

## Overview
The Home Organization App is a full-stack application designed to help users manage their home inventory efficiently. It features a backend built with Express.js and MongoDB, and a frontend developed using React and Tailwind CSS.

## Project Structure
```
home-organization-app
├── backend
│   ├── src
│   │   ├── app.ts
│   │   ├── controllers
│   │   │   └── inventory.controller.ts
│   │   ├── models
│   │   │   └── inventory.model.ts
│   │   ├── routes
│   │   │   └── inventory.routes.ts
│   │   └── types
│   │       └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend
│   ├── public
│   │   └── index.html
│   ├── src
│   │   ├── components
│   │   │   ├── BulkInsertForm.tsx
│   │   │   ├── InventoryList.tsx
│   │   │   └── Navbar.tsx
│   │   ├── pages
│   │   │   ├── Home.tsx
│   │   │   └── Inventory.tsx
│   │   ├── services
│   │   │   └── api.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── tsconfig.json
└── README.md
```

## Features
- **Inventory Management**: Users can add, view, and manage their home inventory items.
- **Bulk Insert**: A feature that allows users to input multiple inventory records at once.
- **Responsive Design**: The frontend is built with Tailwind CSS for a modern and responsive user interface.

## Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- MongoDB (local or Atlas)

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd home-organization-app
   ```

2. Install backend dependencies:
   ```
   cd backend
   npm install
   ```

3. Install frontend dependencies:
   ```
   cd frontend
   npm install
   ```

### Running the Application

1. Start the backend server:
   ```
   cd backend
   npm start
   ```

2. Start the frontend application:
   ```
   cd frontend
   npm start
   ```

3. Open your browser and navigate to `http://localhost:3000` to access the application.

## Usage
- Use the navigation bar to access different sections of the app.
- On the Inventory page, you can add new items using the bulk insert form or view existing inventory records.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.