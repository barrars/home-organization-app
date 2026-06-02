import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Divider,
  Grid,
  Group,
  Image,
  Loader,
  Modal,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconEdit,
  IconList,
  IconMapPin,
  IconNote,
  IconPackage,
  IconTrash,
} from '@tabler/icons-react';
import {
  getList,
  updateList,
  removeItemFromList,
  updateListItemNote,
  updateItem,
} from '../services/api';
import { useRooms } from '../contexts/RoomsContext';
import type { ItemListDetail, ListEntry } from '../types';
import { RoomIcon } from '../utils/roomIcons';

const getPrimaryImage = (item: ListEntry['item']): string =>
  item.imageUrls?.find((u) => u?.trim()) ?? item.imageUrl ?? '';

const ListPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { rooms } = useRooms();

  const [list, setList] = useState<ItemListDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit list header
  const [headerEditOpen, setHeaderEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [savingHeader, setSavingHeader] = useState(false);

  // Note editing
  const [noteEntry, setNoteEntry] = useState<ListEntry | null>(null);
  const [noteValue, setNoteValue] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Relocate item
  const [relocateEntry, setRelocateEntry] = useState<ListEntry | null>(null);
  const [relocateRoomId, setRelocateRoomId] = useState<string | null>(null);
  const [savingRelocate, setSavingRelocate] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getList(id);
      setList(data);
    } catch {
      notifications.show({ title: 'Error', message: 'Could not load list.', color: 'red' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // ── Header edit ──────────────────────────────────────────────────────────

  const openHeaderEdit = () => {
    if (!list) return;
    setEditName(list.name);
    setEditDesc(list.description);
    setHeaderEditOpen(true);
  };

  const saveHeader = async () => {
    if (!list || !editName.trim()) return;
    setSavingHeader(true);
    try {
      await updateList(list._id, { name: editName.trim(), description: editDesc.trim() });
      setList((prev) => prev ? { ...prev, name: editName.trim(), description: editDesc.trim() } : prev);
      setHeaderEditOpen(false);
      notifications.show({ title: 'Saved', message: 'List updated.', color: 'green' });
    } catch {
      notifications.show({ title: 'Error', message: 'Could not update list.', color: 'red' });
    } finally {
      setSavingHeader(false);
    }
  };

  // ── Remove item from list ────────────────────────────────────────────────

  const handleRemove = async (entry: ListEntry) => {
    if (!list) return;
    if (!window.confirm(`Remove "${entry.item.name}" from this list? The item itself is unaffected.`)) return;
    try {
      await removeItemFromList(list._id, entry.item._id);
      setList((prev) =>
        prev ? { ...prev, items: prev.items.filter((e) => e.listItemId !== entry.listItemId) } : prev,
      );
      notifications.show({ title: 'Removed', message: `"${entry.item.name}" removed from list.`, color: 'orange' });
    } catch {
      notifications.show({ title: 'Error', message: 'Could not remove item.', color: 'red' });
    }
  };

  // ── Note editing ─────────────────────────────────────────────────────────

  const openNoteEdit = (entry: ListEntry) => {
    setNoteEntry(entry);
    setNoteValue(entry.note);
  };

  const saveNote = async () => {
    if (!noteEntry || !list) return;
    setSavingNote(true);
    try {
      await updateListItemNote(list._id, noteEntry.item._id, noteValue);
      setList((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((e) =>
                e.listItemId === noteEntry.listItemId ? { ...e, note: noteValue } : e,
              ),
            }
          : prev,
      );
      setNoteEntry(null);
      notifications.show({ title: 'Saved', message: 'Note updated.', color: 'green' });
    } catch {
      notifications.show({ title: 'Error', message: 'Could not save note.', color: 'red' });
    } finally {
      setSavingNote(false);
    }
  };

  // ── Relocate item ────────────────────────────────────────────────────────

  const openRelocate = (entry: ListEntry) => {
    setRelocateEntry(entry);
    setRelocateRoomId(entry.item.roomId._id);
  };

  const saveRelocate = async () => {
    if (!relocateEntry || !relocateRoomId || !list) return;
    setSavingRelocate(true);
    try {
      await updateItem(relocateEntry.item._id, { roomId: relocateRoomId });
      const room = rooms.find((r) => r._id === relocateRoomId);
      setList((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((e) =>
                e.listItemId === relocateEntry.listItemId
                  ? {
                      ...e,
                      item: {
                        ...e.item,
                        roomId: { _id: relocateRoomId, name: room?.name ?? '', icon: room?.icon ?? 'door' },
                      },
                    }
                  : e,
              ) as import('../types').ListEntry[],
            }
          : prev,
      );
      setRelocateEntry(null);
      notifications.show({ title: 'Relocated', message: `"${relocateEntry.item.name}" moved to ${room?.name ?? 'new room'}.`, color: 'green' });
    } catch {
      notifications.show({ title: 'Error', message: 'Could not relocate item.', color: 'red' });
    } finally {
      setSavingRelocate(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Center h={300}>
        <Loader />
      </Center>
    );
  }

  if (!list) {
    return (
      <Center h={300}>
        <Stack align="center">
          <IconList size={48} color="gray" />
          <Text c="dimmed">List not found.</Text>
          <Button variant="light" onClick={() => navigate('/lists')}>
            Back to Lists
          </Button>
        </Stack>
      </Center>
    );
  }

  const roomOptions = rooms.map((r) => ({ value: r._id, label: r.name }));

  return (
    <Box>
      {/* ── Page header ── */}
      <Group mb="sm" gap="xs">
        <ActionIcon variant="subtle" onClick={() => navigate('/lists')} aria-label="Back to lists">
          <IconArrowLeft size={18} />
        </ActionIcon>
        <Text size="sm" c="dimmed">
          My Lists
        </Text>
      </Group>

      <Group justify="space-between" mb="md" align="flex-start" wrap="nowrap">
        <Box style={{ flex: 1 }}>
          <Group gap="xs" align="center" mb={2}>
            <Title order={2}>{list.name}</Title>
            <Tooltip label="Edit list details" withArrow>
              <ActionIcon variant="subtle" size="sm" onClick={openHeaderEdit} aria-label="Edit list">
                <IconEdit size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
          {list.description && (
            <Text size="sm" c="dimmed">
              {list.description}
            </Text>
          )}
        </Box>
        <Badge color="blue" variant="light" size="lg">
          {list.items.length} item{list.items.length !== 1 ? 's' : ''}
        </Badge>
      </Group>

      <Divider mb="lg" />

      {list.items.length === 0 && (
        <Center h={200}>
          <Stack align="center" gap="sm">
            <IconPackage size={48} color="gray" />
            <Text c="dimmed">No items on this list yet.</Text>
            <Text size="sm" c="dimmed">
              Use the "Add to List" button on any item in your inventory, room, or search results.
            </Text>
          </Stack>
        </Center>
      )}

      <Grid>
        {list.items.map((entry) => {
          const img = getPrimaryImage(entry.item);
          return (
            <Grid.Col key={entry.listItemId} span={{ base: 12, sm: 6, md: 4 }}>
              <Card shadow="xs" padding="md" radius="md" withBorder>
                {img && (
                  <Card.Section mb="sm">
                    <Image src={img} height={120} fit="cover" />
                  </Card.Section>
                )}

                <Group justify="space-between" mb={4} wrap="nowrap">
                  <Text fw={600} lineClamp={1} style={{ flex: 1 }}>
                    {entry.item.name}
                  </Text>
                  <Tooltip label="Remove from list" withArrow>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      onClick={() => handleRemove(entry)}
                      aria-label="Remove from list"
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Tooltip>
                </Group>

                {/* Room badge — links to the room, shows current location */}
                <Group mb={6} gap={6} wrap="nowrap">
                  <IconMapPin size={13} color="gray" />
                  <Badge
                    color="teal"
                    variant="light"
                    size="sm"
                    component={Link}
                    to={`/rooms/${entry.item.roomId._id}?highlight=${entry.item._id}`}
                    style={{ cursor: 'pointer', textDecoration: 'none' }}
                  >
                    <Group gap={4} wrap="nowrap">
                      <RoomIcon iconKey={entry.item.roomId.icon} size={11} />
                      {entry.item.roomId.name}
                    </Group>
                  </Badge>
                  <Tooltip label="Relocate to another room" withArrow>
                    <ActionIcon variant="subtle" size="xs" onClick={() => openRelocate(entry)} aria-label="Relocate item">
                      <IconEdit size={12} />
                    </ActionIcon>
                  </Tooltip>
                </Group>

                <Text size="sm" c="dimmed" mb="xs">
                  Qty: {entry.item.quantity}
                </Text>

                {entry.item.categories.length > 0 && (
                  <Group gap={4} mb={6} wrap="wrap">
                    {entry.item.categories.map((cat) => (
                      <Badge key={cat._id} color="violet" variant="light" size="sm">
                        {cat.name}
                      </Badge>
                    ))}
                  </Group>
                )}

                {entry.item.tags.length > 0 && (
                  <Group gap={4} mb={6} wrap="wrap">
                    {entry.item.tags.map((tag) => (
                      <Badge key={tag._id} color="gray" variant="outline" size="sm">
                        {tag.name}
                      </Badge>
                    ))}
                  </Group>
                )}

                {/* List-specific note */}
                <Divider my="xs" />
                <Group justify="space-between" align="flex-start" gap={4}>
                  <Group gap={4} style={{ flex: 1 }}>
                    <IconNote size={13} color="gray" />
                    {entry.note ? (
                      <Text size="xs" c="dimmed" lineClamp={2} style={{ flex: 1 }}>
                        {entry.note}
                      </Text>
                    ) : (
                      <Text size="xs" c="dimmed" fs="italic">
                        No list note
                      </Text>
                    )}
                  </Group>
                  <Tooltip label="Edit note" withArrow>
                    <ActionIcon variant="subtle" size="xs" onClick={() => openNoteEdit(entry)} aria-label="Edit note">
                      <IconEdit size={12} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Card>
            </Grid.Col>
          );
        })}
      </Grid>

      {/* ── Edit list header modal ── */}
      <Modal opened={headerEditOpen} onClose={() => setHeaderEditOpen(false)} title="Edit List" centered size="sm">
        <Stack gap="sm">
          <TextInput
            label="Name"
            value={editName}
            onChange={(e) => setEditName(e.currentTarget.value)}
            required
            data-autofocus
            onKeyDown={(e) => { if (e.key === 'Enter') saveHeader(); }}
          />
          <Textarea
            label="Description"
            value={editDesc}
            onChange={(e) => setEditDesc(e.currentTarget.value)}
            rows={3}
          />
          <Group justify="flex-end" mt="xs">
            <Button variant="subtle" onClick={() => setHeaderEditOpen(false)}>Cancel</Button>
            <Button onClick={saveHeader} loading={savingHeader} disabled={!editName.trim()}>
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* ── Edit note modal ── */}
      <Modal
        opened={!!noteEntry}
        onClose={() => setNoteEntry(null)}
        title={`Note for "${noteEntry?.item.name ?? ''}"`}
        centered
        size="sm"
      >
        <Stack gap="sm">
          <Textarea
            label="List note"
            description="Specific to this item on this list (e.g. 'pack in carry-on', 'check batteries')"
            placeholder="Add a note…"
            value={noteValue}
            onChange={(e) => setNoteValue(e.currentTarget.value)}
            rows={4}
            data-autofocus
          />
          <Group justify="flex-end" mt="xs">
            <Button variant="subtle" onClick={() => setNoteEntry(null)}>Cancel</Button>
            <Button onClick={saveNote} loading={savingNote}>Save Note</Button>
          </Group>
        </Stack>
      </Modal>

      {/* ── Relocate modal ── */}
      <Modal
        opened={!!relocateEntry}
        onClose={() => setRelocateEntry(null)}
        title={`Relocate "${relocateEntry?.item.name ?? ''}"`}
        centered
        size="sm"
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Move this item to a different room. The list will always reflect the current location.
          </Text>
          <Select
            label="Move to room"
            data={roomOptions}
            value={relocateRoomId}
            onChange={setRelocateRoomId}
            searchable
            data-autofocus
          />
          <Group justify="flex-end" mt="xs">
            <Button variant="subtle" onClick={() => setRelocateEntry(null)}>Cancel</Button>
            <Button onClick={saveRelocate} loading={savingRelocate} disabled={!relocateRoomId}>
              Move Item
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
};

export default ListPage;
