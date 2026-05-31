import React, { useState } from 'react';
import { Group, Stack, Tabs, Text, ThemeIcon, Title } from '@mantine/core';
import { IconPackage, IconPlus } from '@tabler/icons-react';
import BulkInsertForm from '../components/BulkInsertForm';
import InventoryList from '../components/InventoryList';

const Inventory: React.FC = () => {
  const [refresh, setRefresh] = useState(0);

  return (
    <Stack gap="lg">
      <Group gap="sm">
        <ThemeIcon variant="light" size="lg" color="blue">
          <IconPackage size={20} />
        </ThemeIcon>
        <div>
          <Title order={3}>Inventory</Title>
          <Text size="sm" c="dimmed">
            All items across every room in your home
          </Text>
        </div>
      </Group>

      <Tabs defaultValue="browse">
        <Tabs.List mb="md">
          <Tabs.Tab value="browse" leftSection={<IconPackage size={14} />}>
            Browse All
          </Tabs.Tab>
          <Tabs.Tab value="bulk" leftSection={<IconPlus size={14} />}>
            Bulk Add
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="browse">
          <InventoryList refresh={refresh} />
        </Tabs.Panel>

        <Tabs.Panel value="bulk">
          <BulkInsertForm onCreated={() => setRefresh((n) => n + 1)} />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};

export default Inventory;
