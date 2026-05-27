import React, { useState } from 'react';
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
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconDoor, IconTrash, IconEdit } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useRooms } from '../contexts/RoomsContext';
import { deleteRoom } from '../services/api';
import type { Room } from '../types';
import CreateRoomModal from '../components/CreateRoomModal';
import { RoomIcon } from '../utils/roomIcons';

const Dashboard: React.FC = () => {
  const { rooms, loading, refresh, removeRoom, refreshCounts } = useRooms();
  const [modalOpen, setModalOpen] = useState(false);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const navigate = useNavigate();

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
            <Anchor size="sm" fw={600} onClick={() => navigate('/dumpster')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
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
                      onClick={(e) => { e.stopPropagation(); setEditRoom(room); }}
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
                {room.description ? (
                  <Text size="sm" c="dimmed" lineClamp={2}>
                    {room.description}
                  </Text>
                ) : (
                  <Badge color="blue" variant="light" size="sm">
                    Click to view items
                  </Badge>
                )}
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      )}

      <CreateRoomModal
        opened={modalOpen || editRoom !== null}
        onClose={() => { setModalOpen(false); setEditRoom(null); }}
        onCreated={() => {
          refresh();
          setModalOpen(false);
          setEditRoom(null);
        }}
        editRoom={editRoom ?? undefined}
      />
    </>
  );
};

export default Dashboard;
