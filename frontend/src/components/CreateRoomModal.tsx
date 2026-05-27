import React, { useEffect } from 'react';
import { Modal, TextInput, Textarea, Button, Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { createRoom, updateRoom } from '../services/api';
import type { Room } from '../types';

interface Props {
  opened: boolean;
  onClose: () => void;
  onCreated: () => void;
  editRoom?: Room;
}

const CreateRoomModal: React.FC<Props> = ({ opened, onClose, onCreated, editRoom }) => {
  const form = useForm({
    initialValues: { name: '', description: '' },
    validate: {
      name: (v) => (v.trim().length < 1 ? 'Room name is required' : null),
    },
  });

  useEffect(() => {
    if (opened) {
      if (editRoom) {
        form.setValues({ name: editRoom.name, description: editRoom.description ?? '' });
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
        message: editRoom ? 'Failed to update room.' : 'Failed to create room. Name may already exist.',
        color: 'red',
      });
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={editRoom ? `Edit "${editRoom.name}"` : 'Create New Room'}
      centered
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            label="Room Name"
            placeholder="e.g. Bedroom, Kitchen, Garage..."
            required
            {...form.getInputProps('name')}
          />
          <Textarea
            label="Description"
            placeholder="Optional description"
            rows={3}
            {...form.getInputProps('description')}
          />
          <Button type="submit">{editRoom ? 'Save Changes' : 'Create Room'}</Button>
        </Stack>
      </form>
    </Modal>
  );
};

export default CreateRoomModal;
