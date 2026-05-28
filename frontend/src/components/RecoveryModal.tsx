import React, { useEffect, useState } from 'react';
import {
  Modal,
  Text,
  Stack,
  CopyButton,
  Button,
  Alert,
  Group,
  Anchor,
  Code,
} from '@mantine/core';
import { IconAlertTriangle, IconCopy, IconCheck, IconShare } from '@tabler/icons-react';
import { getShareUrl } from '../services/api';

interface Props {
  opened: boolean;
  onClose: () => void;
  isNew?: boolean;
}

const RecoveryModal: React.FC<Props> = ({ opened, onClose, isNew = false }) => {
  const [joinUrl, setJoinUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!opened) return;
    setLoading(true);
    setError(null);
    getShareUrl()
      .then(setJoinUrl)
      .catch(() => setError('Could not load share link. Try again.'))
      .finally(() => setLoading(false));
  }, [opened]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconShare size={18} />
          <Text fw={600}>{isNew ? 'Welcome! Save your access link' : 'Share / Recovery link'}</Text>
        </Group>
      }
      centered
      size="md"
    >
      <Stack>
        {isNew && (
          <Alert
            icon={<IconAlertTriangle size={16} />}
            color="orange"
            title="Important — save this link"
          >
            This link is the only way to recover access if you clear your cookies, or to log in on
            another device. Save it somewhere safe — in a note, email, or text message.
          </Alert>
        )}

        {!isNew && (
          <Text size="sm" c="dimmed">
            Share this link with a household member, or open it on another device to connect it to
            your home.
          </Text>
        )}

        {error && (
          <Text c="red" size="sm">
            {error}
          </Text>
        )}

        {loading && <Text size="sm" c="dimmed">Loading…</Text>}

        {joinUrl && (
          <>
            <Code
              block
              style={{ wordBreak: 'break-all', fontSize: 12, userSelect: 'all' }}
            >
              {joinUrl}
            </Code>
            <Group>
              <CopyButton value={joinUrl}>
                {({ copied, copy }) => (
                  <Button
                    leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                    color={copied ? 'teal' : 'blue'}
                    variant="light"
                    onClick={copy}
                  >
                    {copied ? 'Copied!' : 'Copy link'}
                  </Button>
                )}
              </CopyButton>
              <Anchor href={`mailto:?subject=Home+Organizer+Access&body=${encodeURIComponent(joinUrl)}`} size="sm">
                Send via email
              </Anchor>
            </Group>
          </>
        )}

        <Text size="xs" c="dimmed">
          Anyone with this link can access your home organizer. Do not share publicly.
        </Text>
      </Stack>
    </Modal>
  );
};

export default RecoveryModal;
