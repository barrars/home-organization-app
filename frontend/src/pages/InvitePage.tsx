import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Stack,
  Title,
  Text,
  Button,
  Group,
  Loader,
  Center,
  Alert,
  Badge,
  Divider,
  Card,
} from '@mantine/core';
import { IconHome2, IconEye, IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { resolveHomeInvite, claimHomeInvite, switchHome as switchHomeApi } from '../services/api';
import { getStoredHomes } from '../contexts/AuthContext';
import type { ResolvedHomeInvite } from '../types';

const InvitePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [invite, setInvite] = useState<ResolvedHomeInvite | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if (!token) return;
    resolveHomeInvite(token)
      .then(setInvite)
      .catch((err: { response?: { status?: number } }) => {
        const status = err?.response?.status;
        if (status === 404) setError('This invite link does not exist.');
        else if (status === 410) setError('This invite link has already been used or has expired.');
        else setError('Could not load invite. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleClaim = async () => {
    if (!token || !invite) return;
    setClaiming(true);
    try {
      const result = await claimHomeInvite(token);

      if (result.mode === 'join' && result.homeToken) {
        // Switch the server-side httpOnly cookie to the invited home
        const switchResult = await switchHomeApi(result.homeToken!);
        // Upsert the invited home into localStorage with its real id so the
        // household list shows it immediately after the hard reload.
        const homes = getStoredHomes();
        const idx = homes.findIndex((h) => h.token === result.homeToken);
        if (idx >= 0) {
          homes[idx].id = String(switchResult.id);
          homes[idx].name = result.homeName;
        } else {
          homes.push({ id: String(switchResult.id), token: result.homeToken!, name: result.homeName });
        }
        localStorage.setItem('home_organizer_homes', JSON.stringify(homes));
        localStorage.setItem('home_organizer_active_id', String(switchResult.id));
        // Hard reload so AuthContext picks up the new httpOnly cookie
        window.location.href = '/';
      } else {
        // view mode — just acknowledge
        setClaimed(true);
      }
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } } };
      if (e?.response?.status === 410) {
        setError('This invite was claimed by someone else just now. Ask for a new link.');
      } else {
        setError('Failed to claim invite. Please try again.');
      }
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <Center h="100vh">
        <Stack align="center" gap="sm">
          <Loader />
          <Text size="sm" c="dimmed">Loading invite…</Text>
        </Stack>
      </Center>
    );
  }

  if (error) {
    return (
      <Container size="xs" py="xl">
        <Alert icon={<IconAlertCircle size={18} />} color="red" title="Invite unavailable">
          {error}
        </Alert>
        <Button variant="subtle" mt="md" onClick={() => navigate('/')}>
          Go to my home
        </Button>
      </Container>
    );
  }

  if (!invite) return null;

  const isJoin = invite.mode === 'join';
  const expiresDate = new Date(invite.expiresAt).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  if (claimed) {
    return (
      <Container size="xs" py="xl">
        <Card shadow="sm" padding="xl" radius="md" withBorder>
          <Stack align="center" gap="md">
            <IconCheck size={48} color="var(--mantine-color-teal-6)" />
            <Title order={3}>You're in as a guest!</Title>
            <Text size="sm" c="dimmed" ta="center">
              You now have guest access to <strong>{invite.homeName}</strong>. Shared rooms and
              items from that home will appear in your "Shared with Me" tab.
            </Text>
            <Button onClick={() => navigate('/shared-with-me')} fullWidth>
              Go to Shared with Me
            </Button>
          </Stack>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="xs" py="xl">
      <Card shadow="sm" padding="xl" radius="md" withBorder>
        <Stack gap="md">
          {/* Header */}
          <Group gap="xs">
            {isJoin ? (
              <IconHome2 size={28} color="var(--mantine-color-blue-6)" />
            ) : (
              <IconEye size={28} color="var(--mantine-color-violet-6)" />
            )}
            <div>
              <Title order={3}>{invite.homeName}</Title>
              <Badge size="xs" color={isJoin ? 'blue' : 'violet'} mt={2}>
                {isJoin ? 'Join as primary home' : 'Guest view'}
              </Badge>
            </div>
          </Group>

          <Divider />

          <Text size="sm">
            {isJoin
              ? `You've been invited to adopt "${invite.homeName}" as your active home on this device. Your rooms, items, and settings will switch to this household.`
              : `You've been invited to view "${invite.homeName}" as a guest. Their shared rooms and items will appear in your "Shared with Me" tab.`}
          </Text>

          <Text size="xs" c="dimmed">Expires {expiresDate} · single use</Text>

          <Button
            fullWidth
            color={isJoin ? 'blue' : 'violet'}
            leftSection={isJoin ? <IconHome2 size={16} /> : <IconEye size={16} />}
            loading={claiming}
            onClick={handleClaim}
          >
            {isJoin ? `Set "${invite.homeName}" as my home` : 'Accept guest access'}
          </Button>

          <Button variant="subtle" color="gray" size="xs" onClick={() => navigate('/')}>
            Not now — go to my home
          </Button>
        </Stack>
      </Card>
    </Container>
  );
};

export default InvitePage;
