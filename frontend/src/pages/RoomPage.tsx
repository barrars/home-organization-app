import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
} from '@tabler/icons-react';
import { getItems, deleteItem, uploadImage, updateItem } from '../services/api';
import { getSocket } from '../services/socket';
import { useRooms } from '../contexts/RoomsContext';
import AddItemModal from '../components/AddItemModal';
import CreateRoomModal from '../components/CreateRoomModal';
import ShareLinkModal from '../components/ShareLinkModal';
import type { Item } from '../types';
import { RoomIcon } from '../utils/roomIcons';

const getItemImages = (item: Item): string[] => {
  if (Array.isArray(item.imageUrls) && item.imageUrls.length > 0) {
    return item.imageUrls.filter((url) => url?.trim());
  }
  return item.imageUrl?.trim() ? [item.imageUrl] : [];
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
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [moveItem, setMoveItem] = useState<Item | null>(null);
  const [moveTargetRoomId, setMoveTargetRoomId] = useState<string | null>(null);
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [editRoomOpen, setEditRoomOpen] = useState(false);
  const [shareLinkTarget, setShareLinkTarget] = useState<{ type: 'room' | 'item'; id: string; name: string } | null>(null);

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

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const itemId = activeItemIdRef.current;
    if (!files || files.length === 0 || !itemId) return;

    setUploadingFor(itemId);
    try {
      const newUrls = await Promise.all(Array.from(files).map((f) => uploadImage(f)));
      const currentItem = items.find((i) => i._id === itemId);
      const currentImages = currentItem ? getItemImages(currentItem) : [];
      const imageUrls = [...currentImages, ...newUrls];
      await updateItem(itemId, { imageUrls });
      setItems((prev) =>
        prev.map((i) => (i._id === itemId ? { ...i, imageUrls, imageUrl: imageUrls[0] ?? '' } : i)),
      );
      notifications.show({ message: `${newUrls.length > 1 ? `${newUrls.length} photos` : 'Photo'} added!`, color: 'green' });
    } catch {
      notifications.show({ message: 'Failed to upload photo', color: 'red' });
    } finally {
      setUploadingFor(null);
      activeItemIdRef.current = null;
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
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
        <ScrollArea style={{ flex: 1 }} type="hover">
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

      <Group justify="space-between" mb="xl">
        <Group gap={6} align="center">
          <div>
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
              <Text c="dimmed" size="sm">
                {room.description}
              </Text>
            )}
            {!loading && (
              <Text size="xs" c="dimmed" mt={4}>
                {filteredItems.length} of {items.length} item{items.length !== 1 ? 's' : ''}
              </Text>
            )}
          </div>
        </Group>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setAddModalOpen(true)}>
          Add Item
        </Button>
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
      </Group>

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
              shadow="xs"
              padding="md"
              radius="md"
              withBorder
              className={newItemIds.has(item._id) ? 'item-enter' : undefined}
            >
              {/* Photo area */}
              {getItemImages(item).length > 0 ? (
                <Card.Section mb="sm" style={{ position: 'relative' }}>
                  {getItemImages(item).length > 1 ? (
                    <div style={{ position: 'relative' }}>
                      <Badge
                        size="xs"
                        variant="filled"
                        color="dark"
                        style={{ position: 'absolute', top: 8, left: 8, zIndex: 10, pointerEvents: 'none' }}
                      >
                        {getItemImages(item).length} photos
                      </Badge>
                      <Carousel loop withIndicators height={160}>
                        {getItemImages(item).map((url, idx) => (
                          <Carousel.Slide key={idx}>
                            <Image
                              src={url}
                              height={160}
                              fit="scale-down"
                              style={{ cursor: 'zoom-in' }}
                              onClick={() => setLightboxImage(url)}
                            />
                          </Carousel.Slide>
                        ))}
                      </Carousel>
                    </div>
                  ) : (
                    <Image
                      src={getItemImages(item)[0]}
                      height={160}
                      fit="scale-down"
                      style={{ cursor: 'zoom-in' }}
                      onClick={() => setLightboxImage(getItemImages(item)[0])}
                    />
                  )}
                  <Tooltip label="Add photo(s)">
                    <ActionIcon
                      style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 3 }}
                      size="sm"
                      variant="filled"
                      color="dark"
                      opacity={0.75}
                      onClick={() => openPhotoPicker(item._id)}
                      loading={uploadingFor === item._id}
                    >
                      <IconCamera size={13} />
                    </ActionIcon>
                  </Tooltip>
                </Card.Section>
              ) : (
                <Box
                  mb="sm"
                  h={72}
                  onClick={() => openPhotoPicker(item._id)}
                  style={{
                    border: '2px dashed var(--mantine-color-gray-3)',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    color: 'var(--mantine-color-dimmed)',
                  }}
                >
                  {uploadingFor === item._id ? (
                    <Loader size="xs" />
                  ) : (
                    <>
                      <IconPhoto size={18} />
                      <Text size="xs">Add Photo</Text>
                    </>
                  )}
                </Box>
              )}

              <Group justify="space-between" mb={6} wrap="nowrap">
                <Text fw={600} lineClamp={1}>
                  {item.name}
                </Text>
                <Group gap={4} wrap="nowrap">
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
        opened={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
        size="xl"
        padding={0}
        withCloseButton={false}
        centered
        styles={{ body: { padding: 0 } }}
      >
        <Box
          style={{ cursor: 'pointer', userSelect: 'none' }}
          onClick={() => setLightboxImage(null)}
          onTouchStart={(e) => {
            touchStartY.current = e.touches[0].clientY;
          }}
          onTouchEnd={(e) => {
            if (e.changedTouches[0].clientY - touchStartY.current > 60) {
              setLightboxImage(null);
            }
          }}
        >
          <Image src={lightboxImage ?? ''} fit="contain" mah="90vh" />
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
    </>
  );
};

export default RoomPage;
