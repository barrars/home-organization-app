import React, { useEffect, useState } from 'react';
import {
  ActionIcon,
  Button,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { bulkInsertInventory, getRooms } from '../services/api';
import type { Room } from '../types';

interface BulkRow {
  name: string;
  quantity: number;
  notes: string;
}

const emptyRow = (): BulkRow => ({ name: '', quantity: 1, notes: '' });

interface Props {
  onCreated?: () => void;
}

const BulkInsertForm: React.FC<Props> = ({ onCreated }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [rows, setRows] = useState<BulkRow[]>([emptyRow()]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getRooms().then((r) => {
      setRooms(r);
      if (r.length > 0) setRoomId(r[0]._id);
    });
  }, []);

  const updateRow = (index: number, field: keyof BulkRow, value: string | number) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const removeRow = (index: number) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

  const validRows = rows.filter((r) => r.name.trim());

  const handleSubmit = async () => {
    if (!roomId) {
      notifications.show({ title: 'Select a room', message: 'Choose a room before adding items.', color: 'orange' });
      return;
    }
    if (validRows.length === 0) {
      notifications.show({ title: 'Nothing to add', message: 'Enter at least one item name.', color: 'orange' });
      return;
    }
    setSubmitting(true);
    try {
      await bulkInsertInventory(
        validRows.map((r) => ({ name: r.name, quantity: r.quantity || 1, notes: r.notes, roomId, categories: [], tags: [] })),
      );
      notifications.show({
        title: 'Done!',
        message: `${validRows.length} item${validRows.length > 1 ? 's' : ''} added.`,
        color: 'green',
      });
      setRows([emptyRow()]);
      onCreated?.();
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to add items. Try again.', color: 'red' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack gap="md">
      <Select
        label="Add items to room"
        description="All rows below will be added to this room"
        placeholder="Select a room…"
        data={rooms.map((r) => ({ value: r._id, label: r.name }))}
        value={roomId}
        onChange={setRoomId}
        required
        w={280}
      />

      <Stack gap="xs">
        {rows.map((row, index) => (
          <Paper key={index} withBorder p="sm" radius="md">
            <Group align="flex-start" wrap="nowrap" gap="sm">
              <TextInput
                placeholder="Item name"
                value={row.name}
                onChange={(e) => updateRow(index, 'name', e.currentTarget.value)}
                required
                style={{ flex: 2, minWidth: 0 }}
              />
              <NumberInput
                placeholder="Qty"
                value={row.quantity}
                onChange={(v) => updateRow(index, 'quantity', Number(v) || 1)}
                min={1}
                w={80}
              />
              <Textarea
                placeholder="Notes (optional)"
                value={row.notes}
                onChange={(e) => updateRow(index, 'notes', e.currentTarget.value)}
                autosize
                minRows={1}
                style={{ flex: 3, minWidth: 0 }}
              />
              <ActionIcon
                color="red"
                variant="subtle"
                mt={4}
                onClick={() => removeRow(index)}
                disabled={rows.length === 1}
                aria-label="Remove row"
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          </Paper>
        ))}
      </Stack>

      <Group>
        <Button variant="light" leftSection={<IconPlus size={14} />} onClick={addRow} size="sm">
          Add row
        </Button>
        <Button
          onClick={handleSubmit}
          loading={submitting}
          disabled={!roomId || validRows.length === 0}
          size="sm"
        >
          {validRows.length > 0 ? `Save ${validRows.length} item${validRows.length > 1 ? 's' : ''}` : 'Save items'}
        </Button>
      </Group>

      {rows.length > 1 && (
        <Text size="xs" c="dimmed">Rows with an empty name will be skipped.</Text>
      )}
    </Stack>
  );
};

export default BulkInsertForm;
