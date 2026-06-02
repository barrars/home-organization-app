import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Divider,
  Group,
  Loader,
  Modal,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus } from '@tabler/icons-react';
import { getLists, createList, addItemToList } from '../services/api';
import type { ItemList } from '../types';

interface Props {
  opened: boolean;
  onClose: () => void;
  itemId: string;
  itemName: string;
}

const AddToListModal: React.FC<Props> = ({ opened, onClose, itemId, itemName }) => {
  const [lists, setLists] = useState<ItemList[]>([]);
  const [loading, setLoading] = useState(false);

  // Select existing list
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [note, setNote] = useState('');

  // Create new list inline
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const [saving, setSaving] = useState(false);

  const loadLists = useCallback(async () => {
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

  useEffect(() => {
    if (opened) {
      setSelectedListId(null);
      setNote('');
      setCreating(false);
      setNewName('');
      setNewDesc('');
      loadLists();
    }
  }, [opened, loadLists]);

  const handleAdd = async () => {
    setSaving(true);
    try {
      let targetListId = selectedListId;

      if (creating) {
        if (!newName.trim()) {
          notifications.show({ title: 'Validation', message: 'List name is required.', color: 'yellow' });
          setSaving(false);
          return;
        }
        const newList = await createList({ name: newName.trim(), description: newDesc.trim() });
        targetListId = newList._id;
      }

      if (!targetListId) {
        notifications.show({ title: 'Validation', message: 'Please select or create a list.', color: 'yellow' });
        setSaving(false);
        return;
      }

      await addItemToList(targetListId, itemId, note.trim());
      const listName = creating ? newName.trim() : (lists.find((l) => l._id === targetListId)?.name ?? 'list');
      notifications.show({
        title: 'Added to list',
        message: `"${itemName}" added to "${listName}".`,
        color: 'green',
      });
      onClose();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        notifications.show({ title: 'Already on list', message: `"${itemName}" is already on that list.`, color: 'yellow' });
      } else {
        notifications.show({ title: 'Error', message: 'Could not add item to list.', color: 'red' });
      }
    } finally {
      setSaving(false);
    }
  };

  const listOptions = lists.map((l) => ({ value: l._id, label: l.name }));

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Add "${itemName}" to a List`}
      centered
      size="sm"
    >
      {loading ? (
        <Group justify="center" p="md">
          <Loader size="sm" />
        </Group>
      ) : (
        <Stack gap="sm">
          {!creating && (
            <>
              <Select
                label="Choose a list"
                placeholder="Select an existing list…"
                data={listOptions}
                value={selectedListId}
                onChange={setSelectedListId}
                searchable
                clearable
                nothingFoundMessage={lists.length === 0 ? 'No lists yet — create one below' : 'No match'}
                data-autofocus
              />
              <Button
                variant="subtle"
                size="xs"
                leftSection={<IconPlus size={13} />}
                onClick={() => { setCreating(true); setSelectedListId(null); }}
              >
                Create a new list
              </Button>
            </>
          )}

          {creating && (
            <>
              <TextInput
                label="New list name"
                placeholder="e.g. Camping Trip"
                value={newName}
                onChange={(e) => setNewName(e.currentTarget.value)}
                required
                data-autofocus
              />
              <Textarea
                label="Description"
                placeholder="Optional"
                value={newDesc}
                onChange={(e) => setNewDesc(e.currentTarget.value)}
                rows={2}
              />
              <Button
                variant="subtle"
                size="xs"
                onClick={() => { setCreating(false); setNewName(''); setNewDesc(''); }}
              >
                ← Pick an existing list instead
              </Button>
            </>
          )}

          <Divider label="List note (optional)" labelPosition="left" />
          <Textarea
            placeholder={`Anything specific about this item for the list — "pack in carry-on", "check batteries", etc.`}
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
            rows={3}
          />

          <Text size="xs" c="dimmed">
            The item stays in its room. This just adds it to the list.
          </Text>

          <Group justify="flex-end" mt="xs">
            <Button variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleAdd} loading={saving}>
              Add to List
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
};

export default AddToListModal;
