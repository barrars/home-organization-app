import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ActionIcon,
  Anchor,
  Badge,
  Card,
  Center,
  Group,
  Loader,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCopy, IconEdit, IconList, IconPackage, IconTrash } from '@tabler/icons-react';
import { deleteItem, getItems } from '../services/api';
import { useRooms } from '../contexts/RoomsContext';
import AddItemModal from './AddItemModal';
import AddToListModal from './AddToListModal';
import type { Item } from '../types';

interface Props {
  /** Bump this number to trigger a list refresh from the parent */
  refresh?: number;
}

const InventoryList: React.FC<Props> = ({ refresh }) => {
  const { rooms } = useRooms();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRoomId, setFilterRoomId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [templateItem, setTemplateItem] = useState<Item | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [addToListItem, setAddToListItem] = useState<Item | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getItems();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refresh]);

  const handleDelete = async (item: Item) => {
    try {
      await deleteItem(item._id);
      setItems((prev) => prev.filter((i) => i._id !== item._id));
      notifications.show({
        title: 'Moved to Dumpster',
        message: `"${item.name}" can be recovered from the Dumpster.`,
        color: 'orange',
      });
    } catch {
      notifications.show({ title: 'Error', message: 'Could not delete item.', color: 'red' });
    }
  };

  const openEdit = (item: Item) => {
    setEditItem(item);
    setTemplateItem(null);
    setModalOpen(true);
  };

  const openDuplicate = (item: Item) => {
    setTemplateItem(item);
    setEditItem(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditItem(null);
    setTemplateItem(null);
  };

  const roomName = (id: string) => rooms.find((r) => r._id === id)?.name ?? '—';

  const displayed = filterRoomId ? items.filter((i) => i.roomId === filterRoomId) : items;

  if (loading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap">
        <Text size="sm" c="dimmed">
          {displayed.length} item{displayed.length !== 1 ? 's' : ''}
          {filterRoomId ? '' : ' across all rooms'}
        </Text>
        <Select
          placeholder="Filter by room"
          clearable
          data={rooms.map((r) => ({ value: r._id, label: r.name }))}
          value={filterRoomId}
          onChange={setFilterRoomId}
          w={200}
          size="xs"
        />
      </Group>

      {displayed.length === 0 && (
        <Center py="xl">
          <Stack align="center" gap="xs">
            <IconPackage size={40} opacity={0.3} />
            <Text c="dimmed" size="sm">
              {filterRoomId
                ? 'No items in this room.'
                : 'No items yet — use Bulk Add to get started.'}
            </Text>
          </Stack>
        </Center>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
        {displayed.map((item) => (
          <Card
            key={item._id}
            withBorder
            radius="md"
            p="sm"
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            <Group justify="space-between" mb={4} wrap="nowrap">
              <Text fw={600} size="sm" lineClamp={1} style={{ flex: 1 }}>
                {item.name}
              </Text>
              <Badge size="xs" variant="light" color="blue" ml={4}>
                {item.quantity}×
              </Badge>
            </Group>

            <Anchor
              size="xs"
              c="dimmed"
              mb={6}
              component={Link}
              to={`/rooms/${item.roomId}`}
              style={{ display: 'block' }}
            >
              {roomName(item.roomId)}
            </Anchor>

            {item.categories.length > 0 && (
              <Group gap={4} mb={4} wrap="wrap">
                {item.categories.map((c) => (
                  <Badge key={c._id} size="xs" variant="outline">
                    {c.name}
                  </Badge>
                ))}
              </Group>
            )}

            {item.tags.length > 0 && (
              <Group gap={4} mb={4} wrap="wrap">
                {item.tags.map((t) => (
                  <Badge key={t._id} size="xs" color="grape" variant="dot">
                    {t.name}
                  </Badge>
                ))}
              </Group>
            )}

            {item.notes && (
              <Text size="xs" c="dimmed" lineClamp={2} mb={6}>
                {item.notes}
              </Text>
            )}

            <Group gap={4} justify="flex-end" mt="auto">
              <Tooltip label="Add to List" withArrow>
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="teal"
                  onClick={() => setAddToListItem(item)}
                >
                  <IconList size={14} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Duplicate" withArrow>
                <ActionIcon size="sm" variant="subtle" onClick={() => openDuplicate(item)}>
                  <IconCopy size={14} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Edit" withArrow>
                <ActionIcon size="sm" variant="subtle" onClick={() => openEdit(item)}>
                  <IconEdit size={14} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Move to Dumpster" withArrow>
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="red"
                  onClick={() => handleDelete(item)}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Card>
        ))}
      </SimpleGrid>

      {(editItem || templateItem) && (
        <AddItemModal
          opened={modalOpen}
          onClose={closeModal}
          roomId={(editItem ?? templateItem)!.roomId}
          editItem={editItem ?? undefined}
          template={templateItem ?? undefined}
          onCreated={() => {
            closeModal();
            load();
          }}
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
    </Stack>
  );
};

export default InventoryList;
