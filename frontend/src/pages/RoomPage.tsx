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
  Breadcrumbs,
  Anchor,
  Image,
  Box,
  Tooltip,
  Modal,
  Select,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconTrash,
  IconPackage,
  IconCamera,
  IconPhoto,
  IconEdit,
  IconCopy,
} from '@tabler/icons-react';
import { getItems, deleteItem, uploadImage, updateItem } from '../services/api';
import { getSocket } from '../services/socket';
import { useRooms } from '../contexts/RoomsContext';
import AddItemModal from '../components/AddItemModal';
import type { Item } from '../types';

const getItemImages = (item: Item): string[] => {
  if (Array.isArray(item.imageUrls) && item.imageUrls.length > 0) {
    return item.imageUrls.filter((url) => url?.trim());
  }
  return item.imageUrl?.trim() ? [item.imageUrl] : [];
};

const RoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { rooms, refreshCounts } = useRooms();
  const navigate = useNavigate();
  const room = rooms.find((r) => r._id === roomId);

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [templateItem, setTemplateItem] = useState<Item | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
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
      setItems(data);
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

  const openPhotoPicker = (itemId: string) => {
    activeItemIdRef.current = itemId;
    photoInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const itemId = activeItemIdRef.current;
    if (!file || !itemId) return;

    setUploadingFor(itemId);
    try {
      const newImageUrl = await uploadImage(file);
      const currentItem = items.find((i) => i._id === itemId);
      const currentImages = currentItem ? getItemImages(currentItem) : [];
      const imageUrls = [...currentImages, newImageUrl];
      await updateItem(itemId, { imageUrls });
      setItems((prev) =>
        prev.map((i) => (i._id === itemId ? { ...i, imageUrls, imageUrl: imageUrls[0] ?? '' } : i)),
      );
      notifications.show({ message: 'Photo added!', color: 'green' });
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
        style={{ display: 'none' }}
        onChange={handlePhotoChange}
      />

      <Breadcrumbs mb="md">
        <Anchor onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          Dashboard
        </Anchor>
        <Text>{room?.name ?? '…'}</Text>
      </Breadcrumbs>

      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2}>{room?.name ?? <Loader size="sm" />}</Title>
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
        <Button leftSection={<IconPlus size={16} />} onClick={() => setAddModalOpen(true)}>
          Add Item
        </Button>
      </Group>

      {!loading && items.length > 0 && (
        <Card withBorder radius="md" padding="sm" mb="md">
          <Group justify="space-between" align="center" mb="xs">
            <Text fw={600} size="sm">
              Sort &amp; Filter
            </Text>
            <Button
              size="xs"
              variant="light"
              color="gray"
              disabled={!hasActiveFilters}
              onClick={resetFilters}
            >
              Reset
            </Button>
          </Group>

          <Box mb="xs">
            <Select
              size="xs"
              label="Sort by"
              value={sortKey}
              onChange={(v) => setSortKey(v ?? 'date_asc')}
              allowDeselect={false}
              data={[
                { value: 'date_asc', label: 'Oldest first' },
                { value: 'date_desc', label: 'Newest first' },
                { value: 'name_asc', label: 'Name A → Z' },
                { value: 'name_desc', label: 'Name Z → A' },
                { value: 'qty_asc', label: 'Qty low → high' },
                { value: 'qty_desc', label: 'Qty high → low' },
              ]}
              style={{ maxWidth: 180 }}
            />
          </Box>

          {allCategories.length > 0 && (
            <Box mb="xs">
              <Text size="xs" c="dimmed" mb={6}>
                Categories
              </Text>
              <Group gap={6} wrap="wrap">
                {allCategories.map((cat) => {
                  const active = selectedCategoryIds.includes(cat._id);
                  return (
                    <Badge
                      key={cat._id}
                      size="sm"
                      variant={active ? 'filled' : 'light'}
                      color="violet"
                      style={{ cursor: 'pointer' }}
                      onClick={() => toggleCategory(cat._id)}
                    >
                      {cat.name}
                    </Badge>
                  );
                })}
              </Group>
            </Box>
          )}

          {allTags.length > 0 && (
            <Box>
              <Text size="xs" c="dimmed" mb={6}>
                Tags
              </Text>
              <Group gap={6} wrap="wrap">
                {allTags.map((tag) => {
                  const active = selectedTagIds.includes(tag._id);
                  return (
                    <Badge
                      key={tag._id}
                      size="sm"
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
            </Box>
          )}
        </Card>
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
            <Card key={item._id} shadow="xs" padding="md" radius="md" withBorder>
              {/* Photo area */}
              {getItemImages(item).length > 0 ? (
                <Card.Section mb="sm" style={{ position: 'relative' }}>
                  {getItemImages(item).length > 1 && (
                    <Badge
                      size="xs"
                      variant="filled"
                      color="dark"
                      style={{ position: 'absolute', top: 8, left: 8, zIndex: 2 }}
                    >
                      +{getItemImages(item).length - 1}
                    </Badge>
                  )}
                  <Image
                    src={getItemImages(item)[0]}
                    height={160}
                    fit="scale-down"
                    style={{ cursor: 'zoom-in' }}
                    onClick={() => setLightboxImage(getItemImages(item)[0])}
                  />
                  <Tooltip label="Add another photo">
                    <ActionIcon
                      style={{ position: 'absolute', bottom: 8, right: 8 }}
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
            loadItems();
            refreshCounts();
            setAddModalOpen(false);
            setEditItem(null);
            setTemplateItem(null);
          }}
        />
      )}
    </>
  );
};

export default RoomPage;
