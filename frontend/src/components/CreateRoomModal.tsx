import React, { useEffect } from 'react';
import {
  Modal,
  TextInput,
  Textarea,
  Button,
  Stack,
  Text,
  SimpleGrid,
  Tooltip,
  Box,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { createRoom, updateRoom } from '../services/api';
import type { Room } from '../types';
import { ROOM_ICONS, ROOM_ICON_LABELS } from '../utils/roomIcons';
import type { RoomIconKey } from '../utils/roomIcons';

interface Props {
  opened: boolean;
  onClose: () => void;
  onCreated: () => void;
  editRoom?: Room;
}

const ICON_KEYS = Object.keys(ROOM_ICONS) as RoomIconKey[];

const CreateRoomModal: React.FC<Props> = ({ opened, onClose, onCreated, editRoom }) => {
  const form = useForm({
    initialValues: { name: '', description: '', icon: 'door' },
    validate: {
      name: (v) => (v.trim().length < 1 ? 'Room name is required' : null),
    },
  });

  useEffect(() => {
    if (opened) {
      if (editRoom) {
        form.setValues({
          name: editRoom.name,
          description: editRoom.description ?? '',
          icon: editRoom.icon ?? 'door',
        });
      } else {
        form.reset();
      }
    }
  }, [opened]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (values: typeof form.values) => {
    try {
      if (editRoom) {
        await updateRoom(editRoom._id, values);
        notifications.show({ message: `Room "${values.name}" updated!`, color: 'green' });
      } else {
        await createRoom(values);
        notifications.show({ message: `Room "${values.name}" created!`, color: 'green' });
      }
      form.reset();
      onCreated();
    } catch {
      notifications.show({
        message: editRoom
          ? 'Failed to update room.'
          : 'Failed to create room. Name may already exist.',
        color: 'red',
      });
    }
  };

  const selectedIcon = form.values.icon as RoomIconKey;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={editRoom ? `Edit "${editRoom.name}"` : 'Create New Room'}
      centered
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            label="Room Name"
            placeholder="e.g. Bedroom, Kitchen, Garage..."
            required
            data-autofocus
            {...form.getInputProps('name')}
          />
          <Textarea
            label="Description"
            placeholder="Optional description"
            rows={3}
            {...form.getInputProps('description')}
          />

          <Box>
            <Text size="sm" fw={500} mb={8}>
              Icon
            </Text>
            <SimpleGrid cols={6} spacing={6}>
              {ICON_KEYS.map((key) => {
                const Icon = ROOM_ICONS[key];
                const active = selectedIcon === key;
                return (
                  <Tooltip key={key} label={ROOM_ICON_LABELS[key]} withArrow openDelay={300}>
                    <Box
                      onClick={() => form.setFieldValue('icon', key)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        aspectRatio: '1',
                        borderRadius: 8,
                        cursor: 'pointer',
                        backgroundColor: active
                          ? 'var(--mantine-color-blue-6)'
                          : 'var(--mantine-color-gray-1)',
                        color: active ? '#fff' : 'var(--mantine-color-gray-7)',
                        transition: 'background-color 0.1s',
                      }}
                    >
                      <Icon size={20} />
                    </Box>
                  </Tooltip>
                );
              })}
            </SimpleGrid>
          </Box>

          <Button type="submit">{editRoom ? 'Save Changes' : 'Create Room'}</Button>
        </Stack>
      </form>
    </Modal>
  );
};

export default CreateRoomModal;
