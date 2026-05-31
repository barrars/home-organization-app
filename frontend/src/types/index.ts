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
