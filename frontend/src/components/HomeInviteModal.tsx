import React, { useEffect, useState } from 'react';
import {
  Modal,
  Stack,
  Text,
  Group,
  Button,
  CopyButton,
  Switch,
  Badge,
  Loader,
  Alert,
  Divider,
  ActionIcon,
  Tooltip,
  Center,
  Paper,
} from '@mantine/core';
import { IconCopy, IconCheck, IconRefresh, IconHome2, IconEye } from '@tabler/icons-react';
import { QRCodeSVG } from 'qrcode.react';
import { createHomeInvite } from '../services/api';
import type { HomeInviteMode } from '../types';

interface Props {
  opened: boolean;
  onClose: () => void;
  homeName: string;
}

const HomeInviteModal: React.FC<Props> = ({ opened, onClose, homeName }) => {
  const [mode, setMode] = useState<HomeInviteMode>('join');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (newMode: HomeInviteMode) => {
    setLoading(true);
    setError(null);
    setInviteUrl(null);
    try {
      const { token } = await createHomeInvite(newMode);
      setInviteUrl(`${window.location.origin}/invite/${token}`);
    } catch {
      setError('Could not generate invite link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate when modal opens
  useEffect(() => {
    if (opened) {
      setMode('join');
      generate('join');
    }
  }, [opened]);

  const handleModeToggle = (newMode: HomeInviteMode) => {
    setMode(newMode);
    generate(newMode);
  };

  const expiryLabel = '7 days · single use';

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconHome2 size={18} />
          <Text fw={600}>Invite to {homeName}</Text>
        </Group>
      }
      centered
      size="md"
    >
      <Stack gap="md">
        {/* Mode toggle */}
        <Stack gap={6}>
          <Text size="sm" fw={500}>
            Invite type
          </Text>
          <Group gap="sm">
            <Button
              size="xs"
              variant={mode === 'join' ? 'filled' : 'light'}
              color="blue"
              leftSection={<IconHome2 size={14} />}
              onClick={() => handleModeToggle('join')}
            >
              Join as primary home
            </Button>
            <Button
              size="xs"
              variant={mode === 'view' ? 'filled' : 'light'}
              color="violet"
              leftSection={<IconEye size={14} />}
              onClick={() => handleModeToggle('view')}
            >
              View only (guest)
            </Button>
          </Group>
          <Text size="xs" c="dimmed">
            {mode === 'join'
              ? "The recipient's device will adopt this as their active home — full access, real-time sync."
              : 'The recipient sees your home as a guest. They can browse but it stays separate from their own home.'}
          </Text>
        </Stack>

        <Divider />

        {/* Link area */}
        {loading && (
          <Group justify="center" py="sm">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">
              Generating invite…
            </Text>
          </Group>
        )}

        {error && <Alert color="red">{error}</Alert>}

        {inviteUrl && !loading && (
          <Stack gap="xs">
            <Center>
              <Paper withBorder p="sm" radius="md">
                <QRCodeSVG value={inviteUrl} size={160} />
              </Paper>
            </Center>
            <Group justify="space-between" align="center">
              <Badge size="xs" color="gray" variant="outline">
                {expiryLabel}
              </Badge>
              <Tooltip label="Generate a new link" withArrow position="top">
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  color="gray"
                  onClick={() => generate(mode)}
                  aria-label="Regenerate invite link"
                >
                  <IconRefresh size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>

            <Group
              gap={0}
              style={{
                border: '1px solid var(--mantine-color-gray-3)',
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              <Text
                size="xs"
                c="dimmed"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontFamily: 'monospace',
                }}
              >
                {inviteUrl}
              </Text>
              <CopyButton value={inviteUrl} timeout={2000}>
                {({ copied, copy }) => (
                  <Button
                    size="xs"
                    variant="light"
                    color={copied ? 'teal' : 'blue'}
                    onClick={copy}
                    leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                    style={{ borderRadius: 0, height: '100%', flexShrink: 0 }}
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                )}
              </CopyButton>
            </Group>

            <Text size="xs" c="dimmed">
              Each link is single-use and expires after 7 days. Generate a new one per device.
            </Text>
          </Stack>
        )}
      </Stack>
    </Modal>
  );
};

export default HomeInviteModal;
