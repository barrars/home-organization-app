import React, { useEffect, useState } from 'react';
import {
  Container,
  Title,
  Text,
  Card,
  Group,
  Stack,
  Loader,
  ActionIcon,
  Button,
  Badge,
} from '@mantine/core';
import { IconCheck, IconTrash, IconArrowRight } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../services/api';
import { useNotifications } from '../contexts/NotificationsContext';
import type { Notification } from '../types';

function getLabel(notification: Notification): string {
  const d = (notification.data ?? {}) as Record<string, string>;
  const itemName = d.itemName;
  const roomName = d.roomName;
  const homeName = d.homeName;

  const item = itemName ? `"${itemName}"` : 'An item';
  const room = roomName ? `"${roomName}"` : 'a room';
  const inRoom = roomName ? ` in ${room}` : '';
  const inHome = homeName ? ` · ${homeName}` : '';

  switch (notification.event) {
    case 'item:created':       return `${item} added${inRoom}${inHome}`;
    case 'item:updated':       return `${item} updated${inRoom}${inHome}`;
    case 'item:deleted':       return `${item} trashed${inRoom}${inHome}`;
    case 'item:restored':      return `${item} restored${inRoom}${inHome}`;
    case 'item:destroyed':     return `${item} permanently deleted`;
    case 'room:created':       return `Room ${room} created${inHome}`;
    case 'room:updated':       return `Room ${room} updated${inHome}`;
    case 'room:deleted':       return `Room ${room} trashed${inHome}`;
    case 'room:restored':      return `Room ${room} restored${inHome}`;
    case 'room:destroyed':     return `Room ${room} permanently deleted`;
    case 'share:item:created': return `${item} added to ${room}${inHome}`;
    case 'share:item:updated': return `${item} updated in ${room}${inHome}`;
    case 'share:item:deleted': return `${item} removed from ${room}${inHome}`;
    case 'share:room:updated': return `Room ${room} updated${inHome}`;
    case 'dumpster:wiped':     return 'The trash was emptied';
    default:                   return notification.event;
  }
}

function getDestination(notification: Notification): string | null {
  const d = (notification.data ?? {}) as Record<string, string>;
  const event = notification.event;

  // Share notifications: use the share link token if available
  if (event.startsWith('share:')) {
    if (d.shareLinkToken) return `/share/${d.shareLinkToken}`;
    return '/shared-with-me';
  }

  // Own room notifications
  if (event.startsWith('room:')) {
    const roomId = d.id;
    if (roomId) return `/rooms/${roomId}`;
    return null;
  }

  // Own item notifications — link to the room
  if (event.startsWith('item:')) {
    const roomId = d.roomId;
    if (roomId) return `/rooms/${roomId}`;
    return null;
  }

  return null;
}

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { refreshCount } = useNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    getNotifications({ limit: 100 })
      .then(setNotifications)
      .finally(() => setLoading(false));
  }, []);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    refreshCount();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    refreshCount();
  };

  const handleDelete = async (id: string) => {
    await deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n._id !== id));
    refreshCount();
  };

  if (loading) {
    return (
      <Container size="sm" py="xl" style={{ textAlign: 'center' }}>
        <Loader />
      </Container>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Container size="sm" py="xl">
      <Group justify="space-between" mb="lg">
        <Title order={2}>Notifications</Title>
        {unreadCount > 0 && (
          <Button variant="light" size="xs" onClick={handleMarkAllRead}>
            Mark all as read
          </Button>
        )}
      </Group>
      {notifications.length === 0 ? (
        <Text c="dimmed" ta="center" mt="xl">
          No notifications yet.
        </Text>
      ) : (
        <Stack gap="sm">
          {notifications.map((notification) => (
            <Card
              key={notification._id}
              shadow="xs"
              padding="sm"
              radius="md"
              withBorder
              style={{
                opacity: notification.read ? 0.7 : 1,
                borderLeft: notification.read ? undefined : '3px solid var(--mantine-color-blue-5)',
              }}
            >
              <Group justify="space-between" wrap="nowrap">
                <div style={{ flex: 1 }}>
                  <Group gap="xs" mb={2}>
                    <Text size="sm" fw={notification.read ? 400 : 600}>
                      {getLabel(notification)}
                    </Text>
                    {!notification.read && (
                      <Badge size="xs" color="blue">
                        New
                      </Badge>
                    )}
                  </Group>
                  <Text size="xs" c="dimmed">
                    {new Date(notification.createdAt).toLocaleString()}
                  </Text>
                </div>
                <Group gap={4}>
                  {!notification.read && (
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      size="sm"
                      onClick={() => handleMarkRead(notification._id)}
                      aria-label="Mark as read"
                    >
                      <IconCheck size={14} />
                    </ActionIcon>
                  )}
                  {(() => {
                    const dest = getDestination(notification);
                    return dest ? (
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="sm"
                        onClick={() => navigate(dest)}
                        aria-label="Go to origin"
                      >
                        <IconArrowRight size={14} />
                      </ActionIcon>
                    ) : null;
                  })()}
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="sm"
                    onClick={() => handleDelete(notification._id)}
                    aria-label="Delete notification"
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  );
};

export default Notifications;
