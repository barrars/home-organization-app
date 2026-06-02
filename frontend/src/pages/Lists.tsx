import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Grid,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconList, IconPlus, IconTrash, IconEdit } from '@tabler/icons-react';
import { getLists, createList, updateList, deleteList } from '../services/api';
import type { ItemList } from '../types';

const Lists: React.FC = () => {
  const navigate = useNavigate();
  const [lists, setLists] = useState<ItemList[]>([]);
  const [loading, setLoading] = useState(true);

  // Create / Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ItemList | null>(null);
  const [nameValue, setNameValue] = useState('');
  const [descValue, setDescValue] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLists();
      setLists(data);
    } catch {
      notifications.show({ title: 'Error', message: 'Could not load lists.', color: 'red' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditTarget(null);
    setNameValue('');
    setDescValue('');
    setModalOpen(true);
  };

  const openEdit = (e: React.MouseEvent, list: ItemList) => {
    e.stopPropagation();
    setEditTarget(list);
    setNameValue(list.name);
    setDescValue(list.description);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!nameValue.trim()) return;
    setSaving(true);
    try {
      if (editTarget) {
        const updated = await updateList(editTarget._id, { name: nameValue.trim(), description: descValue.trim() });
        setLists((prev) => prev.map((l) => (l._id === updated._id ? { ...updated, itemCount: l.itemCount } : l)));
        notifications.show({ title: 'Saved', message: `"${updated.name}" updated.`, color: 'green' });
      } else {
        const created = await createList({ name: nameValue.trim(), description: descValue.trim() });
        setLists((prev) => [...prev, { ...created, itemCount: 0 }]);
        notifications.show({ title: 'Created', message: `"${created.name}" is ready.`, color: 'green' });
      }
      setModalOpen(false);
    } catch {
      notifications.show({ title: 'Error', message: 'Could not save list.', color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, list: ItemList) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${list.name}"? This removes all list entries (items themselves are unaffected).`)) return;
    try {
      await deleteList(list._id);
      setLists((prev) => prev.filter((l) => l._id !== list._id));
      notifications.show({ title: 'Deleted', message: `"${list.name}" removed.`, color: 'orange' });
    } catch {
      notifications.show({ title: 'Error', message: 'Could not delete list.', color: 'red' });
    }
  };

  return (
    <Box>
      <Group justify="space-between" mb="lg" align="flex-end">
        <Box>
          <Title order={2}>My Lists</Title>
          <Text size="sm" c="dimmed">
            Cross-room collections — packing lists, shopping lists, anything you need.
          </Text>
        </Box>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          New List
        </Button>
      </Group>

      {loading && (
        <Center h={200}>
          <Loader />
        </Center>
      )}

      {!loading && lists.length === 0 && (
        <Center h={200}>
          <Stack align="center" gap="sm">
            <IconList size={48} color="gray" />
            <Text c="dimmed">No lists yet — create one to get started!</Text>
            <Button variant="light" leftSection={<IconPlus size={14} />} onClick={openCreate}>
              Create a List
            </Button>
          </Stack>
        </Center>
      )}

      {!loading && lists.length > 0 && (
        <Grid>
          {lists.map((list) => (
            <Grid.Col key={list._id} span={{ base: 12, sm: 6, md: 4 }}>
              <Card
                shadow="xs"
                padding="md"
                radius="md"
                withBorder
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/lists/${list._id}`)}
              >
                <Group justify="space-between" mb={6} wrap="nowrap">
                  <Text fw={600} lineClamp={1} style={{ flex: 1 }}>
                    {list.name}
                  </Text>
                  <Group gap={4} wrap="nowrap">
                    <Tooltip label="Edit" withArrow>
                      <ActionIcon
                        variant="subtle"
                        size="sm"
                        onClick={(e) => openEdit(e, list)}
                        aria-label="Edit list"
                      >
                        <IconEdit size={14} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Delete" withArrow>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        onClick={(e) => handleDelete(e, list)}
                        aria-label="Delete list"
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>

                {list.description && (
                  <Text size="sm" c="dimmed" lineClamp={2} mb="xs">
                    {list.description}
                  </Text>
                )}

                <Badge color="blue" variant="light" size="sm">
                  {list.itemCount} item{list.itemCount !== 1 ? 's' : ''}
                </Badge>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      )}

      {/* Create / Edit Modal */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Edit List' : 'New List'}
        centered
        size="sm"
      >
        <Stack gap="sm">
          <TextInput
            label="Name"
            placeholder="e.g. Camping Trip, Kitchen Inventory"
            value={nameValue}
            onChange={(e) => setNameValue(e.currentTarget.value)}
            required
            data-autofocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
          />
          <Textarea
            label="Description"
            placeholder="What is this list for? (optional)"
            value={descValue}
            onChange={(e) => setDescValue(e.currentTarget.value)}
            rows={3}
          />
          <Group justify="flex-end" mt="xs">
            <Button variant="subtle" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving} disabled={!nameValue.trim()}>
              {editTarget ? 'Save Changes' : 'Create List'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
};

export default Lists;
