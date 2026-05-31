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
import { IconCheck, IconTrash } from '@tabler/icons-react';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../services/api';
import { useNotifications } from '../contexts/NotificationsContext';
import type { Notification } from '../types';

const eventLabels: Record<string, string> = {
  'item:created': 'A new item was added',
  'item:updated': 'An item was updated',
  'item:deleted': 'An item was trashed',
  'item:restored': 'An item was restored',
  'item:destroyed': 'An item was permanently deleted',
  'room:created': 'A new room was created',
  'room:updated': 'A room was updated',
  'room:deleted': 'A room was trashed',
  'room:restored': 'A room was restored',
  'room:destroyed': 'A room was permanently deleted',
  'dumpster:wiped': 'The trash was emptied',
};

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { refreshCount } = useNotifications();

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
                      {eventLabels[notification.event] ?? notification.event}
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
