import React, { useState, useEffect } from 'react';
import {
  Title,
  Text,
  Grid,
  Button,
  Group,
  Card,
  Center,
  Stack,
  Skeleton,
  Badge,
  ActionIcon,
  Anchor,
  Divider,
  SimpleGrid,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconDoor, IconTrash, IconEdit } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useRooms } from '../contexts/RoomsContext';
import { deleteRoom, getItems, getTags } from '../services/api';
import type { Room, Item, Tag } from '../types';
import CreateRoomModal from '../components/CreateRoomModal';
import { RoomIcon } from '../utils/roomIcons';

const Dashboard: React.FC = () => {
  const { rooms, loading, backgroundRefresh, newRoomIds, removeRoom, refreshCounts, itemCounts } =
    useRooms();
  const [modalOpen, setModalOpen] = useState(false);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [recentItems, setRecentItems] = useState<Item[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    Promise.all([getItems(), getTags()])
      .then(([items, allTags]) => {
        if (cancelled) return;
        const sorted = [...items].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setRecentItems(sorted.slice(0, 6));
        setTags(allTags);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingExtras(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = async (e: React.MouseEvent, room: Room) => {
    e.stopPropagation();
    removeRoom(room._id);
    try {
      await deleteRoom(room._id);
      refreshCounts();
      notifications.show({
        message: (
          <Group gap="xs" wrap="nowrap" justify="space-between">
            <Text size="sm">🗑️ "{room.name}" tossed in the Dumpster</Text>
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
      notifications.show({ message: 'Failed to delete room', color: 'red' });
    }
  };

  return (
    <>
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2}>Your Rooms</Title>
          <Text c="dimmed" size="sm">
            {loading ? '…' : `${rooms.length} room${rooms.length !== 1 ? 's' : ''}`}
          </Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpen(true)}>
          Add Room
        </Button>
      </Group>

      {loading ? (
        <Grid>
          {Array.from({ length: 4 }).map((_, i) => (
            <Grid.Col key={i} span={{ base: 12, sm: 6, md: 4 }}>
              <Skeleton h={130} radius="md" />
            </Grid.Col>
          ))}
        </Grid>
      ) : rooms.length === 0 ? (
        <Center h={300}>
          <Stack align="center" gap="sm">
            <IconDoor size={52} color="gray" />
            <Text c="dimmed">No rooms yet. Create your first room to get started.</Text>
            <Button onClick={() => setModalOpen(true)}>Create a Room</Button>
          </Stack>
        </Center>
      ) : (
        <Grid>
          {rooms.map((room) => (
            <Grid.Col key={room._id} span={{ base: 12, sm: 6, md: 4 }}>
              <Card
                shadow="sm"
                padding="lg"
                radius="md"
                withBorder
                style={{ cursor: 'pointer' }}
                className={newRoomIds.has(room._id) ? 'item-enter' : undefined}
                onClick={() => navigate(`/rooms/${room._id}`)}
              >
                <Group justify="space-between" mb="xs" wrap="nowrap">
                  <Group gap="xs">
                    <RoomIcon iconKey={room.icon} size={20} color="var(--mantine-color-blue-6)" />
                    <Text fw={600} size="lg" lineClamp={1}>
                      {room.name}
                    </Text>
                  </Group>
                  <Group gap={4} wrap="nowrap">
                    <ActionIcon
                      color="blue"
                      variant="subtle"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditRoom(room);
                      }}
                    >
                      <IconEdit size={14} />
                    </ActionIcon>
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      size="sm"
                      onClick={(e) => handleDelete(e, room)}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                </Group>
                <Group justify="space-between" align="flex-end">
                  {room.description && (
                    <Text size="sm" c="dimmed" lineClamp={2} style={{ flex: 1 }}>
                      {room.description}
                    </Text>
                  )}
                  <Badge color="blue" variant="light" size="sm" ml={room.description ? 'xs' : 0}>
                    {itemCounts[room._id] ?? 0} item{(itemCounts[room._id] ?? 0) !== 1 ? 's' : ''}
                  </Badge>
                </Group>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      )}

      <CreateRoomModal
        opened={modalOpen || editRoom !== null}
        onClose={() => {
          setModalOpen(false);
          setEditRoom(null);
        }}
        onCreated={() => {
          backgroundRefresh();
          setModalOpen(false);
          setEditRoom(null);
        }}
        editRoom={editRoom ?? undefined}
      />

      {/* ── Recently Added ────────────────────────────── */}
      <Divider mt="xl" mb="md" label="Recently Added" labelPosition="left" />
      {loadingExtras ? (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} h={80} radius="md" />
          ))}
        </SimpleGrid>
      ) : recentItems.length === 0 ? (
        <Text size="sm" c="dimmed">
          No items yet — add some to a room to see them here.
        </Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
          {recentItems.map((item) => {
            const room = rooms.find((r) => r._id === item.roomId);
            return (
              <Card
                key={item._id}
                withBorder
                radius="md"
                padding="sm"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/rooms/${item.roomId}`)}
              >
                <Group justify="space-between" wrap="nowrap" mb={2}>
                  <Text size="sm" fw={500} lineClamp={1}>
                    {item.name}
                  </Text>
                  {item.quantity > 1 && (
                    <Badge size="xs" color="blue" variant="light">
                      ×{item.quantity}
                    </Badge>
                  )}
                </Group>
                {room && (
                  <Text size="xs" c="dimmed">
                    <RoomIcon iconKey={room.icon} size={11} /> {room.name}
                  </Text>
                )}
                {item.tags.length > 0 && (
                  <Group gap={4} mt={4}>
                    {item.tags.slice(0, 4).map((t) => (
                      <Badge key={t._id} size="xs" variant="outline" color="gray">
                        {t.name}
                      </Badge>
                    ))}
                  </Group>
                )}
              </Card>
            );
          })}
        </SimpleGrid>
      )}

      {/* ── Tags in Use ───────────────────────────────── */}
      {!loadingExtras && tags.length > 0 && (
        <>
          <Divider mt="xl" mb="md" label="Tags in Use" labelPosition="left" />
          <Group gap="xs">
            {tags.map((tag) => (
              <Badge
                key={tag._id}
                variant="outline"
                color="gray"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/search?q=${encodeURIComponent(tag.name)}`)}
              >
                {tag.name}
              </Badge>
            ))}
          </Group>
        </>
      )}
    </>
  );
};

export default Dashboard;
