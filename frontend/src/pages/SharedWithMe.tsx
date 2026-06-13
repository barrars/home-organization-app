import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Container,
  Title,
  Text,
  Card,
  Group,
  Badge,
  Stack,
  Loader,
  ActionIcon,
  Tooltip,
  Button,
  Anchor,
} from '@mantine/core';
import { IconHome2, IconDoor, IconPackage, IconTrash, IconArrowRight } from '@tabler/icons-react';
import { getSharedWithMe, removeShare } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Share } from '../types';

const targetTypeIcons: Record<string, React.ReactNode> = {
  home: <IconHome2 size={18} />,
  room: <IconDoor size={18} />,
  item: <IconPackage size={18} />,
};

const targetTypeLabels: Record<string, string> = {
  home: 'Home',
  room: 'Room',
  item: 'Item',
};

const SharedWithMe: React.FC = () => {
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(true);
  const { switchHome } = useAuth();

  useEffect(() => {
    getSharedWithMe()
      .then(setShares)
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (id: string) => {
    await removeShare(id);
    setShares((prev) => prev.filter((s) => s._id !== id));
  };

  if (loading) {
    return (
      <Container size="sm" py="xl" style={{ textAlign: 'center' }}>
        <Loader />
      </Container>
    );
  }

  return (
    <Container size="sm" py="xl">
      <Title order={2} mb="lg">
        Shared with Me
      </Title>
      {shares.length === 0 ? (
        <Text c="dimmed" ta="center" mt="xl">
          Nothing has been shared with you yet.
        </Text>
      ) : (
        <Stack gap="sm">
          {shares.map((share) => {
            const target = share.target as Record<string, string> | null;
            const name = target?.name ?? 'Unknown';
            const shareUrl = share.shareLinkToken ? `/share/${share.shareLinkToken}` : null;
            const homeToken = share.targetType === 'home' ? (target?.token ?? null) : null;

            return (
              <Card key={share._id} shadow="xs" padding="md" radius="md" withBorder>
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                    {targetTypeIcons[share.targetType]}
                    <div style={{ minWidth: 0 }}>
                      {shareUrl ? (
                        <Anchor
                          component={Link}
                          to={shareUrl}
                          fw={500}
                          style={{
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {name}
                        </Anchor>
                      ) : (
                        <Text fw={500} truncate>
                          {name}
                        </Text>
                      )}
                      <Group gap="xs">
                        <Badge size="xs" variant="light">
                          {targetTypeLabels[share.targetType]}
                        </Badge>
                        <Badge size="xs" variant="light" color={share.canEdit ? 'green' : 'gray'}>
                          {share.canEdit ? 'Can edit' : 'View only'}
                        </Badge>
                      </Group>
                    </div>
                  </Group>

                  <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                    {/* Room / item — open share link */}
                    {shareUrl && (
                      <Tooltip label="Open shared view">
                        <ActionIcon
                          component={Link}
                          to={shareUrl}
                          variant="subtle"
                          color="blue"
                          aria-label="Open shared view"
                        >
                          <IconArrowRight size={16} />
                        </ActionIcon>
                      </Tooltip>
                    )}

                    {/* Home — switch into that household */}
                    {share.targetType === 'home' && homeToken && (
                      <Tooltip label="Switch to this household">
                        <Button
                          size="compact-xs"
                          variant="light"
                          onClick={() => switchHome(homeToken)}
                          rightSection={<IconArrowRight size={12} />}
                        >
                          Switch
                        </Button>
                      </Tooltip>
                    )}

                    <Tooltip label="Remove from my shares">
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => handleRemove(share._id)}
                        aria-label="Remove share"
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>
              </Card>
            );
          })}
        </Stack>
      )}
    </Container>
  );
};

export default SharedWithMe;
