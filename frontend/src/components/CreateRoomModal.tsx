import React from 'react';
import { Modal, TextInput, Textarea, Button, Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { createRoom } from '../services/api';

interface Props {
  opened: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const CreateRoomModal: React.FC<Props> = ({ opened, onClose, onCreated }) => {
  const form = useForm({
    initialValues: { name: '', description: '' },
    validate: {
      name: (v) => (v.trim().length < 1 ? 'Room name is required' : null),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    try {
      await createRoom(values);
      notifications.show({ message: `Room "${values.name}" created!`, color: 'green' });
      form.reset();
      onCreated();
    } catch {
      notifications.show({
        message: 'Failed to create room. Name may already exist.',
        color: 'red',
      });
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Create New Room" centered>
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
          <Button type="submit">Create Room</Button>
        </Stack>
      </form>
    </Modal>
  );
};

export default CreateRoomModal;
