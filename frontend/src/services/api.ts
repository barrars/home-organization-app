import axios from 'axios';
import type { Room, Category, Tag, Item, DumpsterContents, SearchResultItem } from '../types';

const api = axios.create({ baseURL: '/api' });

// Rooms
export const getRooms = () => api.get<Room[]>('/rooms').then((r) => r.data);
export const createRoom = (data: { name: string; description?: string }) =>
  api.post<Room>('/rooms', data).then((r) => r.data);
export const updateRoom = (id: string, data: { name: string; description?: string }) =>
  api.patch<Room>(`/rooms/${id}`, data).then((r) => r.data);
export const deleteRoom = (id: string) => api.delete(`/rooms/${id}`);

// Categories
export const getCategories = () => api.get<Category[]>('/categories').then((r) => r.data);
export const findOrCreateCategory = (name: string) =>
  api.post<Category>('/categories', { name }).then((r) => r.data);

// Tags
export const getTags = (roomId?: string) =>
  api.get<Tag[]>('/tags', { params: roomId ? { roomId } : {} }).then((r) => r.data);
export const findOrCreateTag = (name: string) =>
  api.post<Tag>('/tags', { name }).then((r) => r.data);

// Items
export const getItems = (roomId?: string) =>
  api.get<Item[]>('/items', { params: roomId ? { roomId } : {} }).then((r) => r.data);
export const createItem = (data: {
  name: string;
  quantity: number;
  roomId: string;
  categories: string[];
  tags: string[];
  notes?: string;
  imageUrl?: string;
  imageUrls?: string[];
}) => api.post<Item>('/items', data).then((r) => r.data);
export const updateItem = (
  id: string,
  data: Partial<{
    name: string;
    quantity: number;
    categories: string[];
    tags: string[];
    notes: string;
    imageUrl: string;
    imageUrls: string[];
  }>,
) => api.patch<Item>(`/items/${id}`, data).then((r) => r.data);
export const deleteItem = (id: string) => api.delete(`/items/${id}`);

export const uploadImage = async (file: File) => {
  const formData = new FormData();
  formData.append('image', file);
  const res = await api.post<{ imageUrl: string }>('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.imageUrl;
};

// Legacy alias used by old components
export const fetchInventoryItems = () => getItems();
export const fetchInventory = () => getItems();
export const bulkInsertInventory = (items: object[]) =>
  api.post('/items/bulk-insert', items).then((r) => r.data);

// Search
export const searchItems = (q: string) =>
  api.get<SearchResultItem[]>('/items/search', { params: { q } }).then((r) => r.data);

// Dumpster
export const getDumpster = () => api.get<DumpsterContents>('/dumpster').then((r) => r.data);
export const getDumpsterCount = () =>
  api.get<{ items: number; rooms: number; total: number }>('/dumpster/count').then((r) => r.data);
export const getItemCountsByRoom = () =>
  api.get<Record<string, number>>('/items/counts-by-room').then((r) => r.data);
export const restoreItem = (id: string) =>
  api.post<Item>(`/dumpster/items/${id}/restore`).then((r) => r.data);
export const restoreRoom = (id: string) =>
  api.post<Room>(`/dumpster/rooms/${id}/restore`).then((r) => r.data);
export const destroyItem = (id: string) => api.delete(`/dumpster/items/${id}`);
export const destroyRoom = (id: string) => api.delete(`/dumpster/rooms/${id}`);
export const springCleaning = () => api.delete('/dumpster');
