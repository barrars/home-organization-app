import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Title,
  Text,
  Button,
  Group,
  Card,
  Badge,
  Stack,
  Loader,
  Center,
  ActionIcon,
  SimpleGrid,
  Divider,
  Anchor,
  Image,
  Box,
  Tooltip,
  Modal,
  Select,
  Tabs,
  ScrollArea,
} from '@mantine/core';
import { Carousel } from '@mantine/carousel';
import '@mantine/carousel/styles.css';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconTrash,
  IconPackage,
  IconCamera,
  IconPhoto,
  IconEdit,
  IconCopy,
  IconArrowRight,
  IconShare,
  IconX,
  IconList,
} from '@tabler/icons-react';
import { getItems, deleteItem, uploadImage, updateItem } from '../services/api';
import { getSocket } from '../services/socket';
import { useRooms } from '../contexts/RoomsContext';
import AddItemModal from '../components/AddItemModal';
import CreateRoomModal from '../components/CreateRoomModal';
import ShareLinkModal from '../components/ShareLinkModal';
import AddToListModal from '../components/AddToListModal';
import type { Item } from '../types';
import { RoomIcon } from '../utils/roomIcons';

const getItemImages = (item: Item): string[] => {
  if (Array.isArray(item.imageUrls) && item.imageUrls.length > 0) {
    return item.imageUrls.filter((url) => url?.trim());
  }
  return item.imageUrl?.trim() ? [item.imageUrl] : [];
};

// Isolated component so each card carousel owns its own currentSlide state
// without causing the whole page to re-render on every swipe.
interface ItemPhotoAreaProps {
  item: Item;
  uploadingFor: string | null;
  onOpenLightbox: (urls: string[], idx: number) => void;
  onOpenPhotoPicker: (itemId: string) => void;
  onPastePhoto: (itemId: string, files: File[]) => void;
}

const ItemPhotoArea: React.FC<ItemPhotoAreaProps> = ({
  item,
  uploadingFor,
  onOpenLightbox,
  onOpenPhotoPicker,
  onPastePhoto,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [dragging, setDragging] = useState(false);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const images = getItemImages(item);

  if (images.length === 0) {
    const attemptClipboardPaste = async () => {
      try {
        const clipboardItems = await navigator.clipboard.read();
        const files: File[] = [];
        for (const ci of clipboardItems) {
          for (const type of ci.types) {
            if (type.startsWith('image/')) {
              const blob = await ci.getType(type);
              files.push(new File([blob], `paste.${type.split('/')[1]}`, { type }));
            }
          }
        }
        if (files.length > 0) {
          onPastePhoto(item._id, files);
        } else {
          notifications.show({ message: 'No image in clipboard', color: 'yellow' });
        }
      } catch {
        notifications.show({ message: 'Could not read clipboard — use Ctrl+V or drag a photo here instead', color: 'orange' });
      }
    };

    // Desktop: single click → file picker (after short delay to yield to double-click)
    const handleClick = () => {
      if (clickTimerRef.current) return; // already waiting — second click coming
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        onOpenPhotoPicker(item._id);
      }, 220);
    };

    // Desktop: double click → clipboard paste
    const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      attemptClipboardPaste();
    };

    // Mobile: long press → clipboard paste
    const handleTouchStart = () => {
      longPressTimerRef.current = setTimeout(() => {
        longPressTimerRef.current = null;
        attemptClipboardPaste();
      }, 600);
    };

    const cancelLongPress = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
      const files = Array.from(e.clipboardData.items)
        .filter((it) => it.kind === 'file' && it.type.startsWith('image/'))
        .map((it) => it.getAsFile())
        .filter((f): f is File => f !== null);
      if (files.length > 0) {
        e.preventDefault();
        onPastePhoto(item._id, files);
      }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      if (Array.from(e.dataTransfer.items).some((it) => it.kind === 'file' && it.type.startsWith('image/'))) {
        e.preventDefault();
        setDragging(true);
      }
    };

    const handleDragLeave = () => setDragging(false);

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
      if (files.length > 0) onPastePhoto(item._id, files);
    };

    return (
      <Box
        mb="sm"
        h={72}
        tabIndex={0}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={cancelLongPress}
        onTouchMove={cancelLongPress}
        onPaste={handlePaste}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragging ? 'var(--mantine-color-teal-5)' : 'var(--mantine-color-gray-3)'}`,
          borderRadius: 8,
          background: dragging ? 'var(--mantine-color-teal-0)' : undefined,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          cursor: 'pointer',
          color: dragging ? 'var(--mantine-color-teal-7)' : 'var(--mantine-color-dimmed)',
          outline: 'none',
          transition: 'border-color 0.15s, background 0.15s, color 0.15s',
        }}
      >
        {uploadingFor === item._id ? (
          <Loader size="xs" />
        ) : (
          <>
            <IconPhoto size={18} />
            <Text size="xs">{dragging ? 'Drop to upload' : 'Add Photo · Paste'}</Text>
          </>
        )}
      </Box>
    );
  }

  return (
    <Card.Section mb="sm" style={{ position: 'relative' }}>
      {images.length > 1 ? (
        <div style={{ position: 'relative' }}>
          <Carousel
            emblaOptions={{ loop: true }}
            height={160}
            onSlideChange={setCurrentSlide}
            classNames={{ control: 'card-carousel-control' }}
          >
            {images.map((url, idx) => (
              <Carousel.Slide key={idx}>
                <Image
                  src={url}
                  height={160}
                  fit="scale-down"
                  style={{ cursor: 'zoom-in' }}
                  onClick={() => onOpenLightbox(images, idx)}
                />
              </Carousel.Slide>
            ))}
          </Carousel>
          {/* Slide counter — replaces the static "N photos" badge */}
          <Box
            style={{
              position: 'absolute',
              bottom: 6,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
              background: 'rgba(0,0,0,0.55)',
              borderRadius: 12,
              padding: '2px 8px',
              pointerEvents: 'none',
            }}
          >
            <Text size="xs" c="white" fw={500}>
              {currentSlide + 1} / {images.length}
            </Text>
          </Box>
        </div>
      ) : (
        <Image
          src={images[0]}
          height={160}
          fit="scale-down"
          style={{ cursor: 'zoom-in' }}
          onClick={() => onOpenLightbox(images, 0)}
        />
      )}
      <Tooltip label="Add photo(s)">
        <ActionIcon
          style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 3 }}
          size="sm"
          variant="filled"
          color="dark"
          opacity={0.75}
          onClick={() => onOpenPhotoPicker(item._id)}
          loading={uploadingFor === item._id}
        >
          <IconCamera size={13} />
        </ActionIcon>
      </Tooltip>
    </Card.Section>
  );
};

const RoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { rooms, refreshCounts, itemCounts } = useRooms();
  const navigate = useNavigate();
  const room = rooms.find((r) => r._id === roomId);

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [templateItem, setTemplateItem] = useState<Item | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ urls: string[]; initialIndex: number } | null>(null);
  const [moveItem, setMoveItem] = useState<Item | null>(null);
  const [moveTargetRoomId, setMoveTargetRoomId] = useState<string | null>(null);
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [editRoomOpen, setEditRoomOpen] = useState(false);
  const [shareLinkTarget, setShareLinkTarget] = useState<{
    type: 'room' | 'item';
    id: string;
    name: string;
  } | null>(null);
  const [addToListItem, setAddToListItem] = useState<Item | null>(null);

  // Always-current ref so backgroundRefresh can diff without a stale closure
  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = items;
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<string>('date_asc');

  const photoInputRef = useRef<HTMLInputElement>(null);
  const activeItemIdRef = useRef<string | null>(null);
  const touchStartY = useRef<number>(0);

  const loadItems = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const data = await getItems(roomId);
      setItems(data);
    } catch {
      notifications.show({ message: 'Failed to load items', color: 'red' });
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Scroll to + glow the highlighted item once items finish loading
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  useEffect(() => {
    if (!highlightId || loading || items.length === 0) return;
    const el = document.getElementById(`item-${highlightId}`);
    if (!el) return;
    // Small delay so the grid has painted
    const t = setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('item-highlight');
      el.addEventListener('animationend', () => el.classList.remove('item-highlight'), { once: true });
    }, 150);
    return () => clearTimeout(t);
  }, [highlightId, loading, items]);

  // Silent background refresh driven by socket events from other tabs/devices.
  // Deliberately omits setLoading(true) so the existing list stays visible
  // while new data arrives — no skeleton flash for remote-triggered updates.
  const backgroundRefresh = useCallback(async () => {
    if (!roomId) return;
    try {
      const data = await getItems(roomId);
      const prevIds = new Set(itemsRef.current.map((i) => i._id));
      const added = new Set(data.filter((i) => !prevIds.has(i._id)).map((i) => i._id));
      setItems(data);
      if (added.size > 0) {
        setNewItemIds(added);
        setTimeout(() => setNewItemIds(new Set()), 500);
      }
    } catch {
      /* non-critical — user already sees last known state */
    }
  }, [roomId]);

  useEffect(() => {
    const socket = getSocket();
    const itemEvents = [
      'item:created',
      'item:updated',
      'item:deleted',
      'item:restored',
      'item:destroyed',
    ];
    itemEvents.forEach((e) => socket.on(e, backgroundRefresh));
    return () => itemEvents.forEach((e) => socket.off(e, backgroundRefresh));
  }, [backgroundRefresh]);

  const handleDelete = async (item: Item) => {
    setItems((prev) => prev.filter((i) => i._id !== item._id));
    try {
      await deleteItem(item._id);
      refreshCounts();
      notifications.show({
        message: (
          <Group gap="xs" wrap="nowrap" justify="space-between">
            <Text size="sm">🗑️ "{item.name}" tossed in the Dumpster</Text>
            <Anchor
              size="sm"
              fw={600}
              onClick={() => navigate('/dumpster')}
              style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              View →
            </Anchor>
          </Group>
        ),
        color: 'orange',
      });
    } catch {
      setItems((prev) => [...prev, item].sort((a, b) => a.name.localeCompare(b.name)));
      notifications.show({ message: 'Failed to delete item', color: 'red' });
    }
  };

  const handleMoveConfirm = async () => {
    if (!moveItem || !moveTargetRoomId) return;
    const targetRoom = rooms.find((r) => r._id === moveTargetRoomId);
    const itemSnapshot = moveItem;
    setItems((prev) => prev.filter((i) => i._id !== itemSnapshot._id));
    setMoveItem(null);
    setMoveTargetRoomId(null);
    try {
      await updateItem(itemSnapshot._id, { roomId: moveTargetRoomId });
      refreshCounts();
      notifications.show({
        message: (
          <Group gap="xs" wrap="nowrap" justify="space-between">
            <Text size="sm">
              📦 "{itemSnapshot.name}" moved to {targetRoom?.name ?? 'new room'}
            </Text>
            <Anchor
              size="sm"
              fw={600}
              onClick={() => navigate(`/rooms/${moveTargetRoomId}`)}
              style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Go →
            </Anchor>
          </Group>
        ),
        color: 'blue',
      });
    } catch {
      setItems((prev) => [...prev, itemSnapshot]);
      notifications.show({ message: 'Failed to move item', color: 'red' });
    }
  };

  const openPhotoPicker = (itemId: string) => {
    activeItemIdRef.current = itemId;
    photoInputRef.current?.click();
  };

  const uploadFilesForItem = async (itemId: string, fileArray: File[]) => {
    const currentItem = items.find((i) => i._id === itemId);
    const originalImages = currentItem ? getItemImages(currentItem) : [];

    // Optimistically show the local file(s) immediately
    const blobUrls = fileArray.map((f) => URL.createObjectURL(f));
    setItems((prev) =>
      prev.map((i) =>
        i._id === itemId
          ? {
              ...i,
              imageUrls: [...originalImages, ...blobUrls],
              imageUrl: originalImages[0] ?? blobUrls[0] ?? '',
            }
          : i,
      ),
    );

    setUploadingFor(itemId);
    try {
      const newUrls = await Promise.all(fileArray.map((f) => uploadImage(f)));
      const imageUrls = [...originalImages, ...newUrls];
      await updateItem(itemId, { imageUrls });
      // Swap optimistic blob URLs for the real server URLs
      setItems((prev) =>
        prev.map((i) => (i._id === itemId ? { ...i, imageUrls, imageUrl: imageUrls[0] ?? '' } : i)),
      );
      notifications.show({
        message: `${newUrls.length > 1 ? `${newUrls.length} photos` : 'Photo'} added!`,
        color: 'green',
      });
    } catch {
      setItems((prev) =>
        prev.map((i) =>
          i._id === itemId
            ? { ...i, imageUrls: originalImages, imageUrl: originalImages[0] ?? '' }
            : i,
        ),
      );
      notifications.show({ message: 'Failed to upload photo', color: 'red' });
    } finally {
      blobUrls.forEach((u) => URL.revokeObjectURL(u));
      setUploadingFor(null);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const itemId = activeItemIdRef.current;
    if (!files || files.length === 0 || !itemId) return;
    activeItemIdRef.current = null;
    if (photoInputRef.current) photoInputRef.current.value = '';
    await uploadFilesForItem(itemId, Array.from(files));
  };

  const handlePastePhoto = (itemId: string, files: File[]) => {
    uploadFilesForItem(itemId, files);
  };

  const allCategories = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((item) => {
      item.categories.forEach((cat) => {
        const name = cat.name?.trim();
        if (name) map.set(cat._id, name);
      });
    });
    return Array.from(map, ([_id, name]) => ({ _id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [items]);

  const allTags = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((item) => {
      item.tags.forEach((tag) => {
        const name = tag.name?.trim();
        if (name) map.set(tag._id, name);
      });
    });
    return Array.from(map, ([_id, name]) => ({ _id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [items]);

  const filteredItems = useMemo(() => {
    const hasCategoryFilters = selectedCategoryIds.length > 0;
    const hasTagFilters = selectedTagIds.length > 0;

    const filtered =
      !hasCategoryFilters && !hasTagFilters
        ? items
        : items.filter((item) => {
            const itemCategoryIds = new Set(item.categories.map((c) => c._id));
            const itemTagIds = new Set(item.tags.map((t) => t._id));

            const categoryMatch =
              !hasCategoryFilters || selectedCategoryIds.some((id) => itemCategoryIds.has(id));
            const tagMatch = !hasTagFilters || selectedTagIds.some((id) => itemTagIds.has(id));

            return categoryMatch && tagMatch;
          });

    const sorted = [...filtered];
    switch (sortKey) {
      case 'date_asc':
        sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'date_desc':
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'name_asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'qty_asc':
        sorted.sort((a, b) => a.quantity - b.quantity);
        break;
      case 'qty_desc':
        sorted.sort((a, b) => b.quantity - a.quantity);
        break;
    }
    return sorted;
  }, [items, selectedCategoryIds, selectedTagIds, sortKey]);

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleTag = (id: string) => {
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const resetFilters = () => {
    setSelectedCategoryIds([]);
    setSelectedTagIds([]);
    setSortKey('date_asc');
  };

  const hasActiveFilters =
    selectedCategoryIds.length > 0 || selectedTagIds.length > 0 || sortKey !== 'date_asc';

  return (
    <>
      {/* Hidden shared file input for updating photos on existing items */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handlePhotoChange}
      />

      <Group mb="md" align="flex-end" gap={0} wrap="nowrap">
        <ScrollArea style={{ flex: 1 }} type="hover" scrollbarSize={4}>
          <Tabs
            value={roomId}
            onChange={(v) => v && navigate(`/rooms/${v}`)}
            styles={{ list: { flexWrap: 'nowrap' } }}
          >
            <Tabs.List>
              {rooms.map((r) => (
                <Tabs.Tab
                  key={r._id}
                  value={r._id}
                  leftSection={<RoomIcon iconKey={r.icon} size={14} />}
                  rightSection={
                    itemCounts[r._id] ? (
                      <Badge size="xs" color="blue" circle variant="light">
                        {itemCounts[r._id]}
                      </Badge>
                    ) : undefined
                  }
                >
                  {r.name}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs>
        </ScrollArea>
        <Tooltip label="Add room" withArrow position="top">
          <ActionIcon
            variant="subtle"
            color="gray"
            size="md"
            mb={4}
            onClick={() => setCreateRoomOpen(true)}
            aria-label="Add room"
          >
            <IconPlus size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <CreateRoomModal
        opened={createRoomOpen}
        onClose={() => setCreateRoomOpen(false)}
        onCreated={() => setCreateRoomOpen(false)}
      />

      <CreateRoomModal
        opened={editRoomOpen}
        onClose={() => setEditRoomOpen(false)}
        onCreated={() => setEditRoomOpen(false)}
        editRoom={room}
      />

      <Box
        mb="xl"
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          alignItems: 'center',
          gap: 'var(--mantine-spacing-md)',
        }}
      >
        {/* Share — pinned left */}
        <Tooltip label="Share this room" withArrow position="top">
          <ActionIcon
            variant="light"
            color="teal"
            size="md"
            onClick={() =>
              room && setShareLinkTarget({ type: 'room', id: room._id, name: room.name })
            }
            aria-label="Share room"
          >
            <IconShare size={16} />
          </ActionIcon>
        </Tooltip>

        {/* Room meta — middle column; minWidth:0 lets grid shrink it so text can't overflow */}
        <div style={{ minWidth: 0 }}>
          <Group gap={6} align="center">
            <Title order={2}>{room?.name ?? '…'}</Title>
            {room && (
              <Tooltip label="Edit room" withArrow position="top">
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={() => setEditRoomOpen(true)}
                  aria-label="Edit room"
                >
                  <IconEdit size={14} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
          {room?.description && (
            <Text c="dimmed" size="sm" lineClamp={2}>
              {room.description}
            </Text>
          )}
          {!room?.description && (
            <Text c="dimmed" size="sm" style={{ visibility: 'hidden' }}>
              &nbsp;
            </Text>
          )}
          <Text size="xs" c="dimmed" mt={4} style={{ visibility: loading ? 'hidden' : 'visible' }}>
            {filteredItems.length} of {items.length} item{items.length !== 1 ? 's' : ''}
          </Text>
        </div>

        {/* Add Item — pinned right */}
        <Button leftSection={<IconPlus size={16} />} onClick={() => setAddModalOpen(true)}>
          Add Item
        </Button>
      </Box>

      {!loading && items.length > 0 && (
        <Box
          mb="md"
          px="sm"
          py={6}
          style={{
            background: 'var(--mantine-color-gray-2)',
            borderRadius: 'var(--mantine-radius-xs)',
            borderLeft: '3px solid var(--mantine-color-blue-6)',
          }}
        >
          {/* Toolbar row: label + sort + reset */}
          <Group gap="sm" align="flex-end" wrap="wrap" mb={6}>
            <Text
              fw={700}
              size="xs"
              tt="uppercase"
              style={{
                letterSpacing: '0.07em',
                color: 'var(--mantine-color-gray-7)',
                lineHeight: 1,
                paddingBottom: 2,
              }}
            >
              Sort &amp; Filter
            </Text>
            <Select
              size="xs"
              value={sortKey}
              onChange={(v) => setSortKey(v ?? 'date_asc')}
              allowDeselect={false}
              data={[
                { value: 'date_asc', label: 'Oldest first' },
                { value: 'date_desc', label: 'Newest first' },
                { value: 'name_asc', label: 'Name A–Z' },
                { value: 'name_desc', label: 'Name Z–A' },
                { value: 'qty_asc', label: 'Qty ↑' },
                { value: 'qty_desc', label: 'Qty ↓' },
              ]}
              style={{ width: 130 }}
              styles={{ input: { background: 'var(--mantine-color-gray-1)' } }}
            />
            <Button
              size="xs"
              variant="default"
              color="gray"
              disabled={!hasActiveFilters}
              onClick={resetFilters}
              style={{ marginLeft: 'auto' }}
            >
              Reset
            </Button>
          </Group>

          {/* Filter chips row */}
          {(allCategories.length > 0 || allTags.length > 0) && (
            <Group gap={5} wrap="wrap" align="center">
              {allCategories.map((cat) => {
                const active = selectedCategoryIds.includes(cat._id);
                return (
                  <Badge
                    key={cat._id}
                    size="xs"
                    variant={active ? 'filled' : 'light'}
                    color="violet"
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleCategory(cat._id)}
                  >
                    {cat.name}
                  </Badge>
                );
              })}
              {allCategories.length > 0 && allTags.length > 0 && (
                <Text size="xs" c="dimmed" style={{ lineHeight: 1 }}>
                  ·
                </Text>
              )}
              {allTags.map((tag) => {
                const active = selectedTagIds.includes(tag._id);
                return (
                  <Badge
                    key={tag._id}
                    size="xs"
                    variant={active ? 'filled' : 'outline'}
                    color="gray"
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleTag(tag._id)}
                  >
                    {tag.name}
                  </Badge>
                );
              })}
            </Group>
          )}
        </Box>
      )}

      {loading ? (
        <Center h={200}>
          <Loader />
        </Center>
      ) : items.length === 0 ? (
        <Center h={200}>
          <Stack align="center" gap="sm">
            <IconPackage size={52} color="gray" />
            <Text c="dimmed">No items yet. Add your first item to this room.</Text>
            <Button onClick={() => setAddModalOpen(true)}>Add Item</Button>
          </Stack>
        </Center>
      ) : filteredItems.length === 0 ? (
        <Center h={160}>
          <Stack align="center" gap="sm">
            <Text c="dimmed">No items match the selected filters.</Text>
            <Button size="xs" variant="light" onClick={resetFilters}>
              Reset filters
            </Button>
          </Stack>
        </Center>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
          {filteredItems.map((item) => (
            <Card
              key={item._id}
              id={`item-${item._id}`}
              shadow="xs"
              padding="md"
              radius="md"
              withBorder
              className={newItemIds.has(item._id) ? 'item-enter' : undefined}
            >
              {/* Photo area */}
              <ItemPhotoArea
                item={item}
                uploadingFor={uploadingFor}
                onOpenLightbox={(urls, idx) => setLightbox({ urls, initialIndex: idx })}
                onOpenPhotoPicker={openPhotoPicker}
                onPastePhoto={handlePastePhoto}
              />

              <Group justify="space-between" mb={6} wrap="nowrap">
                <Text fw={600} lineClamp={1}>
                  {item.name}
                </Text>
                <Group gap={4} wrap="nowrap">
                  <Tooltip label="Add to a list">
                    <ActionIcon
                      color="teal"
                      variant="subtle"
                      size="sm"
                      onClick={() => setAddToListItem(item)}
                    >
                      <IconList size={14} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Edit item">
                    <ActionIcon
                      color="blue"
                      variant="subtle"
                      size="sm"
                      onClick={() => setEditItem(item)}
                    >
                      <IconEdit size={14} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Use as template">
                    <ActionIcon
                      color="teal"
                      variant="subtle"
                      size="sm"
                      onClick={() => setTemplateItem(item)}
                    >
                      <IconCopy size={14} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Share item">
                    <ActionIcon
                      color="grape"
                      variant="subtle"
                      size="sm"
                      onClick={() =>
                        setShareLinkTarget({ type: 'item', id: item._id, name: item.name })
                      }
                    >
                      <IconShare size={14} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Move to another room">
                    <ActionIcon
                      color="indigo"
                      variant="subtle"
                      size="sm"
                      onClick={() => {
                        setMoveItem(item);
                        setMoveTargetRoomId(null);
                      }}
                    >
                      <IconArrowRight size={14} />
                    </ActionIcon>
                  </Tooltip>
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    size="sm"
                    onClick={() => handleDelete(item)}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Group>
              </Group>

              <Text size="sm" c="dimmed" mb="xs">
                Qty: {item.quantity}
              </Text>

              {item.categories.length > 0 && (
                <Group gap={4} mb={6} wrap="wrap">
                  {item.categories.map((cat) => (
                    <Badge key={cat._id} color="violet" variant="light" size="sm">
                      {cat.name}
                    </Badge>
                  ))}
                </Group>
              )}

              {item.tags.length > 0 && (
                <Group gap={4} wrap="wrap">
                  {item.tags.map((tag) => (
                    <Badge key={tag._id} color="gray" variant="outline" size="sm">
                      {tag.name}
                    </Badge>
                  ))}
                </Group>
              )}

              {item.notes && (
                <>
                  <Divider my="xs" />
                  <Text size="xs" c="dimmed">
                    {item.notes}
                  </Text>
                </>
              )}
            </Card>
          ))}
        </SimpleGrid>
      )}

      <Modal
        opened={!!moveItem}
        onClose={() => {
          setMoveItem(null);
          setMoveTargetRoomId(null);
        }}
        title={`Move "${moveItem?.name}"`}
        size="sm"
      >
        <Stack gap="md">
          <Select
            label="Choose a destination room"
            placeholder="Pick a room..."
            data={rooms
              .filter((r) => r._id !== roomId)
              .map((r) => ({ value: r._id, label: r.name }))}
            value={moveTargetRoomId}
            onChange={setMoveTargetRoomId}
            searchable
          />
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                setMoveItem(null);
                setMoveTargetRoomId(null);
              }}
            >
              Cancel
            </Button>
            <Button disabled={!moveTargetRoomId} onClick={handleMoveConfirm}>
              Move
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={!!lightbox}
        onClose={() => setLightbox(null)}
        size="xl"
        padding={0}
        withCloseButton={false}
        centered
        styles={{
          content: { background: '#111', overflow: 'hidden' },
          body: { padding: 0 },
        }}
      >
        <Box
          style={{ position: 'relative' }}
          onTouchStart={(e) => {
            touchStartY.current = e.touches[0].clientY;
          }}
          onTouchEnd={(e) => {
            if (e.changedTouches[0].clientY - touchStartY.current > 60) setLightbox(null);
          }}
        >
          {/* Overlay close button */}
          <ActionIcon
            style={{ position: 'absolute', top: 10, right: 10, zIndex: 200 }}
            variant="filled"
            color="dark"
            radius="xl"
            size="lg"
            onClick={() => setLightbox(null)}
            aria-label="Close lightbox"
          >
            <IconX size={16} />
          </ActionIcon>

          {lightbox &&
            (lightbox.urls.length > 1 ? (
              <Carousel
                withIndicators
                initialSlide={lightbox.initialIndex}
                emblaOptions={{ loop: true }}
                height={520}
                classNames={{
                  control: 'lightbox-carousel-control',
                  indicator: 'lightbox-carousel-indicator',
                }}
              >
                {lightbox.urls.map((url, idx) => (
                  <Carousel.Slide key={idx}>
                    <Box
                      style={{
                        height: 520,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#111',
                      }}
                    >
                      <Image src={url} fit="contain" mah={520} style={{ maxWidth: '100%' }} />
                    </Box>
                  </Carousel.Slide>
                ))}
              </Carousel>
            ) : (
              <Box
                style={{
                  cursor: 'pointer',
                  userSelect: 'none',
                  background: '#111',
                  minHeight: 300,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onClick={() => setLightbox(null)}
              >
                <Image
                  src={lightbox.urls[0] ?? ''}
                  fit="contain"
                  mah="90vh"
                  style={{ maxWidth: '100%' }}
                />
              </Box>
            ))}
        </Box>
      </Modal>

      {roomId && (
        <AddItemModal
          opened={addModalOpen || editItem !== null || templateItem !== null}
          onClose={() => {
            setAddModalOpen(false);
            setEditItem(null);
            setTemplateItem(null);
          }}
          roomId={editItem?.roomId ?? templateItem?.roomId ?? roomId}
          editItem={editItem ?? undefined}
          template={templateItem ?? undefined}
          onCreated={() => {
            backgroundRefresh();
            refreshCounts();
            setAddModalOpen(false);
            setEditItem(null);
            setTemplateItem(null);
          }}
        />
      )}

      {shareLinkTarget && (
        <ShareLinkModal
          opened={!!shareLinkTarget}
          onClose={() => setShareLinkTarget(null)}
          targetType={shareLinkTarget.type}
          targetId={shareLinkTarget.id}
          targetName={shareLinkTarget.name}
        />
      )}

      {addToListItem && (
        <AddToListModal
          opened={!!addToListItem}
          onClose={() => setAddToListItem(null)}
          itemId={addToListItem._id}
          itemName={addToListItem.name}
        />
      )}
    </>
  );
};

export default RoomPage;
