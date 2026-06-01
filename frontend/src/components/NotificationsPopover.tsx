import React, { useEffect, useState, useCallback } from 'react';
import {
  Popover,
  ActionIcon,
  Badge,
  Text,
  Stack,
  Group,
  Button,
  ScrollArea,
  Loader,
  Divider,
  UnstyledButton,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconBell, IconCheck, IconTrash } from '@tabler/icons-react';
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
  const item = itemName ? `"${itemName}"` : 'An item';
  const room = roomName ? `"${roomName}"` : 'a room';
  const inRoom = roomName ? ` in ${room}` : '';

  switch (notification.event) {
    case 'item:created':       return `${item} added${inRoom}`;
    case 'item:updated':       return `${item} updated${inRoom}`;
    case 'item:deleted':       return `${item} trashed${inRoom}`;
    case 'item:restored':      return `${item} restored${inRoom}`;
    case 'item:destroyed':     return `${item} permanently deleted`;
    case 'room:created':       return `Room ${room} created`;
    case 'room:updated':       return `Room ${room} updated`;
    case 'room:deleted':       return `Room ${room} trashed`;
    case 'room:restored':      return `Room ${room} restored`;
    case 'room:destroyed':     return `Room ${room} permanently deleted`;
    case 'share:item:created': return `${item} added to ${room}`;
    case 'share:item:updated': return `${item} updated in ${room}`;
    case 'share:item:deleted': return `${item} removed from ${room}`;
    case 'share:room:updated': return `Room ${room} updated`;
    case 'dumpster:wiped':     return 'The trash was emptied';
    default:                   return notification.event;
  }
}

function getDestination(notification: Notification): string | null {
  const d = (notification.data ?? {}) as Record<string, string>;
  const event = notification.event;
  if (event.startsWith('share:')) return d.shareLinkToken ? `/share/${d.shareLinkToken}` : '/shared-with-me';
  if (event.startsWith('room:') && d.id) return `/rooms/${d.id}`;
  if (event.startsWith('item:') && d.roomId) return `/rooms/${d.roomId}`;
  return null;
}

const NotificationsPopover: React.FC = () => {
  const [opened, { toggle, close }] = useDisclosure(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const { unreadCount, refreshCount } = useNotifications();
  const navigate = useNavigate();

  const load = useCallback(() => {
    setLoading(true);
    getNotifications({ limit: 30 })
      .then(setNotifications)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (opened) load();
  }, [opened, load]);

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

  const handleNavigate = (dest: string) => {
    close();
    navigate(dest);
  };

  return (
    <Popover
      opened={opened}
      onClose={close}
      position="bottom-end"
      width={340}
      shadow="md"
      radius="md"
      withArrow
      arrowPosition="side"
    >
      <Popover.Target>
        <Tooltip label="Notifications" withArrow position="bottom">
          <ActionIcon
            variant="light"
            size="md"
            onClick={toggle}
            aria-label="Notifications"
            style={{ position: 'relative', overflow: 'visible' }}
          >
            <IconBell size={16} />
            {unreadCount > 0 && (
              <Badge
                size="xs"
                color="red"
                circle
                style={{ position: 'absolute', top: -4, right: -4, pointerEvents: 'none' }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </ActionIcon>
        </Tooltip>
      </Popover.Target>

      <Popover.Dropdown p={0} style={{ overflow: 'hidden' }}>
        {/* Header */}
        <Group justify="space-between" px="md" py="sm" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
          <Text fw={600} size="sm">Notifications</Text>
          {unreadCount > 0 && (
            <Button size="compact-xs" variant="subtle" onClick={handleMarkAllRead}>
              Mark all read
            </Button>
          )}
        </Group>

        {/* Body */}
        {loading ? (
          <Group justify="center" py="xl">
            <Loader size="sm" />
          </Group>
        ) : notifications.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="xl">
            No notifications yet
          </Text>
        ) : (
          <ScrollArea h={360}>
            <Stack gap={0}>
              {notifications.map((n, i) => {
                const dest = getDestination(n);
                return (
                  <React.Fragment key={n._id}>
                    {i > 0 && <Divider />}
                    <UnstyledButton
                      onClick={() => dest && handleNavigate(dest)}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '10px 14px',
                        background: n.read ? undefined : 'var(--mantine-color-blue-0)',
                        borderLeft: n.read ? '3px solid transparent' : '3px solid var(--mantine-color-blue-5)',
                        cursor: dest ? 'pointer' : 'default',
                        transition: 'background 120ms ease',
                      }}
                      onMouseEnter={(e) => { if (dest) (e.currentTarget as HTMLElement).style.background = n.read ? 'var(--mantine-color-gray-0)' : 'var(--mantine-color-blue-1)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = n.read ? '' : 'var(--mantine-color-blue-0)'; }}
                    >
                      <Group justify="space-between" wrap="nowrap" gap="xs">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text size="xs" fw={n.read ? 400 : 600} truncate>
                            {getLabel(n)}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {new Date(n.createdAt).toLocaleString()}
                          </Text>
                        </div>
                        <Group gap={2} wrap="nowrap" style={{ flexShrink: 0 }}>
                          {!n.read && (
                            <Tooltip label="Mark as read" withArrow position="top" openDelay={300}>
                              <ActionIcon
                                size="xs"
                                variant="subtle"
                                color="blue"
                                onClick={(e) => { e.stopPropagation(); handleMarkRead(n._id); }}
                                aria-label="Mark as read"
                              >
                                <IconCheck size={12} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                          <Tooltip label="Delete" withArrow position="top" openDelay={300}>
                            <ActionIcon
                              size="xs"
                              variant="subtle"
                              color="red"
                              onClick={(e) => { e.stopPropagation(); handleDelete(n._id); }}
                              aria-label="Delete"
                            >
                              <IconTrash size={12} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Group>
                    </UnstyledButton>
                  </React.Fragment>
                );
              })}
            </Stack>
          </ScrollArea>
        )}

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Divider />
            <Group justify="center" py="xs">
              <Button
                size="compact-xs"
                variant="subtle"
                color="gray"
                onClick={() => handleNavigate('/notifications')}
              >
                View all notifications
              </Button>
            </Group>
          </>
        )}
      </Popover.Dropdown>
    </Popover>
  );
};

export default NotificationsPopover;
