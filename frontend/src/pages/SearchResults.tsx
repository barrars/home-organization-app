import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Badge,
  Box,
  Button,
  Card,
  Center,
  Divider,
  Group,
  Image,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconList, IconSearch } from '@tabler/icons-react';
import { searchItems } from '../services/api';
import AddToListModal from '../components/AddToListModal';
import type { SearchResultItem } from '../types';

const getPrimaryImage = (item: SearchResultItem): string =>
  item.imageUrls?.find((url) => url?.trim()) ?? item.imageUrl ?? '';

const SearchResults: React.FC = () => {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const navigate = useNavigate();

  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const [addToListItem, setAddToListItem] = useState<SearchResultItem | null>(null);

  useEffect(() => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(false);
    searchItems(q)
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => {
        setLoading(false);
        setSearched(true);
      });
  }, [q]);

  const goToItem = (item: SearchResultItem) => {
    navigate(`/rooms/${item.roomId._id}?highlight=${item._id}`);
  };

  return (
    <Box>
      <Group mb="lg" align="baseline" gap="xs">
        <IconSearch size={20} />
        <Title order={3}>Results for "{q}"</Title>
        {searched && !loading && (
          <Text size="sm" c="dimmed">
            — {results.length} item{results.length !== 1 ? 's' : ''}
          </Text>
        )}
      </Group>

      {loading && (
        <Center h={200}>
          <Loader />
        </Center>
      )}

      {searched && !loading && results.length === 0 && (
        <Center h={200}>
          <Stack align="center" gap="sm">
            <IconSearch size={48} color="gray" />
            <Text c="dimmed">No items match "{q}"</Text>
          </Stack>
        </Center>
      )}

      {!loading && results.length > 0 && (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
          {results.map((item) => (
            <Card
              key={item._id}
              shadow="xs"
              padding="md"
              radius="md"
              withBorder
              style={{ cursor: 'pointer' }}
              onClick={() => goToItem(item)}
            >
              {getPrimaryImage(item) && (
                <Card.Section mb="sm">
                  <Image src={getPrimaryImage(item)} height={140} fit="cover" />
                </Card.Section>
              )}

              <Group justify="space-between" mb={4} wrap="nowrap">
                <Text fw={600} lineClamp={1}>
                  {item.name}
                </Text>
                <Badge color="blue" variant="light" size="sm" style={{ flexShrink: 0 }}>
                  {item.roomId.name}
                </Badge>
              </Group>

              <Text size="sm" c="dimmed" mb="xs">
                Qty: {item.quantity}
              </Text>

              {item.categories.length > 0 && (
                <Group gap={4} mb={6} wrap="wrap">
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
                  <Text size="xs" c="dimmed" lineClamp={2}>
                    {item.notes}
                  </Text>
                </>
              )}

              <Divider my="xs" />
              <Button
                size="xs"
                variant="light"
                color="teal"
                leftSection={<IconList size={13} />}
                onClick={(e) => {
                  e.stopPropagation();
                  setAddToListItem(item);
                }}
                fullWidth
              >
                Add to List
              </Button>
            </Card>
          ))}
        </SimpleGrid>
      )}

      {addToListItem && (
        <AddToListModal
          opened={!!addToListItem}
          onClose={() => setAddToListItem(null)}
          itemId={addToListItem._id}
          itemName={addToListItem.name}
        />
      )}
    </Box>
  );
};

export default SearchResults;
