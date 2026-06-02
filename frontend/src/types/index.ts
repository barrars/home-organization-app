export interface Room {
  _id: string;
  name: string;
  description: string;
  icon: string;
  createdAt: string;
  deletedAt: string | null;
}

export interface Category {
  _id: string;
  name: string;
}

export interface Tag {
  _id: string;
  name: string;
}

export interface Item {
  _id: string;
  name: string;
  quantity: number;
  roomId: string;
  categories: Category[];
  tags: Tag[];
  notes: string;
  imageUrl: string;
  imageUrls: string[];
  createdAt: string;
  deletedAt: string | null;
}

export interface DumpsterContents {
  items: Item[];
  rooms: Room[];
}

/** Item returned by the search endpoint — roomId is fully populated */
export interface SearchResultItem extends Omit<Item, 'roomId'> {
  roomId: { _id: string; name: string };
  _score: number;
}

/** Item returned by the yard-sale endpoint — roomId is populated (its room is trashed) */
export interface YardSaleItem extends Omit<Item, 'roomId'> {
  roomId: { _id: string; name: string } | string;
}

/** Share target types */
export type ShareTargetType = 'home' | 'room' | 'item';

/** A share record */
export interface Share {
  _id: string;
  ownerHomeId: string;
  sharedWithHomeId: string;
  targetType: ShareTargetType;
  targetId: string;
  canEdit: boolean;
  createdAt: string;
  updatedAt: string;
  target?: Record<string, unknown> | null;
  /** Token of the corresponding ShareLink — present for room/item shares */
  shareLinkToken?: string | null;
}

/** Share link target types (rooms and items only — not whole home) */
export type ShareLinkTargetType = 'room' | 'item';

/** A shareable link record */
export interface ShareLink {
  _id: string;
  ownerHomeId: string;
  targetType: ShareLinkTargetType;
  targetId: string;
  token: string;
  canEdit: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Resolved share link payload returned by the public endpoint */
export interface ResolvedShareLink {
  targetType: ShareLinkTargetType;
  canEdit: boolean;
  target: (Room & { items: Item[] }) | Item;
}

/** A notification record */
export interface Notification {
  _id: string;
  homeId: string;
  event: string;
  data: Record<string, unknown>;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Invite mode */
export type HomeInviteMode = 'view' | 'join';

/** Resolved invite metadata returned by public endpoint */
export interface ResolvedHomeInvite {
  mode: HomeInviteMode;
  homeName: string;
  expiresAt: string;
}

/** Claim response */
export interface HomeInviteClaim {
  mode: HomeInviteMode;
  homeName: string;
  /** Only present when mode === 'join' */
  homeToken?: string;
}

// ── Lists ──────────────────────────────────────────────────────────────────

/** List summary returned by GET /api/lists */
export interface ItemList {
  _id: string;
  homeId: string;
  name: string;
  description: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

/** A single entry in a list — item fully populated with room info */
export interface ListEntry {
  listItemId: string;
  note: string;
  addedAt: string;
  item: Item & { roomId: { _id: string; name: string; icon: string } };
}

/** Full list detail returned by GET /api/lists/:id */
export interface ItemListDetail extends Omit<ItemList, 'itemCount'> {
  items: ListEntry[];
}

/** Membership info returned by GET /api/lists/for-item/:itemId */
export interface ItemListMembership {
  listItemId: string;
  note: string;
  list: { _id: string; name: string; description: string };
}
