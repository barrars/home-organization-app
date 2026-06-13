import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Title,
  Text,
  Card,
  Badge,
  Group,
  Stack,
  Loader,
  Center,
  Image,
  Divider,
  SimpleGrid,
  Alert,
  Box,
} from '@mantine/core';
import { IconPackage, IconDoor, IconAlertCircle, IconLock } from '@tabler/icons-react';
import { resolveShareLink, visitShareLink } from '../services/api';
import { getStoredHomes } from '../contexts/AuthContext';
import type { ResolvedShareLink, Item, Room } from '../types';

const SharedView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ResolvedShareLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    resolveShareLink(token)
      .then((result) => {
        setData(result);
        // If the viewer has a home (is logged in), register the visit so the
        // shared item appears in their "Shared With Me" list and they receive
        // future update notifications.
        if (getStoredHomes().length > 0) {
          visitShareLink(token);
        }
      })
      .catch((err: { response?: { status?: number; data?: { message?: string } } }) => {
        const status = err?.response?.status;
        if (status === 404) setError('This share link does not exist or has been revoked.');
        else if (status === 403) setError('This share link has been disabled by its owner.');
        else setError('Failed to load shared content. Please try again later.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <Center h="100vh">
        <Stack align="center" gap="sm">
          <Loader />
          <Text size="sm" c="dimmed">
            Loading shared content…
          </Text>
        </Stack>
      </Center>
    );
  }

  if (error) {
    return (
      <Container size="sm" py="xl">
        <Alert icon={<IconAlertCircle size={18} />} color="red" title="Link unavailable">
          {error}
        </Alert>
      </Container>
    );
  }

  if (!data) return null;

  const isRoom = data.targetType === 'room';
  const roomData = isRoom ? (data.target as Room & { items: Item[] }) : null;
  const itemData = !isRoom ? (data.target as Item) : null;

  return (
    <Container size="md" py="xl">
      {/* Header */}
      <Group mb="xl" gap="xs" align="flex-start">
        <Box mt={3}>
          {isRoom ? <IconDoor size={28} color="gray" /> : <IconPackage size={28} color="gray" />}
        </Box>
        <div style={{ flex: 1 }}>
          <Title order={2}>{isRoom ? roomData?.name : itemData?.name}</Title>
          {isRoom && roomData?.description && (
            <Text c="dimmed" size="sm">
              {roomData.description}
            </Text>
          )}
        </div>
        <Group gap="xs">
          <Badge variant="light" color={isRoom ? 'blue' : 'violet'}>
            {isRoom ? 'Room' : 'Item'}
          </Badge>
          <Badge
            variant="dot"
            color={data.canEdit ? 'orange' : 'gray'}
            leftSection={<IconLock size={10} />}
          >
            {data.canEdit ? 'Read & Write' : 'Read only'}
          </Badge>
        </Group>
      </Group>

      {/* Room view — list of items */}
      {isRoom && roomData && (
        <>
          <Text size="xs" c="dimmed" mb="md">
            {roomData.items.length} item{roomData.items.length !== 1 ? 's' : ''}
          </Text>
          {roomData.items.length === 0 ? (
            <Center h={160}>
              <Stack align="center" gap="sm">
                <IconPackage size={40} color="gray" />
                <Text c="dimmed">This room has no items yet.</Text>
              </Stack>
            </Center>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
              {roomData.items.map((item) => (
                <ItemCard key={item._id} item={item} />
              ))}
            </SimpleGrid>
          )}
        </>
      )}

      {/* Single item view */}
      {!isRoom && itemData && <ItemCard item={itemData} fullWidth />}
    </Container>
  );
};

interface ItemCardProps {
  item: Item;
  fullWidth?: boolean;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, fullWidth }) => {
  const images =
    Array.isArray(item.imageUrls) && item.imageUrls.length > 0
      ? item.imageUrls.filter(Boolean)
      : item.imageUrl?.trim()
        ? [item.imageUrl]
        : [];

  return (
    <Card
      shadow="xs"
      padding="md"
      radius="md"
      withBorder
      style={fullWidth ? { maxWidth: 480 } : undefined}
    >
      {images.length > 0 && (
        <Card.Section mb="sm">
          <Image src={images[0]} height={160} fit="scale-down" />
        </Card.Section>
      )}

      <Group justify="space-between" mb={6} wrap="nowrap">
        <Text fw={600} lineClamp={1}>
          {item.name}
        </Text>
        <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>
          ×{item.quantity}
        </Text>
      </Group>

      {item.categories.length > 0 && (
        <Group gap={4} mb={4} wrap="wrap">
          {item.categories.map((cat) => (
            <Badge key={cat._id} color="violet" variant="light" size="sm">
              {cat.name}
            </Badge>
          ))}
        </Group>
      )}

      {item.tags.length > 0 && (
        <Group gap={4} wrap="wrap">
          {item.tags.map((tag) => (
            <Badge key={tag._id} color="gray" variant="outline" size="sm">
              {tag.name}
            </Badge>
          ))}
        </Group>
      )}

      {item.notes && (
        <>
          <Divider my="xs" />
          <Text size="xs" c="dimmed">
            {item.notes}
          </Text>
        </>
      )}
    </Card>
  );
};

export default SharedView;
