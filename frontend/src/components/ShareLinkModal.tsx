import React, { useEffect, useState } from 'react';
import {
  Modal,
  Stack,
  Text,
  Group,
  Button,
  CopyButton,
  Switch,
  Loader,
  Alert,
  Anchor,
  Badge,
} from '@mantine/core';
import { IconLink, IconCopy, IconCheck, IconAlertCircle, IconTrash } from '@tabler/icons-react';
import { createShareLink, updateShareLink, removeShareLink } from '../services/api';
import type { ShareLink } from '../types';

interface ShareLinkModalProps {
  opened: boolean;
  onClose: () => void;
  targetType: 'room' | 'item';
  targetId: string;
  targetName: string;
}

const ShareLinkModal: React.FC<ShareLinkModalProps> = ({
  opened,
  onClose,
  targetType,
  targetId,
  targetName,
}) => {
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  const shareUrl = shareLink ? `${window.location.origin}/share/${shareLink.token}` : '';

  useEffect(() => {
    if (!opened) return;
    // Create or fetch the share link when the modal opens
    setLoading(true);
    setError(null);
    createShareLink({ targetType, targetId, canEdit: shareLink?.canEdit ?? false })
      .then(setShareLink)
      .catch(() => setError('Failed to generate share link.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, targetType, targetId]);

  const handleToggleEdit = async (canEdit: boolean) => {
    if (!shareLink) return;
    setToggling(true);
    try {
      const updated = await updateShareLink(shareLink._id, { canEdit });
      setShareLink(updated);
    } catch {
      setError('Failed to update permissions.');
    } finally {
      setToggling(false);
    }
  };

  const handleToggleActive = async (active: boolean) => {
    if (!shareLink) return;
    setToggling(true);
    try {
      const updated = await updateShareLink(shareLink._id, { active });
      setShareLink(updated);
    } catch {
      setError('Failed to update link status.');
    } finally {
      setToggling(false);
    }
  };

  const handleRevoke = async () => {
    if (!shareLink) return;
    setToggling(true);
    try {
      await removeShareLink(shareLink._id);
      setShareLink(null);
      onClose();
    } catch {
      setError('Failed to revoke share link.');
    } finally {
      setToggling(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconLink size={18} />
          <Text fw={600}>Share "{targetName}"</Text>
        </Group>
      }
      size="sm"
    >
      {loading ? (
        <Stack align="center" py="xl">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">
            Generating link…
          </Text>
        </Stack>
      ) : error ? (
        <Alert icon={<IconAlertCircle size={16} />} color="red" title="Error">
          {error}
        </Alert>
      ) : shareLink ? (
        <Stack gap="md">
          {/* Link display */}
          <Stack gap={4}>
            <Text size="xs" fw={600} tt="uppercase" c="dimmed">
              Share link
            </Text>
            <Group gap="xs" wrap="nowrap">
              <Anchor
                href={shareUrl}
                target="_blank"
                size="xs"
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontFamily: 'monospace',
                }}
              >
                {shareUrl}
              </Anchor>
              <CopyButton value={shareUrl} timeout={2000}>
                {({ copied, copy }) => (
                  <Button
                    size="xs"
                    variant={copied ? 'filled' : 'light'}
                    color={copied ? 'teal' : 'blue'}
                    leftSection={copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
                    onClick={copy}
                    style={{ flexShrink: 0 }}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                )}
              </CopyButton>
            </Group>
          </Stack>

          {/* Status badge */}
          <Group gap="xs">
            <Badge size="sm" variant="dot" color={shareLink.active ? 'green' : 'gray'}>
              {shareLink.active ? 'Active' : 'Disabled'}
            </Badge>
            <Badge size="sm" variant="dot" color={shareLink.canEdit ? 'orange' : 'blue'}>
              {shareLink.canEdit ? 'Read & Write' : 'Read only'}
            </Badge>
          </Group>

          {/* Permission toggles */}
          <Stack gap="xs">
            <Switch
              label="Allow editing"
              description="Recipients can add, edit, and remove items"
              checked={shareLink.canEdit}
              disabled={toggling || !shareLink.active}
              onChange={(e) => handleToggleEdit(e.currentTarget.checked)}
            />
            <Switch
              label="Link active"
              description="Disable to prevent new visitors from accessing this link"
              checked={shareLink.active}
              disabled={toggling}
              onChange={(e) => handleToggleActive(e.currentTarget.checked)}
            />
          </Stack>

          {/* Revoke */}
          <Group justify="flex-end" pt="xs">
            <Button
              size="xs"
              variant="subtle"
              color="red"
              leftSection={<IconTrash size={13} />}
              onClick={handleRevoke}
              loading={toggling}
            >
              Revoke link
            </Button>
          </Group>
        </Stack>
      ) : null}
    </Modal>
  );
};

export default ShareLinkModal;
