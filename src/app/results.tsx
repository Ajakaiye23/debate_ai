import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Button, Divider } from '@/components/Primitives';
import { VerdictBanner } from '@/components/VerdictBanner';
import { ScoreBreakdown } from '@/components/ScoreBreakdown';
import { speak as speakTts } from '@/services/tts';
import { notifySuccess } from '@/utils/haptics';
import { playSound } from '@/services/sounds';
import { getLastSession, getLastSpokenVerdict } from '@/store/activeDebate';
import { weakestSkillOf, SKILL_LABELS } from '@/services/progress';
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
      // Gavel, then (if there's a winner) a sting, then the spoken verdict.
      playSound('verdict');
      notifySuccess(); // celebratory buzz as the verdict lands
      const tie = session.winner === 'tie';
      if (!tie) setTimeout(() => playSound('winner'), 420);
      const toRead = getLastSpokenVerdict() ?? session.verdict;
      if (toRead) setTimeout(() => speakTts(toRead).catch(() => {}), tie ? 500 : 1100);
    }
  }, [session, router]);

  if (!session) return <Screen />;

  const isTie = session.winner === 'tie';
  const winnerName = isTie
    ? ''
    : (session.winnerLabel ?? (session.winner as { name: string }).name);

  // Which skill did this player score lowest on in this debate? That's what the
  // "practice" button below targets, so the offer is about the debate they just
  // finished rather than a generic drill.
  const weakestSkill = weakestSkillOf(session);

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
          {/* The loop closes here: right after seeing the verdict is when someone
              actually wants to fix the thing they just lost points on. */}
          {weakestSkill && (
            <Button
              label={`Practice your ${SKILL_LABELS[weakestSkill].toLowerCase()}`}
              onPress={() =>
                router.push({ pathname: '/practice', params: { skill: weakestSkill } })
              }
            />
          )}
          <Button label="See your progress" variant="secondary" onPress={() => router.push('/progress')} />
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
          <Button label="Home" sound="back" onPress={() => router.replace('/')} />
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
