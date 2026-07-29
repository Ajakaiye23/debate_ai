import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Button, Chip } from '@/components/Primitives';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { getDeviceId, getDisplayName, setDisplayName } from '@/store/identity';
import {
  createRoom,
  joinRoom,
  subscribeRoom,
  startRoom,
  leaveRoom,
  firebaseConfigured,
  type Room,
} from '@/services/firebase';

const ROUND_OPTIONS = [1, 2, 3, 4, 5];
const DURATION_OPTIONS = [15, 30, 60, 90];

export default function MultiplayerScreen() {
  const router = useRouter();
  const [name, setName] = useState(getDisplayName());
  const [phase, setPhase] = useState<'menu' | 'host' | 'guest'>('menu');
  const [code, setCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [busy, setBusy] = useState(false);

  // Host config
  const [topic, setTopic] = useState('');
  const [hostSide, setHostSide] = useState<'for' | 'against'>('for');
  const [rounds, setRounds] = useState(3);
  const [duration, setDuration] = useState(30);

  const codeRef = useRef('');
  codeRef.current = code;

  // Subscribe to the room once we have a code; navigate when it goes active.
  useEffect(() => {
    if (!code) return;
    const unsub = subscribeRoom(code, (r) => {
      setRoom(r);
      if (r?.status === 'active') {
        router.replace({ pathname: '/mp-debate', params: { code } });
      }
    });
    return unsub;
  }, [code, router]);

  const ensureName = async (): Promise<boolean> => {
    if (!name.trim()) {
      Alert.alert('Name needed', 'Enter a display name first.');
      return false;
    }
    await setDisplayName(name);
    return true;
  };

  const onCreate = async () => {
    if (!(await ensureName())) return;
    setBusy(true);
    try {
      const c = await createRoom({ deviceId: getDeviceId(), name: name.trim() });
      setCode(c);
      setPhase('host');
    } catch (e: any) {
      Alert.alert('Could not create room', e?.message ?? 'Try again.');
    }
    setBusy(false);
  };

  const onJoin = async () => {
    if (!(await ensureName())) return;
    const c = joinCode.trim().toUpperCase();
    if (c.length !== 6) {
      Alert.alert('Code', 'Enter the 6-character room code.');
      return;
    }
    setBusy(true);
    try {
      const r = await joinRoom(c, { deviceId: getDeviceId(), name: name.trim() });
      if (!r) {
        Alert.alert('Room', 'Room not found, already full, or already started.');
      } else {
        setCode(c);
        setPhase('guest');
      }
    } catch (e: any) {
      Alert.alert('Could not join', e?.message ?? 'Try again.');
    }
    setBusy(false);
  };

  const onStart = async () => {
    if (!topic.trim()) {
      Alert.alert('Topic', 'Enter a debate topic.');
      return;
    }
    if (!room?.players.player2) {
      Alert.alert('Waiting', 'Wait for an opponent to join first.');
      return;
    }
    setBusy(true);
    try {
      await startRoom(code, { topic: topic.trim(), rounds, turnDuration: duration, hostSide });
    } catch (e: any) {
      Alert.alert('Could not start', e?.message ?? 'Try again.');
    }
    setBusy(false);
  };

  const onCancel = () => {
    if (phase === 'host' && code) leaveRoom(code);
    setCode('');
    setRoom(null);
    setPhase('menu');
  };

  const onShareCode = () => {
    Share.share({
      message: `Join my Debate Me party! Open the app → Online Multiplayer → Join, and enter code: ${code}`,
    }).catch(() => {});
  };

  if (!firebaseConfigured()) {
    return (
      <Screen>
        <View style={styles.notice}>
          <Text style={styles.h1}>Online multiplayer</Text>
          <Text style={styles.body}>
            This needs a Firebase project. Add your `EXPO_PUBLIC_FIREBASE_*` keys (see
            server/README and the project notes), then restart — and online rooms will work.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Section label="Your display name">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Alex"
            placeholderTextColor={colors.text.disabled}
            style={styles.input}
            maxLength={24}
          />
        </Section>

        {phase === 'menu' && (
          <>
            <Button label="Start a party" onPress={onCreate} disabled={busy} />
            <Section label="Join a party">
              <Text style={styles.body}>
                In the same room or across the world — enter the host's 6-character code.
              </Text>
              <TextInput
                value={joinCode}
                onChangeText={(t) => setJoinCode(t.toUpperCase())}
                placeholder="6-character code"
                placeholderTextColor={colors.text.disabled}
                autoCapitalize="characters"
                style={[styles.input, { fontFamily: fonts.mono, letterSpacing: 4 }]}
                maxLength={6}
              />
              <Button label="Join" variant="secondary" onPress={onJoin} disabled={busy} />
            </Section>
          </>
        )}

        {phase === 'host' && (
          <>
            <View style={styles.codeBox}>
              <Text style={styles.codeLabel}>Party code — share it</Text>
              <Text style={styles.code}>{code}</Text>
              <Text style={styles.body}>
                {room?.players.player2
                  ? `${room.players.player2.name} joined. Set up the debate and start.`
                  : 'Read it out to someone next to you, or share it below.'}
              </Text>
              <Button label="Share code" variant="secondary" onPress={onShareCode} />
            </View>

            <Section label="What do you want to debate?">
              <TextInput
                value={topic}
                onChangeText={setTopic}
                placeholder="e.g. Remote work beats the office"
                placeholderTextColor={colors.text.disabled}
                style={[styles.input, { minHeight: 56 }]}
                multiline
              />
            </Section>
            <Section label="Your side">
              <View style={styles.row}>
                <Chip label="For" selected={hostSide === 'for'} onPress={() => setHostSide('for')} />
                <Chip
                  label="Against"
                  selected={hostSide === 'against'}
                  onPress={() => setHostSide('against')}
                />
              </View>
            </Section>
            <Section label="Rounds">
              <View style={styles.row}>
                {ROUND_OPTIONS.map((r) => (
                  <Chip key={r} label={String(r)} selected={rounds === r} onPress={() => setRounds(r)} />
                ))}
              </View>
            </Section>
            <Section label="Turn duration">
              <View style={styles.row}>
                {DURATION_OPTIONS.map((d) => (
                  <Chip
                    key={d}
                    label={`${d}s`}
                    selected={duration === d}
                    onPress={() => setDuration(d)}
                  />
                ))}
              </View>
            </Section>

            <Button
              label="Start debate"
              onPress={onStart}
              disabled={busy || !room?.players.player2}
            />
            <Button label="Cancel" variant="ghost" onPress={onCancel} />
          </>
        )}

        {phase === 'guest' && (
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>Joined room</Text>
            <Text style={styles.code}>{code}</Text>
            <Text style={styles.body}>Waiting for the host to start the debate…</Text>
            <Button label="Leave" variant="ghost" onPress={onCancel} />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  notice: { padding: spacing.lg, gap: spacing.md },
  h1: { fontFamily: fonts.display, fontSize: 26, color: colors.sky },
  body: { fontFamily: fonts.body, fontSize: 14, color: colors.text.secondary, lineHeight: 21 },
  sectionLabel: {
    fontFamily: fonts.heading,
    fontSize: 13,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  input: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.pink,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    color: colors.text.primary,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  codeBox: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.pink,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  codeLabel: {
    fontFamily: fonts.heading,
    fontSize: 12,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  code: {
    fontFamily: fonts.mono,
    fontSize: 40,
    color: colors.sky,
    letterSpacing: 6,
  },
});
