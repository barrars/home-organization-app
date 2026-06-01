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
  TextInput,
  Center,
  Paper,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCopy,
  IconCheck,
  IconShare,
  IconRefresh,
} from '@tabler/icons-react';
import { QRCodeSVG } from 'qrcode.react';
import { getShareUrl } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  opened: boolean;
  onClose: () => void;
  isNew?: boolean;
}

const RecoveryModal: React.FC<Props> = ({ opened, onClose, isNew = false }) => {
  const { setHomeName, homeName, rotateToken } = useAuth();
  const [joinUrl, setJoinUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [nameSaved, setNameSaved] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);

  useEffect(() => {
    if (!opened) return;
    setLoading(true);
    setError(null);
    setNameInput('');
    setNameSaved(false);
    setConfirmRotate(false);
    getShareUrl()
      .then(setJoinUrl)
      .catch(() => setError('Could not load recovery key. Try again.'))
      .finally(() => setLoading(false));
  }, [opened]);

  const handleRotate = async () => {
    setRotating(true);
    setError(null);
    try {
      const newJoinUrl = await rotateToken();
      setJoinUrl(newJoinUrl);
      setConfirmRotate(false);
    } catch {
      setError('Could not regenerate link. Try again.');
    } finally {
      setRotating(false);
    }
  };

  const saveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === homeName) return;
    await setHomeName(trimmed);
    setNameSaved(true);
  };

  const nameRightSection = () => {
    if (nameSaved) return <IconCheck size={16} color="var(--mantine-color-teal-6)" />;
    if (nameInput.trim() && nameInput.trim() !== homeName) {
      return (
        <Button size="compact-xs" variant="light" onClick={saveName}>
          Save
        </Button>
      );
    }
    return null;
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconShare size={18} />
          <Text fw={600}>{isNew ? 'Welcome! Save your recovery key' : 'Recovery key'}</Text>
        </Group>
      }
      centered
      size="md"
    >
      <Stack>
        {isNew && (
          <>
            <TextInput
              label="Name your home (optional)"
              placeholder="e.g. The Smith House"
              value={nameInput}
              onChange={(e) => {
                setNameInput(e.currentTarget.value);
                setNameSaved(false);
              }}
              maxLength={50}
              data-autofocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveName();
              }}
              rightSection={nameRightSection()}
              rightSectionWidth={nameSaved ? 28 : 56}
            />
            <Alert
              icon={<IconAlertTriangle size={16} />}
              color="orange"
              title="Important — save your recovery key"
            >
              This is your master access key. It's the only way to recover your home if you clear
              your cookies, or to sign in on another device. Save it somewhere safe — a note, email,
              or password manager. Do not share it publicly.
            </Alert>
          </>
        )}

        {!isNew && (
          <Text size="sm" c="dimmed">
            Use this key to recover access on a new device, or if your cookies are cleared. To add a
            household member, use the{' '}
            <Text span fw={500} c="blue">
              Invite
            </Text>{' '}
            button instead — those links expire and are safer to share.
          </Text>
        )}

        {error && (
          <Text c="red" size="sm">
            {error}
          </Text>
        )}

        {loading && (
          <Text size="sm" c="dimmed">
            Loading…
          </Text>
        )}

        {joinUrl && (
          <>
            <Center>
              <Paper withBorder p="sm" radius="md">
                <QRCodeSVG value={joinUrl} size={180} />
              </Paper>
            </Center>
            <Code block style={{ wordBreak: 'break-all', fontSize: 12, userSelect: 'all' }}>
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
              <Anchor
                href={`mailto:?subject=Home+Organizer+Recovery+Key&body=${encodeURIComponent('Save this recovery key somewhere safe — do not share it publicly.\n\n' + joinUrl)}`}
                size="sm"
              >
                Send via email
              </Anchor>
            </Group>

            {confirmRotate ? (
              <Alert
                icon={<IconAlertTriangle size={16} />}
                color="orange"
                title="This will invalidate the old recovery key"
              >
                Anyone using the old link will lose access. Only their active cookie-based sessions
                will continue to work.
                <Group mt="xs" gap="xs">
                  <Button size="xs" color="orange" loading={rotating} onClick={handleRotate}>
                    Yes, regenerate
                  </Button>
                  <Button size="xs" variant="subtle" onClick={() => setConfirmRotate(false)}>
                    Cancel
                  </Button>
                </Group>
              </Alert>
            ) : (
              <Button
                size="xs"
                variant="subtle"
                color="gray"
                leftSection={<IconRefresh size={14} />}
                onClick={() => setConfirmRotate(true)}
              >
                Regenerate key (invalidates old one)
              </Button>
            )}
          </>
        )}

        <Text size="xs" c="dimmed">
          This key grants permanent full access. Treat it like a password — store it safely and
          don't share it publicly.
        </Text>
      </Stack>
    </Modal>
  );
};

export default RecoveryModal;
