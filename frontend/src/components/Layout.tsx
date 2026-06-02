import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  AppShell,
  ActionIcon,
  Box,
  Burger,
  Button,
  Group,
  NavLink,
  Stack,
  Text,
  ScrollArea,
  Divider,
  Skeleton,
  Title,
  Badge,
  Tooltip,
  TextInput,
  Modal,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconHome2,
  IconDoor,
  IconTrash,
  IconTag,
  IconShare,
  IconSettings,
  IconX,
  IconCheck,
  IconUsers,
  IconPackage,
  IconList,
} from '@tabler/icons-react';
import { useRooms } from '../contexts/RoomsContext';
import { useAuth } from '../contexts/AuthContext';
import SearchBar from './SearchBar';
import RecoveryModal from './RecoveryModal';
import HomeInviteModal from './HomeInviteModal';
import NotificationsPopover from './NotificationsPopover';

const Layout: React.FC = () => {
  const [opened, { toggle, close }] = useDisclosure();
  const { rooms, loading, itemCounts, dumpsterCount, yardSaleCount } = useRooms();
  const {
    recoveryModalOpen,
    closeRecoveryModal,
    openRecoveryModal,
    isNew,
    homeName,
    setHomeName,
    homes,
    token,
    switchHome,
    leaveHome,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);

  const openSettings = () => {
    setNameInput(homeName);
    setSettingsOpen(true);
  };

  const saveSettings = async () => {
    if (nameInput.trim()) await setHomeName(nameInput.trim());
    setSettingsOpen(false);
  };

  return (
    <AppShell
      header={{ height: { base: 100, sm: 60 } }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        {/* ── Mobile: two rows ─────────────────────────── */}
        <Stack gap={0} hiddenFrom="sm" px="md" pt={8} pb={6}>
          {/* Row 1: home name + notification + share */}
          <Group justify="space-between" wrap="nowrap" mb={6}>
            <Title order={4} c="blue.7" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
              🏠 {homeName}
            </Title>
            <Group gap="xs" wrap="nowrap">
              <NotificationsPopover />
              <Tooltip label="Invite to this household" withArrow position="bottom">
                <ActionIcon
                  variant="light"
                  size="md"
                  onClick={() => setInviteOpen(true)}
                  aria-label="Invite"
                >
                  <IconShare size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
          {/* Row 2: hamburger + search */}
          <Group wrap="nowrap" gap="xs" style={{ width: '100%' }}>
            <Burger opened={opened} onClick={toggle} size="sm" style={{ flexShrink: 0 }} />
            <Box style={{ flex: 1, minWidth: 0 }}>
              <SearchBar />
            </Box>
          </Group>
        </Stack>

        {/* ── Desktop: single row ──────────────────────── */}
        <Group h="100%" px="md" justify="space-between" wrap="nowrap" visibleFrom="sm">
          <Title order={4} c="blue.7" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
            🏠 {homeName}
          </Title>
          <Group gap="xs">
            <SearchBar />
            <NotificationsPopover />
            <Tooltip label="Invite to this household" withArrow position="bottom">
              <ActionIcon
                variant="light"
                size="md"
                onClick={() => setInviteOpen(true)}
                aria-label="Invite"
              >
                <IconShare size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </AppShell.Header>
      <RecoveryModal opened={recoveryModalOpen} onClose={closeRecoveryModal} isNew={isNew} />
      <HomeInviteModal
        opened={inviteOpen}
        onClose={() => setInviteOpen(false)}
        homeName={homeName}
      />

      {opened && (
        <div
          onClick={close}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(0,0,0,0.25)',
          }}
        />
      )}
      <AppShell.Navbar
        style={{
          width: 240,
          maxWidth: 240,
          background: 'transparent',
          border: 'none',
          padding: '10px 10px 10px 10px',
          overflow: 'visible',
        }}
      >
        <div
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 18,
            padding: '14px',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            backgroundColor: 'rgba(255, 255, 255, 0.76)',
            boxShadow: '0 12px 48px rgba(0, 0, 0, 0.14), 0 2px 8px rgba(0, 0, 0, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.65)',
            overflow: 'hidden',
          }}
        >
          <NavLink
            component={Link}
            to="/"
            label="Dashboard"
            leftSection={<IconHome2 size={16} />}
            active={location.pathname === '/'}
            onClick={close}
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
            onClick={close}
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
            onClick={close}
            mb="xs"
            color="yellow"
          />
          <NavLink
            component={Link}
            to="/inventory"
            label="Inventory"
            leftSection={<IconPackage size={16} />}
            active={location.pathname === '/inventory'}
            onClick={close}
            mb="xs"
          />
          <NavLink
            component={Link}
            to="/lists"
            label="My Lists"
            leftSection={<IconList size={16} />}
            active={location.pathname.startsWith('/lists')}
            onClick={close}
            mb="xs"
            color="teal"
          />
          <NavLink
            component={Link}
            to="/shared-with-me"
            label="Shared with Me"
            leftSection={<IconUsers size={16} />}
            active={location.pathname === '/shared-with-me'}
            onClick={close}
            mb="xs"
            color="violet"
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
                    onClick={close}
                    mb={4}
                  />
                ))}
            {!loading && rooms.length === 0 && (
              <Text size="xs" c="dimmed" ta="center" mt="md">
                No rooms yet
              </Text>
            )}
          </ScrollArea>

          <Divider mt="xs" mb={4} label="Settings" labelPosition="left" />
          <NavLink
            label="Home Settings"
            leftSection={<IconSettings size={18} />}
            onClick={openSettings}
            style={{ borderRadius: 8 }}
          />
        </div>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>

      <Modal
        opened={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Home Settings"
        centered
        size="sm"
      >
        <TextInput
          label="Home name"
          description="Shown in the header and shared with all household members"
          value={nameInput}
          onChange={(e) => setNameInput(e.currentTarget.value)}
          maxLength={50}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveSettings();
          }}
          data-autofocus
        />
        <Group justify="space-between" mt="md">
          <Button
            size="xs"
            variant="subtle"
            color="gray"
            leftSection={<IconShare size={14} />}
            onClick={() => {
              setSettingsOpen(false);
              openRecoveryModal();
            }}
          >
            Recovery key
          </Button>
          <ActionIcon
            variant="filled"
            color="blue"
            size="lg"
            onClick={saveSettings}
            aria-label="Save home name"
            disabled={!nameInput.trim()}
          >
            ✓
          </ActionIcon>
        </Group>

        {homes.length > 1 && (
          <>
            <Divider my="md" label="Connected households" labelPosition="left" />
            <Text size="xs" c="dimmed" mb="xs">
              Switch to another household or leave one you've joined.
            </Text>
            {homes.map((h) => {
              const isActive = h.token === token;
              return (
                <Group
                  key={h.token}
                  justify="space-between"
                  mb={6}
                  wrap="nowrap"
                  style={{
                    padding: '6px 10px',
                    borderRadius: 8,
                    background: isActive ? 'var(--mantine-color-blue-0)' : undefined,
                    border: isActive
                      ? '1px solid var(--mantine-color-blue-2)'
                      : '1px solid transparent',
                  }}
                >
                  <Text
                    size="sm"
                    fw={isActive ? 600 : 400}
                    c={isActive ? 'blue.7' : undefined}
                    style={{ cursor: isActive ? 'default' : 'pointer', flex: 1, minWidth: 0 }}
                    truncate
                    onClick={() => {
                      if (!isActive) switchHome(h.token);
                    }}
                  >
                    {h.name}
                  </Text>
                  {isActive ? (
                    <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                      <Badge
                        size="xs"
                        color="teal"
                        variant="filled"
                        style={{ textTransform: 'none', fontWeight: 500 }}
                      >
                        Primary
                      </Badge>
                      <IconCheck size={16} color="var(--mantine-color-blue-6)" />
                    </Group>
                  ) : (
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="red"
                      aria-label={`Leave ${h.name}`}
                      onClick={() => leaveHome(h.token)}
                      style={{ flexShrink: 0 }}
                    >
                      <IconX size={14} />
                    </ActionIcon>
                  )}
                </Group>
              );
            })}
          </>
        )}
      </Modal>
    </AppShell>
  );
};

export default Layout;
