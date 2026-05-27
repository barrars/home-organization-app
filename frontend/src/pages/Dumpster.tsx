import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ActionIcon,
  Divider,
  Tooltip,
  Modal,
  ThemeIcon,
  SimpleGrid,
  Anchor,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconTrashX,
  IconRestore,
  IconDoor,
  IconPackage,
  IconFlower,
  IconSparkles,
} from '@tabler/icons-react';
import {
  getDumpster,
  restoreItem,
  restoreRoom,
  destroyItem,
  destroyRoom,
  springCleaning,
} from '../services/api';
import { getSocket } from '../services/socket';
import { useRooms } from '../contexts/RoomsContext';
import type { Item, Room } from '../types';

interface DumpsterState {
  items: Item[];
  rooms: Room[];
}

const Dumpster: React.FC = () => {
  const { rooms, refresh: refreshRooms, refreshCounts } = useRooms();
  const navigate = useNavigate();
  const [contents, setContents] = useState<DumpsterState>({ items: [], rooms: [] });
  const [loading, setLoading] = useState(true);
  const [springModalOpen, { open: openSpring, close: closeSpring }] = useDisclosure(false);
  const [springCleaning_loading, setSpringCleaningLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDumpster();
      setContents(data);
    } catch {
      notifications.show({ message: 'Failed to load the Dumpster 🗑️', color: 'red' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Silent background refresh driven by socket events from other tabs/devices.
  const backgroundLoad = useCallback(async () => {
    try {
      const data = await getDumpster();
      setContents(data);
    } catch {
      /* non-critical */
    }
  }, []);

  useEffect(() => {
    const socket = getSocket();
    const events = [
      'item:deleted',
      'room:deleted',
      'item:restored',
      'room:restored',
      'item:destroyed',
      'room:destroyed',
      'dumpster:wiped',
    ];
    events.forEach((e) => socket.on(e, backgroundLoad));
    return () => events.forEach((e) => socket.off(e, backgroundLoad));
  }, [backgroundLoad]);

  const handleRestoreItem = async (item: Item) => {
    try {
      await restoreItem(item._id);
      setContents((prev) => ({ ...prev, items: prev.items.filter((i) => i._id !== item._id) }));
      refreshCounts();
      const roomName = rooms.find((r) => r._id === item.roomId)?.name ?? 'its room';
      notifications.show({
        message: (
          <Group gap="xs" wrap="nowrap" justify="space-between">
            <Text size="sm">✨ "{item.name}" has been rescued!</Text>
            <Anchor
              size="sm"
              fw={600}
              onClick={() => navigate(`/rooms/${item.roomId}`)}
              style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Go to {roomName} →
            </Anchor>
          </Group>
        ),
        color: 'green',
      });
    } catch {
      notifications.show({ message: 'Failed to restore item', color: 'red' });
    }
  };

  const handleRestoreRoom = async (room: Room) => {
    try {
      await restoreRoom(room._id);
      setContents((prev) => ({ ...prev, rooms: prev.rooms.filter((r) => r._id !== room._id) }));
      refreshRooms();
      refreshCounts();
      notifications.show({
        message: (
          <Group gap="xs" wrap="nowrap" justify="space-between">
            <Text size="sm">✨ "{room.name}" is back where it belongs!</Text>
            <Anchor
              size="sm"
              fw={600}
              onClick={() => navigate(`/rooms/${room._id}`)}
              style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Go to room →
            </Anchor>
          </Group>
        ),
        color: 'green',
      });
    } catch {
      notifications.show({ message: 'Failed to restore room', color: 'red' });
    }
  };

  const handleDestroyItem = async (item: Item) => {
    try {
      await destroyItem(item._id);
      setContents((prev) => ({ ...prev, items: prev.items.filter((i) => i._id !== item._id) }));
      refreshCounts();
      notifications.show({ message: `💀 "${item.name}" is gone for good.`, color: 'gray' });
    } catch {
      notifications.show({ message: 'Failed to permanently delete item', color: 'red' });
    }
  };

  const handleDestroyRoom = async (room: Room) => {
    try {
      await destroyRoom(room._id);
      setContents((prev) => ({ ...prev, rooms: prev.rooms.filter((r) => r._id !== room._id) }));
      refreshCounts();
      notifications.show({ message: `💀 "${room.name}" is gone for good.`, color: 'gray' });
    } catch {
      notifications.show({ message: 'Failed to permanently delete room', color: 'red' });
    }
  };

  const handleSpringCleaning = async () => {
    setSpringCleaningLoading(true);
    try {
      await springCleaning();
      setContents({ items: [], rooms: [] });
      refreshCounts();
      closeSpring();
      notifications.show({
        message: '🌸 Spring Cleaning complete! The Dumpster is spotless.',
        color: 'green',
        autoClose: 5000,
      });
    } catch {
      notifications.show({ message: 'Spring Cleaning failed — the mess remains.', color: 'red' });
    } finally {
      setSpringCleaningLoading(false);
    }
  };

  const isEmpty = contents.items.length === 0 && contents.rooms.length === 0;
  const totalCount = contents.items.length + contents.rooms.length;

  return (
    <>
      {/* Spring Cleaning confirmation modal */}
      <Modal
        opened={springModalOpen}
        onClose={closeSpring}
        title={
          <Group gap="xs">
            <ThemeIcon color="pink" variant="light" size="md">
              <IconFlower size={16} />
            </ThemeIcon>
            <Text fw={700}>Spring Cleaning</Text>
          </Group>
        }
        centered
      >
        <Stack>
          <Text size="sm">
            You're about to <strong>permanently delete</strong> everything in the Dumpster — that's{' '}
            <strong>
              {contents.items.length} item{contents.items.length !== 1 ? 's' : ''} and{' '}
              {contents.rooms.length} room{contents.rooms.length !== 1 ? 's' : ''}
            </strong>
            . There's no coming back from this one. 🧹
          </Text>
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={closeSpring}>
              Keep the mess
            </Button>
            <Button
              color="pink"
              leftSection={<IconFlower size={16} />}
              loading={springCleaning_loading}
              onClick={handleSpringCleaning}
            >
              Yes, nuke it all 🌸
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Page header */}
      <Group justify="space-between" mb="xl" align="flex-start">
        <div>
          <Group gap="sm" mb={4}>
            <Title order={2}>The Dumpster</Title>
            {!loading && totalCount > 0 && (
              <Badge color="orange" variant="filled" size="lg" radius="sm">
                {totalCount}
              </Badge>
            )}
          </Group>
          <Text c="dimmed" size="sm">
            Nothing here is gone for good — yet. Restore what you need, or do a little spring
            cleaning.
          </Text>
        </div>
        {!loading && !isEmpty && (
          <Button
            color="pink"
            variant="light"
            leftSection={<IconFlower size={16} />}
            onClick={openSpring}
          >
            🌸 Spring Cleaning
          </Button>
        )}
      </Group>

      {loading ? (
        <Center h={200}>
          <Loader />
        </Center>
      ) : isEmpty ? (
        <Center h={300}>
          <Stack align="center" gap="sm">
            <ThemeIcon size={64} radius="xl" color="green" variant="light">
              <IconSparkles size={32} />
            </ThemeIcon>
            <Text fw={600} size="lg">
              The Dumpster is spotless!
            </Text>
            <Text c="dimmed" size="sm" ta="center" maw={320}>
              You're practically Marie Kondo. Nothing here sparks anything except joy. ✨
            </Text>
          </Stack>
        </Center>
      ) : (
        <Stack gap="xl">
          {/* Trashed Rooms */}
          {contents.rooms.length > 0 && (
            <div>
              <Group gap="xs" mb="sm">
                <IconDoor size={18} color="var(--mantine-color-blue-6)" />
                <Text fw={600}>
                  Trashed Rooms{' '}
                  <Text span c="dimmed" fw={400}>
                    ({contents.rooms.length})
                  </Text>
                </Text>
              </Group>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                {contents.rooms.map((room) => (
                  <Card key={room._id} withBorder padding="md" radius="md" shadow="xs">
                    <Group justify="space-between" wrap="nowrap">
                      <div style={{ minWidth: 0 }}>
                        <Text fw={600} lineClamp={1}>
                          {room.name}
                        </Text>
                        {room.description && (
                          <Text size="xs" c="dimmed" lineClamp={1}>
                            {room.description}
                          </Text>
                        )}
                        <Text size="xs" c="dimmed" mt={2}>
                          Trashed {new Date(room.deletedAt!).toLocaleDateString()}
                        </Text>
                      </div>
                      <Group gap={6} wrap="nowrap">
                        <Tooltip label="Restore room">
                          <ActionIcon
                            color="green"
                            variant="light"
                            onClick={() => handleRestoreRoom(room)}
                          >
                            <IconRestore size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete forever">
                          <ActionIcon
                            color="red"
                            variant="light"
                            onClick={() => handleDestroyRoom(room)}
                          >
                            <IconTrashX size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Group>
                  </Card>
                ))}
              </SimpleGrid>
            </div>
          )}

          {contents.rooms.length > 0 && contents.items.length > 0 && <Divider />}

          {/* Trashed Items */}
          {contents.items.length > 0 && (
            <div>
              <Group gap="xs" mb="sm">
                <IconPackage size={18} color="var(--mantine-color-violet-6)" />
                <Text fw={600}>
                  Trashed Items{' '}
                  <Text span c="dimmed" fw={400}>
                    ({contents.items.length})
                  </Text>
                </Text>
              </Group>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                {contents.items.map((item) => (
                  <Card key={item._id} withBorder padding="md" radius="md" shadow="xs">
                    <Group justify="space-between" wrap="nowrap">
                      <div style={{ minWidth: 0 }}>
                        <Text fw={600} lineClamp={1}>
                          {item.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          Qty: {item.quantity}
                        </Text>
                        {item.categories.length > 0 && (
                          <Group gap={4} mt={4} wrap="wrap">
                            {item.categories.map((cat) => (
                              <Badge key={cat._id} size="xs" color="violet" variant="light">
                                {cat.name}
                              </Badge>
                            ))}
                          </Group>
                        )}
                        <Text size="xs" c="dimmed" mt={4}>
                          Trashed {new Date(item.deletedAt!).toLocaleDateString()}
                        </Text>
                      </div>
                      <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
                        <Tooltip label="Restore item">
                          <ActionIcon
                            color="green"
                            variant="light"
                            onClick={() => handleRestoreItem(item)}
                          >
                            <IconRestore size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete forever">
                          <ActionIcon
                            color="red"
                            variant="light"
                            onClick={() => handleDestroyItem(item)}
                          >
                            <IconTrashX size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Group>
                  </Card>
                ))}
              </SimpleGrid>
            </div>
          )}
        </Stack>
      )}
    </>
  );
};

export default Dumpster;
