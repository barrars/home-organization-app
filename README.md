# GetOrganized — Home Inventory & Organization App

> **Your entire world, catalogued.** A flexible, collaborative inventory system built around the structure of a home — but powerful enough for any collection, hobby, or household project.

> 📄 **[View the visual overview →](https://htmlpreview.github.io/?https://github.com/barrars/home-organization-app/blob/master/docs/overview.html)**

---

## What Is This?

GetOrganized is a full-stack web application that turns any space — real or imagined — into a searchable, shareable database. The core model is simple: you have a **Home**, a Home has **Rooms**, and Rooms hold **Items**. That hierarchy sounds humble until you realize it can model almost anything.

**Real-world use cases:**
- Index your fishing lure collection by type and lure box (room)
- Catalog your camping gear stored across multiple totes and bags
- Track your CD, DVD, vinyl, or book collection by shelf or genre
- Manage household inventory and know exactly where things are
- Build and share shopping lists or recipe ingredient lists
- Coordinate a garage sale or estate inventory with multiple people
- Collaborate on shared storage spaces with roommates or family

The possibilities are vast.

---

## Core Features

### Homes, Rooms & Items
- Create a **Home** as your top-level workspace
- Add as many **Rooms** as you need — each with a name, description, and icon
- Add **Items** to any room with name, quantity, notes, categories, tags, and photos
- Full **CRUD** on everything: create, read, update, delete

### Tagging & Categories
- Assign items to **Categories** (e.g., "Electronics", "Clothing")
- Apply flexible **Tags** for cross-cutting concerns (e.g., "fragile", "seasonal", "lent out")
- Both are scoped to your Home — no global clutter

### Fuzzy Search
- Search your entire inventory from a single search bar
- Results are **scored by relevance**: exact matches, prefix matches, substring matches, and fuzzy matches all rank appropriately
- Searches across item names, notes, category names, and tag names
- Navigate directly from a result to the item in its room

### Image Support
- Attach **multiple photos** to any item
- Useful for visual identification — especially handy for collectibles, gear, or anything where a picture is worth a thousand words

### Bulk Insert
- Add many items at once with the **Bulk Insert** form
- Perfect for the initial data-entry sprint when you're cataloguing a whole room or collection

### Real-Time Collaboration (Socket.io)
- All changes sync **live across tabs and devices**
- If a collaborator adds or updates an item, you see it instantly — no refresh required
- Share recipients receive real-time push notifications when shared content changes

### Sharing — Three Ways

| Method | How it works |
|---|---|
| **Direct Share** | Share a Home, Room, or individual Item with a specific person by token |
| **Share Link** | Generate a public URL with a base64 token — anyone with the link can view (or edit, if you allow it) |
| **Home Invite** | Invite someone to join your Home as a full collaborator |

All shares support an optional **edit permission** (`canEdit`) so you control whether recipients are viewers or contributors.

### "Shared With Me" Dashboard
- See everything others have shared with you in one place
- Switch into a shared Home, browse a shared Room, or inspect a shared Item
- Share links you've visited are tracked so you don't lose them

### Multi-Home Support
- Your device can be authenticated to **multiple Homes**
- Switch between households instantly — useful for managing your home and a vacation property, or a personal stash and a shared workshop

### The Dumpster (Soft Delete)
- Deleting an item or room doesn't destroy it — it goes to the **Dumpster**
- Restore anything individually, or do a **Spring Cleaning** to permanently wipe all trash at once
- Nothing is ever accidentally lost

### The Yard Sale (Orphaned Items)
- When a Room is deleted, the items inside it don't disappear — they become **orphaned**
- The **Yard Sale** page ("Front Yard") surfaces these orphaned items so you can relocate them to an active room or send them to the Dumpster
- Smart, graceful handling of reorganization

### Notifications
- In-app notifications for relevant events (shares, invites, collaborative changes)
- Notifications **auto-expire after 30 days** to keep things tidy
- Unread badge count with instant real-time updates

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js, Express, TypeScript |
| **Database** | MongoDB (Mongoose ODM) |
| **Real-Time** | Socket.io |
| **Frontend** | React, TypeScript, Vite |
| **UI Library** | Mantine |
| **Styling** | Tailwind CSS |
| **File Uploads** | Multer |
| **Auth** | Token-based (cookie, 10-year TTL) |
| **Process Manager** | PM2 |

---

## Project Structure

```
home-organization-app/
├── backend/
│   └── src/
│       ├── app.ts              # Express app + Socket.io setup
│       ├── controllers/        # Route handlers
│       ├── middleware/         # Auth guard, file upload
│       ├── models/             # Mongoose schemas
│       ├── routes/             # API route definitions
│       ├── types/              # Shared TypeScript types
│       └── utils/              # Logger, Socket helpers
└── frontend/
    └── src/
        ├── components/         # Reusable UI components
        ├── contexts/           # Auth, Notifications, Rooms state
        ├── pages/              # Full page views
        ├── services/           # API client, Socket client
        └── types/              # Shared TypeScript types
```

---

## Key Pages

| Page | Purpose |
|---|---|
| **Dashboard** | Room grid with item counts + 6 most recent items |
| **Room Page** | Browse and manage items in a specific room |
| **Inventory** | Full inventory list + Bulk Insert |
| **Search Results** | Fuzzy search across all items |
| **Yard Sale** | Orphaned items awaiting relocation |
| **Dumpster** | Soft-deleted items/rooms with restore options |
| **Shared With Me** | All content shared with you by others |
| **Shared View** | Public guest view via share link token |
| **Invite Page** | Accept a Home invitation |
| **Notifications** | In-app notification feed |

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB instance (local or Atlas)

### Install & Run

```bash
# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install

# Run both from project root using PM2
npm run dev
```

Or start with PM2 directly:
```bash
pm2 start ecosystem.config.js
```

The backend API runs on port **5000** by default. The frontend dev server proxies API calls automatically.

---

## API Overview

All protected endpoints require a valid `home_token` cookie set during initialization.

| Resource | Base Path | Notes |
|---|---|---|
| Auth | `/api/auth` | Init, join, switch home |
| Rooms | `/api/rooms` | CRUD + soft delete |
| Items | `/api/items` | CRUD + search + bulk + yard sale |
| Dumpster | `/api/dumpster` | Restore + permanent delete |
| Shares | `/api/shares` | Direct sharing management |
| Share Links | `/api/share-links` | Token-based public links |
| Categories | `/api/categories` | Home-scoped categories |
| Tags | `/api/tags` | Home-scoped tags |
| Notifications | `/api/notifications` | In-app notification feed |
| Upload | `/api/upload` | Image file uploads |
| Home Invites | `/api/home-invites` | Invitation lifecycle |
| Public Share | `/api/public/share/:token` | Unauthenticated share view |
| Public Invite | `/api/public/invite/:token` | Unauthenticated invite claim |

---

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

MIT
This project is licensed under the MIT License. See the LICENSE file for details.