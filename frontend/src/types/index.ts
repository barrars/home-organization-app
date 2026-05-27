export interface Room {
  _id: string;
  name: string;
  description: string;
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
