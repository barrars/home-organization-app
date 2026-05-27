import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  AppShell,
  Burger,
  Group,
  NavLink,
  Text,
  ScrollArea,
  Divider,
  Skeleton,
  Title,
  Badge,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconHome2, IconDoor, IconTrash, IconTag } from '@tabler/icons-react';
import { useRooms } from '../contexts/RoomsContext';
import SearchBar from './SearchBar';

const Layout: React.FC = () => {
  const [opened, { toggle, close }] = useDisclosure();
  const { rooms, loading, itemCounts, dumpsterCount, yardSaleCount } = useRooms();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={4} c="blue.7" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
              🏠 Home Organizer
            </Title>
          </Group>
          <SearchBar />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <NavLink
          component={Link}
          to="/"
          label="Dashboard"
          leftSection={<IconHome2 size={16} />}
          active={location.pathname === '/'}
          onClick={(e: React.MouseEvent) => {
            if (location.pathname === '/') e.preventDefault();
            else close();
          }}
          mb="xs"
        />
        <NavLink
          component={Link}
          to="/dumpster"
          label="The Dumpster"
          leftSection={<IconTrash size={16} />}
          rightSection={
            dumpsterCount > 0 ? (
              <Badge size="xs" color="orange" circle>
                {dumpsterCount}
              </Badge>
            ) : undefined
          }
          active={location.pathname === '/dumpster'}
          onClick={(e: React.MouseEvent) => {
            if (location.pathname === '/dumpster') e.preventDefault();
            else close();
          }}
          mb="xs"
          color="orange"
        />
        <NavLink
          component={Link}
          to="/yard-sale"
          label="🏡 The Front Yard"
          leftSection={<IconTag size={16} />}
          rightSection={
            yardSaleCount > 0 ? (
              <Badge size="xs" color="yellow" circle>
                {yardSaleCount}
              </Badge>
            ) : undefined
          }
          active={location.pathname === '/yard-sale'}
          onClick={(e: React.MouseEvent) => {
            if (location.pathname === '/yard-sale') e.preventDefault();
            else close();
          }}
          mb="xs"
          color="yellow"
        />
        <Divider mb="xs" label="Rooms" labelPosition="left" />
        <ScrollArea flex={1}>
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} h={36} mb="xs" radius="sm" />
              ))
            : rooms.map((room) => (
                <NavLink
                  key={room._id}
                  component={Link}
                  to={`/rooms/${room._id}`}
                  label={room.name}
                  leftSection={<IconDoor size={16} />}
                  rightSection={
                    itemCounts[room._id] ? (
                      <Badge size="xs" color="blue" circle>
                        {itemCounts[room._id]}
                      </Badge>
                    ) : undefined
                  }
                  active={location.pathname === `/rooms/${room._id}`}
                  onClick={(e: React.MouseEvent) => {
                    if (location.pathname === `/rooms/${room._id}`) e.preventDefault();
                    else close();
                  }}
                  mb={4}
                />
              ))}
          {!loading && rooms.length === 0 && (
            <Text size="xs" c="dimmed" ta="center" mt="md">
              No rooms yet
            </Text>
          )}
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
};

export default Layout;
