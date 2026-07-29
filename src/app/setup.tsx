import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Button, Chip } from '@/components/Primitives';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { getSettings } from '@/store/settings';
import { canStartDebate, recordDebate, DAILY_LIMIT } from '@/store/usage';
import { setPendingConfig } from '@/store/activeDebate';
import { buildSegments } from '@/constants/format';
import type { DebateMode, DebateFormat, AIDifficulty, Player } from '@/types/debate';

const ROUND_OPTIONS = [1, 2, 3, 4, 5];
const DURATION_OPTIONS = [15, 30, 60, 90];
const DIFFICULTIES: AIDifficulty[] = ['easy', 'medium', 'hard'];

export default function SetupScreen() {
  const router = useRouter();
  const { mode, format } = useLocalSearchParams<{ mode: DebateMode; format?: DebateFormat }>();
  const isSolo = mode === 'solo-vs-ai';
  const isFormal = format === 'formal';
  const settings = getSettings();

  const [topic, setTopic] = useState('');
  const [p1Name, setP1Name] = useState('Player 1');
  const [p2Name, setP2Name] = useState(isSolo ? 'Rival' : 'Player 2');
  const [p1Side, setP1Side] = useState<'for' | 'against'>('for');
  const [rounds, setRounds] = useState(settings.defaultRounds);
  const [duration, setDuration] = useState(settings.defaultTurnDuration);
  const [customMode, setCustomMode] = useState(
    !DURATION_OPTIONS.includes(settings.defaultTurnDuration)
  );
  const [customText, setCustomText] = useState(String(settings.defaultTurnDuration));
  const [difficulty, setDifficulty] = useState<AIDifficulty>('medium');
  const [teamMode, setTeamMode] = useState(false); // formal only: 2v2 teams
  const [teamAName, setTeamAName] = useState('Team A');
  const [teamBName, setTeamBName] = useState('Team B');
  const [a2Name, setA2Name] = useState('Player 3');
  const [b2Name, setB2Name] = useState('Player 4');
  const [prepMinutes, setPrepMinutes] = useState(0); // formal: prep before openings
  // 2v2: any speaker except Player 1 can be argued by the AI.
  const [p2AI, setP2AI] = useState(false);
  const [a2AI, setA2AI] = useState(false);
  const [b2AI, setB2AI] = useState(false);

  const applyCustom = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 3);
    setCustomText(digits);
    const v = parseInt(digits, 10);
    if (!Number.isNaN(v)) setDuration(Math.min(600, Math.max(5, v)));
  };

  const is2v2 = isFormal && teamMode;
  const canStart =
    topic.trim().length > 0 &&
    !!p1Name.trim() &&
    !!p2Name.trim() &&
    (!is2v2 || (!!a2Name.trim() && !!b2Name.trim() && !!teamAName.trim() && !!teamBName.trim()));

  const start = () => {
    if (!canStartDebate()) {
      Alert.alert(
        'Daily limit reached',
        `You've hit today's limit of ${DAILY_LIMIT} debates. It resets tomorrow — or add your own Anthropic key in Settings for no limit.`,
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Settings', onPress: () => router.push('/settings') },
        ]
      );
      return;
    }
    recordDebate().catch(() => {});

    const fmt: DebateFormat = isFormal ? 'formal' : 'quick';
    const p2Side: 'for' | 'against' = p1Side === 'for' ? 'against' : 'for';
    const player1: Player = {
      id: 'player1',
      name: p1Name.trim(),
      side: p1Side,
      team: is2v2 ? 0 : undefined,
    };
    const player2: Player = {
      id: isSolo ? 'ai' : 'player2',
      name: p2Name.trim(),
      side: p2Side,
      team: is2v2 ? 1 : undefined,
      isAI: isSolo || (is2v2 && p2AI) || undefined,
    };
    const players: Player[] = [player1, player2];
    if (is2v2) {
      players.push(
        { id: 'player3', name: a2Name.trim(), side: p1Side, team: 0, isAI: a2AI || undefined },
        { id: 'player4', name: b2Name.trim(), side: p2Side, team: 1, isAI: b2AI || undefined }
      );
    }
    const anyAI = players.some((p) => p.isAI);

    setPendingConfig({
      topic: topic.trim(),
      mode: mode ?? 'pass-and-play',
      format: fmt,
      players,
      teamNames: is2v2 ? [teamAName.trim(), teamBName.trim()] : undefined,
      rounds,
      turnDuration: duration,
      prepSeconds: isFormal && prepMinutes > 0 ? prepMinutes * 60 : undefined,
      difficulty: anyAI ? difficulty : undefined,
      segments: buildSegments(fmt, rounds, is2v2 ? 4 : 2),
    });
    router.push('/debate');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {isFormal && (
          <View style={styles.formalNote}>
            <Text style={styles.formalTitle}>Formal debate</Text>
            <Text style={styles.hint}>
              Structured: Opening → Cross-examination → Closing. In 2v2, second speakers give the
              constructive, run their own cross-ex, and close for the team.
            </Text>
            <View style={[styles.row, { marginTop: spacing.xs }]}>
              <Chip label="1 v 1" selected={!teamMode} onPress={() => setTeamMode(false)} />
              <Chip label="2 v 2" selected={teamMode} onPress={() => setTeamMode(true)} />
            </View>
          </View>
        )}

        <Section label="What do you want to debate?">
          <TextInput
            value={topic}
            onChangeText={setTopic}
            placeholder="e.g. Pineapple belongs on pizza"
            placeholderTextColor={colors.text.disabled}
            style={styles.topicInput}
            multiline
          />
        </Section>

        <Section label={is2v2 ? 'Team 1' : isSolo ? 'You' : 'Player 1'}>
          {is2v2 && (
            <TextInput
              value={teamAName}
              onChangeText={setTeamAName}
              placeholder="Team name"
              style={styles.nameInput}
              placeholderTextColor={colors.text.disabled}
            />
          )}
          <TextInput
            value={p1Name}
            onChangeText={setP1Name}
            placeholder={is2v2 ? 'First speaker' : undefined}
            style={styles.nameInput}
            placeholderTextColor={colors.text.disabled}
          />
          {is2v2 && (
            <>
              <TextInput
                value={a2Name}
                onChangeText={setA2Name}
                placeholder="Second speaker"
                style={styles.nameInput}
                placeholderTextColor={colors.text.disabled}
              />
              <Chip
                label={a2AI ? '🤖 Second speaker is AI' : 'Make second speaker AI'}
                selected={a2AI}
                onPress={() => setA2AI(!a2AI)}
              />
            </>
          )}
          <View style={styles.row}>
            <Chip label="For" selected={p1Side === 'for'} onPress={() => setP1Side('for')} />
            <Chip
              label="Against"
              selected={p1Side === 'against'}
              onPress={() => setP1Side('against')}
            />
          </View>
        </Section>

        <Section label={is2v2 ? 'Team 2' : isSolo ? 'Opponent (AI)' : 'Player 2'}>
          {is2v2 && (
            <TextInput
              value={teamBName}
              onChangeText={setTeamBName}
              placeholder="Team name"
              style={styles.nameInput}
              placeholderTextColor={colors.text.disabled}
            />
          )}
          <TextInput
            value={p2Name}
            onChangeText={setP2Name}
            editable={!isSolo}
            placeholder={is2v2 ? 'First speaker' : undefined}
            style={[styles.nameInput, isSolo && { color: colors.text.secondary }]}
            placeholderTextColor={colors.text.disabled}
          />
          {is2v2 && (
            <Chip
              label={p2AI ? '🤖 First speaker is AI' : 'Make first speaker AI'}
              selected={p2AI}
              onPress={() => setP2AI(!p2AI)}
            />
          )}
          {is2v2 && (
            <>
              <TextInput
                value={b2Name}
                onChangeText={setB2Name}
                placeholder="Second speaker"
                style={styles.nameInput}
                placeholderTextColor={colors.text.disabled}
              />
              <Chip
                label={b2AI ? '🤖 Second speaker is AI' : 'Make second speaker AI'}
                selected={b2AI}
                onPress={() => setB2AI(!b2AI)}
              />
            </>
          )}
          <Text style={styles.hint}>
            Side: {p1Side === 'for' ? 'Against' : 'For'} (auto-assigned)
          </Text>
        </Section>

        {!isFormal && (
          <Section label="Rounds">
            <View style={styles.row}>
              {ROUND_OPTIONS.map((r) => (
                <Chip
                  key={r}
                  label={String(r)}
                  selected={rounds === r}
                  onPress={() => setRounds(r)}
                />
              ))}
            </View>
          </Section>
        )}

        {isFormal && (
          <Section label="Prep time">
            <Text style={styles.hint}>Silent planning time before the opening statements.</Text>
            <View style={styles.row}>
              {[0, 1, 2, 5].map((m) => (
                <Chip
                  key={m}
                  label={m === 0 ? 'None' : `${m} min`}
                  selected={prepMinutes === m}
                  onPress={() => setPrepMinutes(m)}
                />
              ))}
            </View>
          </Section>
        )}

        <Section label={isFormal ? 'Time per segment' : 'Turn duration'}>
          <View style={styles.row}>
            {DURATION_OPTIONS.map((d) => (
              <Chip
                key={d}
                label={`${d}s`}
                selected={!customMode && duration === d}
                onPress={() => {
                  setCustomMode(false);
                  setDuration(d);
                }}
              />
            ))}
            <Chip
              label="Custom"
              selected={customMode}
              onPress={() => {
                setCustomMode(true);
                applyCustom(customText);
              }}
            />
          </View>
          {customMode && (
            <TextInput
              value={customText}
              onChangeText={applyCustom}
              keyboardType="number-pad"
              placeholder="Seconds per turn (5–600)"
              placeholderTextColor={colors.text.disabled}
              style={styles.nameInput}
            />
          )}
        </Section>

        {(isSolo || (is2v2 && (p2AI || a2AI || b2AI))) && (
          <Section label="AI difficulty">
            <View style={styles.row}>
              {DIFFICULTIES.map((d) => (
                <Chip
                  key={d}
                  label={d[0].toUpperCase() + d.slice(1)}
                  selected={difficulty === d}
                  onPress={() => setDifficulty(d)}
                />
              ))}
            </View>
          </Section>
        )}

        <Button
          label="Start Debate"
          onPress={start}
          disabled={!canStart}
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>
    </Screen>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  formalNote: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.pink,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  formalTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.sky,
  },
  label: {
    fontFamily: fonts.heading,
    fontSize: 13,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  topicInput: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.pink,
    borderRadius: radius.lg,
    padding: spacing.md,
    color: colors.text.primary,
    fontFamily: fonts.body,
    fontSize: 16,
    minHeight: 64,
  },
  nameInput: {
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
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text.secondary,
  },
});
