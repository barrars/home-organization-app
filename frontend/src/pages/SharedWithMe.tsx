import React, { useEffect, useState } from 'react';
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
} from '@mantine/core';
import { IconHome2, IconDoor, IconPackage, IconTrash } from '@tabler/icons-react';
import { getSharedWithMe, removeShare } from '../services/api';
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
          {shares.map((share) => (
            <Card key={share._id} shadow="xs" padding="md" radius="md" withBorder>
              <Group justify="space-between" wrap="nowrap">
                <Group gap="sm" wrap="nowrap">
                  {targetTypeIcons[share.targetType]}
                  <div>
                    <Text fw={500}>
                      {(share.target as Record<string, string>)?.name ?? 'Unknown'}
                    </Text>
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
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  );
};

export default SharedWithMe;
