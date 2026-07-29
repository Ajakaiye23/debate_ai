import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Button, Divider } from '@/components/Primitives';
import { VerdictBanner } from '@/components/VerdictBanner';
import { ScoreBreakdown } from '@/components/ScoreBreakdown';
import { speak as speakTts } from '@/services/tts';
import { notifySuccess } from '@/utils/haptics';
import { getLastSession, getLastSpokenVerdict } from '@/store/activeDebate';
import { colors, fonts, radius, spacing } from '@/constants/theme';

export default function ResultsScreen() {
  const router = useRouter();
  const session = getLastSession();
  const spoke = useRef(false);

  useEffect(() => {
    if (!session) {
      router.replace('/');
      return;
    }
    if (!spoke.current) {
      spoke.current = true;
      notifySuccess(); // celebratory buzz as the verdict lands
      const toRead = getLastSpokenVerdict() ?? session.verdict;
      if (toRead) speakTts(toRead).catch(() => {});
    }
  }, [session, router]);

  if (!session) return <Screen />;

  const isTie = session.winner === 'tie';
  const winnerName = isTie
    ? ''
    : (session.winnerLabel ?? (session.winner as { name: string }).name);

  const onShare = () => {
    const lines = [
      `Debate Me — "${session.topic}"`,
      isTie ? 'Result: Tie' : `Winner: ${winnerName}`,
      '',
      ...session.arguments.map(
        (a) =>
          `R${a.round} ${a.playerName}: A${a.scores.accuracy}/S${a.scores.strength}/C${a.scores.clarity}`
      ),
      '',
      session.verdict,
    ];
    Share.share({ message: lines.join('\n') }).catch(() => {});
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.topic}>{session.topic}</Text>
        <VerdictBanner winnerName={winnerName} isTie={isTie} />

        {!!session.verdict && (
          <View style={styles.verdictBox}>
            <Text style={styles.verdictLabel}>The Verdict</Text>
            <Text style={styles.verdictText}>{session.verdict}</Text>
          </View>
        )}

        <Divider />
        <Text style={styles.sectionLabel}>Scorecard</Text>
        <ScoreBreakdown args={session.arguments} />

        {!!session.coaching?.length && (
          <>
            <Divider />
            <Text style={styles.sectionLabel}>Coaching</Text>
            <View style={{ gap: spacing.sm }}>
              {session.coaching.map((c) => (
                <View key={c.player} style={styles.coachCard}>
                  <Text style={styles.coachName}>{c.player}</Text>
                  {!!c.strongest && (
                    <Text style={styles.coachLine}>
                      <Text style={styles.coachTag}>Best moment: </Text>
                      {c.strongest}
                    </Text>
                  )}
                  {!!c.tip && (
                    <Text style={styles.coachLine}>
                      <Text style={styles.coachTag}>Next time: </Text>
                      {c.tip}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </>
        )}

        <View style={styles.actions}>
          <Button label="Share scorecard" variant="secondary" onPress={onShare} />
          <Button
            label="Rematch"
            variant="ghost"
            onPress={() =>
              router.replace({
                pathname: '/setup',
                params: {
                  mode: session.mode,
                  ...(session.format === 'formal' ? { format: 'formal' } : {}),
                },
              })
            }
          />
          <Button label="Home" onPress={() => router.replace('/')} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  topic: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  verdictBox: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.pink,
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.sm,
  },
  verdictLabel: {
    fontFamily: fonts.heading,
    fontSize: 12,
    color: colors.gold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  verdictText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text.primary,
    lineHeight: 22,
  },
  sectionLabel: {
    fontFamily: fonts.heading,
    fontSize: 13,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: spacing.md,
  },
  coachCard: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.pink,
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.xs,
  },
  coachName: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.sky,
  },
  coachLine: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text.primary,
    lineHeight: 19,
  },
  coachTag: {
    color: colors.gold,
    fontFamily: fonts.heading,
    fontSize: 12,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
});
