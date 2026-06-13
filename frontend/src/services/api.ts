import axios from 'axios';
import type {
  Room,
  Category,
  Tag,
  Item,
  DumpsterContents,
  SearchResultItem,
  YardSaleItem,
  Share,
  ShareLink,
  ResolvedShareLink,
  Notification,
  ResolvedHomeInvite,
  HomeInviteClaim,
  HomeInviteMode,
  ItemList,
  ItemListDetail,
  ItemListMembership,
} from '../types';

const api = axios.create({ baseURL: '/api', withCredentials: true });

// Auth
export const initAuth = () =>
  api
    .post<{ id: string; token: string; isNew: boolean; name: string }>('/auth/init')
    .then((r) => r.data);
export const getShareUrl = () =>
  api.get<{ joinUrl: string }>('/auth/share').then((r) => r.data.joinUrl);
export const rotateHomeToken = () =>
  api.post<{ token: string; joinUrl: string }>('/auth/rotate').then((r) => r.data);
export const switchHome = (token: string) =>
  api
    .post<{ id: string; token: string; name: string }>('/auth/switch', { token })
    .then((r) => r.data);
export const updateHomeName = (name: string) =>
  api.patch<{ name: string }>('/auth/home', { name }).then((r) => r.data.name);
export const createHome = () =>
  api.post<{ id: string; token: string; name: string }>('/auth/create').then((r) => r.data);
export const deleteHome = (id: string, token: string) =>
  api.delete(`/auth/home/${id}`, { data: { token } });

// Rooms
export const getRooms = () => api.get<Room[]>('/rooms').then((r) => r.data);
export const createRoom = (data: { name: string; description?: string; icon?: string }) =>
  api.post<Room>('/rooms', data).then((r) => r.data);
export const updateRoom = (
  id: string,
  data: { name: string; description?: string; icon?: string },
) => api.patch<Room>(`/rooms/${id}`, data).then((r) => r.data);
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
    roomId: string;
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

// Yard Sale — items stranded when their room was trashed
export const getYardSaleItems = () =>
  api.get<YardSaleItem[]>('/items/yard-sale').then((r) => r.data);
export const getYardSaleCount = () =>
  api.get<{ total: number }>('/items/yard-sale/count').then((r) => r.data);

// Shares
export const createShare = (data: {
  targetType: string;
  targetId: string;
  sharedWithToken: string;
  canEdit?: boolean;
}) => api.post<Share>('/shares', data).then((r) => r.data);
export const getSharedWithMe = () => api.get<Share[]>('/shares/shared-with-me').then((r) => r.data);
export const getSharedByMe = () => api.get<Share[]>('/shares/shared-by-me').then((r) => r.data);
export const updateShare = (id: string, canEdit: boolean) =>
  api.patch<Share>(`/shares/${id}`, { canEdit }).then((r) => r.data);
export const removeShare = (id: string) => api.delete(`/shares/${id}`);

// Share Links
export const createShareLink = (data: {
  targetType: 'room' | 'item';
  targetId: string;
  canEdit?: boolean;
}) => api.post<ShareLink>('/share-links', data).then((r) => r.data);
export const getMyShareLinks = () => api.get<ShareLink[]>('/share-links').then((r) => r.data);
export const updateShareLink = (id: string, data: { canEdit?: boolean; active?: boolean }) =>
  api.patch<ShareLink>(`/share-links/${id}`, data).then((r) => r.data);
export const removeShareLink = (id: string) => api.delete(`/share-links/${id}`);
// Public — no auth cookie needed
export const resolveShareLink = (token: string) =>
  axios.get<ResolvedShareLink>(`/api/public/share/${token}`).then((r) => r.data);
// Register a visit so the link appears in Shared With Me (auth required)
export const visitShareLink = (token: string) =>
  api.post(`/share-links/${token}/visit`).catch(() => {
    /* non-critical */
  });

// Notifications
export const getNotifications = (params?: { unreadOnly?: boolean; limit?: number }) =>
  api
    .get<Notification[]>('/notifications', {
      params: {
        unreadOnly: params?.unreadOnly ? 'true' : undefined,
        limit: params?.limit,
      },
    })
    .then((r) => r.data);
export const getUnreadNotificationCount = () =>
  api.get<{ count: number }>('/notifications/unread-count').then((r) => r.data);
export const markNotificationRead = (id: string) =>
  api.patch<Notification>(`/notifications/${id}/read`).then((r) => r.data);
export const markAllNotificationsRead = () =>
  api.post('/notifications/mark-all-read').then((r) => r.data);
export const deleteNotification = (id: string) => api.delete(`/notifications/${id}`);

// Home Invites
export const createHomeInvite = (mode: HomeInviteMode) =>
  api.post<{ token: string }>('/home-invites', { mode }).then((r) => r.data);
export const resolveHomeInvite = (token: string) =>
  axios.get<ResolvedHomeInvite>(`/api/public/invite/${token}`).then((r) => r.data);
export const claimHomeInvite = (token: string) =>
  axios.post<HomeInviteClaim>(`/api/public/invite/${token}/claim`).then((r) => r.data);

// Lists
export const getLists = () => api.get<ItemList[]>('/lists').then((r) => r.data);
export const createList = (data: { name: string; description?: string }) =>
  api.post<ItemList>('/lists', data).then((r) => r.data);
export const getList = (id: string) => api.get<ItemListDetail>(`/lists/${id}`).then((r) => r.data);
export const updateList = (id: string, data: { name?: string; description?: string }) =>
  api.patch<ItemList>(`/lists/${id}`, data).then((r) => r.data);
export const deleteList = (id: string) => api.delete(`/lists/${id}`);
export const addItemToList = (listId: string, itemId: string, note?: string) =>
  api.post(`/lists/${listId}/items`, { itemId, note: note ?? '' });
export const removeItemFromList = (listId: string, itemId: string) =>
  api.delete(`/lists/${listId}/items/${itemId}`);
export const updateListItemNote = (listId: string, itemId: string, note: string) =>
  api.patch(`/lists/${listId}/items/${itemId}`, { note });
export const getListsForItem = (itemId: string) =>
  api.get<ItemListMembership[]>(`/lists/for-item/${itemId}`).then((r) => r.data);
