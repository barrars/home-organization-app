/**
 * Seed script — populates the DB with a realistic demo household.
 *
 * ── HOW TO RUN ───────────────────────────────────────────────────────────────
 *
 *   cd backend
 *   npx ts-node src/seed.ts
 *
 *   The script is idempotent: re-running it wipes and re-seeds the same home
 *   cleanly (token is cached in /tmp/seed-home-token.txt).
 *   To start fresh with a brand-new home: rm /tmp/seed-home-token.txt
 *
 * ── WHAT IT CREATES ──────────────────────────────────────────────────────────
 *
 *   10 rooms  ·  ~254 items  ·  4 pre-built lists
 *
 *   Rooms:
 *     Kitchen · Living Room · Master Bedroom · Bathroom · Home Office
 *     Garage  · Laundry Room · Kids Room · Pantry · Camping Gear Closet
 *
 *   Lists (with realistic per-item notes):
 *     🏕️  Camping Trip — Yosemite   (20 items)
 *     ✈️  Weekend Flight — NYC       (15 items)
 *     🔧  Bathroom Renovation Prep  (10 items)
 *     🎄  Holiday Hosting            (17 items)
 *
 * ── HOW TO LOG IN ────────────────────────────────────────────────────────────
 *
 *   The home uses an httpOnly cookie, so you can't set it via document.cookie.
 *   Instead, run this in the browser dev console while on localhost:3000:
 *
 *     fetch('/api/auth/switch', {
 *       method: 'POST',
 *       credentials: 'include',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify({ token: '<paste token from /tmp/seed-home-token.txt>' })
 *     }).then(r => r.json()).then(d => { console.log('Switched:', d); location.reload(); })
 *
 *   The current token is printed at the end of each seed run and saved to:
 *     /tmp/seed-home-token.txt
 *
 * ── SEEDING PRODUCTION (chores.dailydocket.org) ─────────────────────────────
 *
 *   1. SSH into the server:
 *        ssh your-user@chores.dailydocket.org
 *
 *   2. Navigate to the app and run the seed:
 *        cd /path/to/home-organization-app/backend
 *        npx ts-node src/seed.ts
 *
 *   3. Note the token printed at the end of the run.
 *
 *   4. Log in by running this in the browser console at
 *      https://chores.dailydocket.org/ :
 *
 *        fetch('/api/auth/switch', {
 *          method: 'POST',
 *          credentials: 'include',
 *          headers: { 'Content-Type': 'application/json' },
 *          body: JSON.stringify({ token: '<token from seed output>' })
 *        }).then(r => r.json()).then(d => { console.log('Switched:', d); location.reload(); })
 *
 *   To reset/re-seed the same home later (on the server):
 *        npx ts-node src/seed.ts
 *
 *   To start a brand-new home on the server:
 *        rm /tmp/seed-home-token.txt && npx ts-node src/seed.ts
 *
 * ── TROUBLESHOOTING ──────────────────────────────────────────────────────────
 *
 *   429 on /api/auth/init  →  Restart the backend (rate limiter is in-memory).
 *   "Token file exists but home not found"  →  rm /tmp/seed-home-token.txt
 *
 */
import mongoose from 'mongoose'
import crypto from 'crypto'
import fs from 'fs'
import { Home } from './models/home.model'
import { Room } from './models/room.model'
import { Item } from './models/inventory.model'
import { List } from './models/list.model'
import { ListItem } from './models/listItem.model'

const MONGO_URL = 'mongodb://localhost:27017/home-organization'
const TOKEN_FILE = '/tmp/seed-home-token.txt'

// ─── Helpers ────────────────────────────────────────────────────────────────

function qty(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// ─── Data ───────────────────────────────────────────────────────────────────

const ROOMS: { name: string; icon: string; description: string; items: string[] }[] = [
  {
    name: 'Kitchen',
    icon: 'kitchen',
    description: 'Where all the magic (and mess) happens.',
    items: [
      'KitchenAid Stand Mixer',
      'Instant Pot',
      'Cast Iron Skillet',
      "Chef's Knife",
      'Cutting Board',
      'Wooden Spoon Set',
      'Silicone Spatula',
      'Measuring Cups',
      'Measuring Spoons',
      'Glass Storage Containers',
      'Sheet Pan',
      'Dutch Oven',
      'Colander',
      'Box Grater',
      'Can Opener',
      'Vegetable Peeler',
      'Salad Spinner',
      'Whisk',
      'Ladle',
      'Oven Mitts',
      'Dish Towels',
      'Dish Soap',
      'Sponges',
      'Coffee Maker',
      'Coffee Grinder',
      'Toaster',
      'Blender',
      'Food Processor',
      'Immersion Blender',
      'Rice Cooker',
    ],
  },
  {
    name: 'Living Room',
    icon: 'sofa',
    description: 'Relaxation headquarters.',
    items: [
      'TV Remote',
      'Throw Blanket',
      'Decorative Pillows',
      'Floor Lamp',
      'Table Lamp',
      'Coffee Table Books',
      'Candles',
      'Picture Frames',
      'Bookshelf',
      'Board Games',
      'Playing Cards',
      'Puzzle (1000 pieces)',
      'Record Player',
      'Vinyl Records',
      'Speaker',
      'Charging Station',
      'Extension Cord',
      'Air Purifier',
      'Humidifier',
      'Area Rug',
    ],
  },
  {
    name: 'Master Bedroom',
    icon: 'bed',
    description: 'The sanctuary.',
    items: [
      'Extra Pillows',
      'Duvet',
      'Mattress Topper',
      'Bedside Lamp',
      'Alarm Clock',
      'Eye Mask',
      'Earplugs',
      'White Noise Machine',
      'Jewelry Box',
      'Watch',
      'Sunglasses',
      'Perfume',
      'Cologne',
      'Hand Lotion',
      'Lip Balm',
      'Reading Books',
      'Kindle',
      'Phone Charger',
      'Laptop',
      'Passport',
    ],
  },
  {
    name: 'Bathroom',
    icon: 'bath',
    description: 'Spa vibes (hopefully).',
    items: [
      'Shampoo',
      'Conditioner',
      'Body Wash',
      'Face Wash',
      'Moisturizer',
      'Sunscreen SPF 50',
      'Toothbrush',
      'Toothpaste',
      'Dental Floss',
      'Mouthwash',
      'Razor',
      'Shaving Cream',
      'Deodorant',
      'Hairdryer',
      'Flat Iron',
      'Hair Brush',
      'Comb',
      'Cotton Swabs',
      'Cotton Rounds',
      'First Aid Kit',
      'Pain Reliever',
      'Antacids',
      'Bandages',
      'Tweezers',
      'Nail Clippers',
      'Scale',
      'Toilet Paper',
      'Extra Soap',
      'Bath Towels',
      'Hand Towels',
    ],
  },
  {
    name: 'Home Office',
    icon: 'desk',
    description: 'Where productivity goes to try its best.',
    items: [
      'Monitor',
      'Keyboard',
      'Mouse',
      'Mouse Pad',
      'Webcam',
      'Headset',
      'Desk Lamp',
      'Desk Organizer',
      'Sticky Notes',
      'Pens',
      'Pencils',
      'Highlighters',
      'Notebook',
      'Printer',
      'Printer Paper',
      'Stapler',
      'Scissors',
      'Tape',
      'Paper Clips',
      'Binder Clips',
      'File Folders',
      'External Hard Drive',
      'USB Hub',
      'Power Strip',
      'Whiteboard',
      'Whiteboard Markers',
      'Eraser',
      'Desk Chair Cushion',
      'Cable Management Box',
      'Bookends',
    ],
  },
  {
    name: 'Garage',
    icon: 'garage',
    description: 'The dumping ground of champions.',
    items: [
      'Cordless Drill',
      'Drill Bit Set',
      'Hammer',
      'Screwdriver Set',
      'Wrench Set',
      'Pliers',
      'Tape Measure',
      'Level',
      'Utility Knife',
      'Circular Saw',
      'Jigsaw',
      'Sandpaper Assortment',
      'Paint Brushes',
      'Paint Rollers',
      'Drop Cloth',
      "Painter's Tape",
      'Work Gloves',
      'Safety Glasses',
      'Ear Protection',
      'Shop Vac',
      'Extension Ladder',
      'Step Stool',
      'Toolbox',
      'Storage Bins',
      'Bungee Cords',
      'Rope',
      'Jumper Cables',
      'Car Jack',
      'Tire Pressure Gauge',
      'WD-40',
    ],
  },
  {
    name: 'Laundry Room',
    icon: 'laundry',
    description: 'The never-ending battle.',
    items: [
      'Laundry Detergent',
      'Fabric Softener',
      'Dryer Sheets',
      'Stain Remover Pen',
      'Stain Remover Spray',
      'Laundry Baskets',
      'Mesh Laundry Bags',
      'Drying Rack',
      'Iron',
      'Ironing Board',
      'Lint Roller',
      'Wool Dryer Balls',
      'Hangers',
      'Clothespins',
    ],
  },
  {
    name: 'Kids Room',
    icon: 'door',
    description: 'Chaos central (lovingly).',
    items: [
      'LEGO Set',
      'Action Figures',
      'Stuffed Animals',
      'Puzzles',
      'Board Games',
      'Art Supplies',
      'Crayons',
      'Colored Pencils',
      'Watercolors',
      'Sketchbooks',
      'Glue Sticks',
      'Safety Scissors',
      'Play-Doh',
      'Kinetic Sand',
      'Books',
      'Flashlight',
      'Backpack',
      'Lunchbox',
      'Water Bottle',
      'Sports Ball',
    ],
  },
  {
    name: 'Pantry',
    icon: 'kitchen',
    description: 'The dry goods kingdom.',
    items: [
      'Olive Oil',
      'Vegetable Oil',
      'Soy Sauce',
      'Hot Sauce',
      'Vinegar',
      'Balsamic Vinegar',
      'Honey',
      'Maple Syrup',
      'Canned Tomatoes',
      'Canned Beans',
      'Pasta',
      'Rice',
      'Quinoa',
      'Oats',
      'Flour',
      'Sugar',
      'Brown Sugar',
      'Baking Powder',
      'Baking Soda',
      'Vanilla Extract',
      'Cocoa Powder',
      'Chocolate Chips',
      'Breadcrumbs',
      'Panko',
      'Chicken Broth',
      'Vegetable Broth',
      'Coconut Milk',
      'Peanut Butter',
      'Almond Butter',
      'Jam',
    ],
  },
  {
    name: 'Camping Gear Closet',
    icon: 'door',
    description: 'Adventure awaits — once we find the tent poles.',
    items: [
      '4-Person Tent',
      'Sleeping Bags',
      'Sleeping Pads',
      'Camping Chairs',
      'Folding Table',
      'Camp Stove',
      'Fuel Canisters',
      'Cookware Set',
      'Camp Lantern',
      'Headlamps',
      'Extra Batteries',
      'Tarp',
      'Paracord',
      'Carabiners',
      'Backpacks',
      'Water Filter',
      'Water Bottles',
      'First Aid Kit',
      'Compass',
      'Trail Map',
      'Bug Spray',
      'Sunscreen',
      'Pocket Knife',
      'Multi-tool',
      'Fire Starter',
      'Matches',
      'Camp Soap',
      'Trowel',
      'Bear Canister',
      'Hiking Poles',
    ],
  },
]

const LIST_DEFS = [
  {
    name: '🏕️ Camping Trip — Yosemite',
    description: 'Summer trip with the whole family. Leave Friday, back Sunday.',
    roomHints: ['Camping Gear Closet', 'Bathroom', 'Kitchen'],
    itemHints: [
      '4-Person Tent',
      'Sleeping Bags',
      'Sleeping Pads',
      'Camp Stove',
      'Camp Lantern',
      'Headlamps',
      'Water Filter',
      'First Aid Kit',
      'Bug Spray',
      'Sunscreen',
      'Pocket Knife',
      'Multi-tool',
      'Hiking Poles',
      'Compass',
      'Paracord',
      'Bear Canister',
      'Cookware Set',
      'Coffee Maker',
      'Toothbrush',
      'Toothpaste',
    ],
    notes: [
      'Check for tears before packing',
      'Bring liner bags',
      'Inflate before loading car',
      'Extra fuel canister too',
      'Test batteries!',
      'Bring extra head straps',
      'Replace filter element',
      'Restock bandages',
      'Reapply every 2 hrs',
      'SPF 50 only',
      'Sharpen before trip',
      'Check all tools work',
      'Extra rubber tips',
      'Download offline maps too',
      '50ft minimum',
      'Hang food at camp',
      'Pack pot gripper',
      'Bring the hand grinder',
      'Travel size',
      'Floss too',
    ],
  },
  {
    name: '✈️ Weekend Flight — NYC',
    description: 'Business trip + weekend fun. Carry-on only!',
    roomHints: ['Master Bedroom', 'Bathroom', 'Home Office'],
    itemHints: [
      'Passport',
      'Laptop',
      'Kindle',
      'Phone Charger',
      'Headset',
      'Eye Mask',
      'Earplugs',
      'Lip Balm',
      'Sunscreen SPF 50',
      'Toothbrush',
      'Toothpaste',
      'Deodorant',
      'Razor',
      'Moisturizer',
      'Sunglasses',
    ],
    notes: [
      'Check expiry!',
      'Charger + USB-C cable',
      'Downloaded 3 books',
      'Bring EU adapter too',
      'Noise cancelling',
      'Essential for red-eyes',
      'Pack in personal bag',
      'TSA-approved size',
      '3oz bottle in zip bag',
      'Travel head',
      'Travel size',
      'Travel size',
      'Disposable for carry-on',
      'Small tube',
      'Case in personal bag',
    ],
  },
  {
    name: '🔧 Bathroom Renovation Prep',
    description: 'Tools and supplies to gather before the contractor arrives Monday.',
    roomHints: ['Garage', 'Laundry Room'],
    itemHints: [
      'Cordless Drill',
      'Screwdriver Set',
      'Tape Measure',
      'Level',
      'Utility Knife',
      "Painter's Tape",
      'Drop Cloth',
      'Safety Glasses',
      'Work Gloves',
      'Shop Vac',
    ],
    notes: [
      'Check battery charge',
      'Include Phillips #2',
      'Metric + imperial',
      'Bubble level',
      'Fresh blades',
      '2-inch blue tape',
      '9x12 canvas',
      'Spare pair in kit',
      'Nitrile, size L',
      'Empty canister first',
    ],
  },
  {
    name: '🎄 Holiday Hosting',
    description: '18 people for Thanksgiving. Make sure everything is out and ready.',
    roomHints: ['Kitchen', 'Living Room', 'Pantry'],
    itemHints: [
      'KitchenAid Stand Mixer',
      'Dutch Oven',
      'Sheet Pan',
      'Colander',
      'Ladle',
      'Whisk',
      'Measuring Cups',
      'Measuring Spoons',
      'Candles',
      'Throw Blanket',
      'Flour',
      'Sugar',
      'Brown Sugar',
      'Baking Powder',
      'Vanilla Extract',
      'Chicken Broth',
      'Olive Oil',
    ],
    notes: [
      'Attach dough hook',
      'For the turkey',
      'Need 3 total',
      'For pasta drain',
      'Get the big one',
      'Balloon whisk',
      'Get the 4-cup set',
      'Including 1/4 tsp',
      'Pillar candles + votives',
      'Wash the green one',
      'Buy 5lb bag',
      '4 cups',
      '2 cups dark',
      '2 tsp',
      'Pure, not imitation',
      'Get 4 cartons',
      'Extra virgin',
    ],
  },
]

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  await mongoose.connect(MONGO_URL)
  console.log('✅ Connected to MongoDB')

  // 1 — Get or create a home
  let homeToken: string
  let homeId: mongoose.Types.ObjectId

  if (fs.existsSync(TOKEN_FILE)) {
    homeToken = fs.readFileSync(TOKEN_FILE, 'utf8').trim()
    const home = await Home.findOne({ token: homeToken })
    if (home) {
      homeId = home._id as mongoose.Types.ObjectId
      console.log(`♻️  Reusing home: ${homeId}`)
    } else {
      throw new Error(
        'Token file exists but home not found — delete /tmp/seed-home-token.txt and retry',
      )
    }
  } else {
    homeToken = crypto.randomBytes(32).toString('hex')
    const home = await Home.create({ token: homeToken, name: 'Demo House 🏠' })
    homeId = home._id as mongoose.Types.ObjectId
    fs.writeFileSync(TOKEN_FILE, homeToken)
    console.log(`🏠 Created home: ${homeId}`)
    console.log(`🍪 Token saved to ${TOKEN_FILE}`)
  }

  // 2 — Clear any existing rooms/items/lists for this home (idempotent re-run)
  const existingRooms = await Room.find({ homeId })
  if (existingRooms.length > 0) {
    console.log('🧹 Clearing existing seed data for this home…')
    const roomIds = existingRooms.map((r) => r._id)
    await Item.deleteMany({ homeId })
    await Room.deleteMany({ homeId })
    const existingLists = await List.find({ homeId })
    await ListItem.deleteMany({ listId: { $in: existingLists.map((l) => l._id) } })
    await List.deleteMany({ homeId })
    console.log(`   Removed ${roomIds.length} rooms and all their items/lists`)
  }

  // 3 — Create rooms
  console.log('\n🛋️  Creating rooms and items…')
  const roomMap = new Map<
    string,
    { id: mongoose.Types.ObjectId; items: Map<string, mongoose.Types.ObjectId> }
  >()

  for (const rd of ROOMS) {
    const room = await Room.create({
      homeId,
      name: rd.name,
      description: rd.description,
      icon: rd.icon,
    })
    const rid = room._id as mongoose.Types.ObjectId
    const itemMap = new Map<string, mongoose.Types.ObjectId>()

    for (const itemName of rd.items) {
      const item = await Item.create({
        homeId,
        roomId: rid,
        name: itemName,
        quantity: qty(1, 4),
        categories: [],
        tags: [],
        notes: '',
      })
      itemMap.set(itemName, item._id as mongoose.Types.ObjectId)
    }

    roomMap.set(rd.name, { id: rid, items: itemMap })
    console.log(`  ✓ ${rd.name} — ${rd.items.length} items`)
  }

  // 4 — Create lists
  console.log('\n📋 Creating lists…')

  for (const ld of LIST_DEFS) {
    const list = await List.create({
      homeId,
      name: ld.name,
      description: ld.description,
    })
    const listId = list._id as mongoose.Types.ObjectId

    let added = 0
    for (let i = 0; i < ld.itemHints.length; i++) {
      const hint = ld.itemHints[i]
      const note = ld.notes[i] ?? ''

      // Find the item in any room
      let itemId: mongoose.Types.ObjectId | undefined
      for (const roomData of roomMap.values()) {
        const found = roomData.items.get(hint)
        if (found) {
          itemId = found
          break
        }
      }
      if (!itemId) {
        // Item name not seeded — skip silently
        continue
      }

      try {
        await ListItem.create({ listId, itemId, homeId, note })
        added++
      } catch {
        // Duplicate — ignore
      }
    }
    console.log(`  ✓ "${ld.name}" — ${added} items`)
  }

  // 5 — Summary
  const totalItems = await Item.countDocuments({ homeId })
  const totalRooms = await Room.countDocuments({ homeId })
  const totalLists = await List.countDocuments({ homeId })

  console.log(`
╔══════════════════════════════════════════╗
║          Seed complete!                  ║
╠══════════════════════════════════════════╣
║  Rooms  : ${String(totalRooms).padEnd(30)} ║
║  Items  : ${String(totalItems).padEnd(30)} ║
║  Lists  : ${String(totalLists).padEnd(30)} ║
║                                          ║
║  Home token saved to:                    ║
║  ${TOKEN_FILE.padEnd(40)} ║
║                                          ║
║  To log in, open the app and run this    ║
║  in browser console:                     ║
║  document.cookie = 'home_token=TOKEN'    ║
╚══════════════════════════════════════════╝
`)
  console.log(`home_token=${homeToken}`)

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
