import React, { useEffect, useState, useCallback } from 'react';
import {
  Title,
  Text,
  Button,
  Group,
  Stack,
  Card,
  Badge,
  Loader,
  Center,
  Select,
  Modal,
  SimpleGrid,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconHome2, IconTrash } from '@tabler/icons-react';
import { getYardSaleItems, updateItem, deleteItem } from '../services/api';
import { getSocket } from '../services/socket';
import { useRooms } from '../contexts/RoomsContext';
import type { YardSaleItem } from '../types';

const YardSale: React.FC = () => {
  const { rooms, refreshCounts } = useRooms();
  const [items, setItems] = useState<YardSaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingItem, setMovingItem] = useState<YardSaleItem | null>(null);
  const [targetRoomId, setTargetRoomId] = useState<string | null>(null);
  const [moveModalOpen, { open: openMoveModal, close: closeMoveModal }] = useDisclosure(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getYardSaleItems();
      setItems(data);
    } catch {
      notifications.show({ message: 'Failed to load yard sale items', color: 'red' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const backgroundLoad = useCallback(async () => {
    try {
      const data = await getYardSaleItems();
      setItems(data);
    } catch {
      /* non-critical */
    }
  }, []);

  useEffect(() => {
    const socket = getSocket();
    const events = [
      'item:updated',
      'item:deleted',
      'item:restored',
      'room:restored',
      'room:deleted',
    ];
    events.forEach((e) => socket.on(e, backgroundLoad));
    return () => events.forEach((e) => socket.off(e, backgroundLoad));
  }, [backgroundLoad]);

  const handleMoveOpen = (item: YardSaleItem) => {
    setMovingItem(item);
    setTargetRoomId(null);
    openMoveModal();
  };

  const handleMoveConfirm = async () => {
    if (!movingItem || !targetRoomId) return;
    try {
      await updateItem(movingItem._id, { roomId: targetRoomId });
      setItems((prev) => prev.filter((i) => i._id !== movingItem._id));
      refreshCounts();
      const roomName = rooms.find((r) => r._id === targetRoomId)?.name ?? 'the new room';
      notifications.show({
        message: `"${movingItem.name}" moved to ${roomName} ✅`,
        color: 'green',
      });
      closeMoveModal();
    } catch {
      notifications.show({ message: 'Failed to move item', color: 'red' });
    }
  };

  const handleToss = async (item: YardSaleItem) => {
    setItems((prev) => prev.filter((i) => i._id !== item._id));
    try {
      await deleteItem(item._id);
      refreshCounts();
      notifications.show({ message: `"${item.name}" tossed in the Dumpster 🗑️`, color: 'orange' });
    } catch {
      setItems((prev) => [...prev, item].sort((a, b) => a.name.localeCompare(b.name)));
      notifications.show({ message: 'Failed to trash item', color: 'red' });
    }
  };

  const getOldRoomName = (item: YardSaleItem): string =>
    typeof item.roomId === 'object' && item.roomId !== null ? item.roomId.name : 'unknown room';

  const activeRoomOptions = rooms.map((r) => ({ value: r._id, label: r.name }));

  if (loading)
    return (
      <Center h={200}>
        <Loader />
      </Center>
    );

  return (
    <>
      <Modal
        opened={moveModalOpen}
        onClose={closeMoveModal}
        title={`Move "${movingItem?.name}"`}
        size="sm"
      >
        <Stack>
          <Select
            label="Choose a room"
            placeholder="Pick a room..."
            data={activeRoomOptions}
            value={targetRoomId}
            onChange={setTargetRoomId}
            searchable
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeMoveModal}>
              Cancel
            </Button>
            <Button disabled={!targetRoomId} onClick={handleMoveConfirm}>
              Move
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2}>🏡 The Front Yard</Title>
          <Text c="dimmed" size="sm">
            Items left stranded when their room was sent to the Dumpster.
          </Text>
        </div>
        {items.length > 0 && (
          <Badge size="lg" color="yellow" variant="light">
            {items.length} item{items.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </Group>

      {items.length === 0 ? (
        <Center h={200}>
          <Stack align="center" gap="xs">
            <Text size="xl">🌿</Text>
            <Text c="dimmed">Nothing out here — the yard is tidy!</Text>
          </Stack>
        </Center>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {items.map((item) => (
            <Card key={item._id} shadow="sm" padding="md" radius="md" withBorder>
              <Stack gap="xs">
                <Group justify="space-between" align="flex-start">
                  <Text fw={600} size="md" style={{ flex: 1 }}>
                    {item.name}
                  </Text>
                  <Badge size="sm" variant="light" color="gray">
                    ×{item.quantity}
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed">
                  Was in: <b>{getOldRoomName(item)}</b>
                </Text>
                {item.categories.length > 0 && (
                  <Group gap={4} wrap="wrap">
                    {item.categories.map((c) => (
                      <Badge key={c._id} size="xs" color="blue" variant="light">
                        {c.name}
                      </Badge>
                    ))}
                  </Group>
                )}
                {item.tags.length > 0 && (
                  <Group gap={4} wrap="wrap">
                    {item.tags.map((t) => (
                      <Badge key={t._id} size="xs" color="grape" variant="light">
                        {t.name}
                      </Badge>
                    ))}
                  </Group>
                )}
                {item.notes && (
                  <Text size="xs" c="dimmed" lineClamp={2}>
                    {item.notes}
                  </Text>
                )}
                <Group gap="xs" mt="xs">
                  <Button
                    size="xs"
                    leftSection={<IconHome2 size={12} />}
                    onClick={() => handleMoveOpen(item)}
                  >
                    Move to Room
                  </Button>
                  <Button
                    size="xs"
                    variant="light"
                    color="orange"
                    leftSection={<IconTrash size={12} />}
                    onClick={() => handleToss(item)}
                  >
                    Toss
                  </Button>
                </Group>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </>
  );
};

export default YardSale;
