/**
 * PROGRESS DASHBOARD — "am I actually getting better?"
 *
 * Reads every saved debate, works out how the user scores on each of the four
 * skills, and highlights the weakest one with a button that sends them straight
 * into a drill for it. This screen is the hinge of the whole practice loop:
 * debate → see the weak skill here → practise it → debate again.
 */

import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen, Button } from '@/components/Primitives';
import { loadDebates } from '@/store/debateHistory';
import {
  computeProgress,
  SKILL_LABELS,
  SKILL_BLURBS,
  type ProgressReport,
  type SkillStat,
} from '@/services/progress';
import { colors, fonts, radius, spacing } from '@/constants/theme';

export default function ProgressScreen() {
  const router = useRouter();
  const [report, setReport] = useState<ProgressReport | null>(null);

  // Recompute every time the screen is opened, so a debate finished a moment
  // ago is already reflected here.
  useFocusEffect(
    useCallback(() => {
      loadDebates().then((sessions) => setReport(computeProgress(sessions)));
    }, [])
  );

  if (!report) return <Screen />;

  // Nothing to analyse yet — send them to their first debate instead of showing
  // a wall of zeroes.
  if (report.totalTurns === 0) {
    return (
      <Screen>
        <View style={styles.empty}>
          <Ionicons name="stats-chart" size={48} color={colors.text.disabled} />
          <Text style={styles.emptyTitle}>No stats yet</Text>
          <Text style={styles.emptyText}>
            Finish a debate and your skills will start showing up here — including which
            one to work on next.
          </Text>
          <Button label="Start a debate" onPress={() => router.replace('/')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Stat value={String(report.totalDebates)} label="debates" />
          <Stat value={String(report.totalTurns)} label="turns judged" />
          {report.strongest && (
            <Stat
              value={report.strongest.average.toFixed(1)}
              label={`best: ${SKILL_LABELS[report.strongest.skill].toLowerCase()}`}
            />
          )}
        </View>

        <Text style={styles.sectionLabel}>Your skills</Text>
        {report.skills.map((stat, i) => (
          <Animated.View key={stat.skill} entering={FadeInDown.delay(i * 60).springify()}>
            <SkillRow stat={stat} isWeakest={report.weakest?.skill === stat.skill} />
          </Animated.View>
        ))}

        {report.weakest && (
          <Animated.View entering={FadeInDown.delay(280)} style={styles.focusCard}>
            <Text style={styles.focusKicker}>Work on this next</Text>
            <Text style={styles.focusSkill}>{SKILL_LABELS[report.weakest.skill]}</Text>
            <Text style={styles.focusText}>{SKILL_BLURBS[report.weakest.skill]}</Text>
            <Button
              label="Practice this weakness"
              onPress={() =>
                router.push({ pathname: '/practice', params: { skill: report.weakest!.skill } })
              }
            />
          </Animated.View>
        )}

        {report.recent.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Recent debates</Text>
            {report.recent.map((r, i) => (
              <View key={i} style={styles.recentRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentTopic} numberOfLines={1}>
                    {r.topic}
                  </Text>
                  <Text style={styles.recentDate}>
                    {new Date(r.date).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.recentScore}>{r.average.toFixed(1)}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** One skill: a labelled bar, the score, and whether it's trending up or down. */
function SkillRow({ stat, isWeakest }: { stat: SkillStat; isWeakest: boolean }) {
  const pct = Math.max(0, Math.min(1, stat.average / 10));
  const hasData = stat.samples > 0;
  // Only call a trend real once it's moved by a noticeable amount.
  const rising = stat.trend > 0.3;
  const falling = stat.trend < -0.3;

  return (
    <View style={[styles.skillRow, isWeakest && styles.skillRowWeak]}>
      <View style={styles.skillTop}>
        <Text style={styles.skillName}>{SKILL_LABELS[stat.skill]}</Text>
        <View style={styles.skillRight}>
          {rising && <Ionicons name="trending-up" size={16} color={colors.win} />}
          {falling && <Ionicons name="trending-down" size={16} color={colors.coral} />}
          <Text style={styles.skillScore}>{hasData ? stat.average.toFixed(1) : '—'}</Text>
        </View>
      </View>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            { width: `${pct * 100}%`, backgroundColor: isWeakest ? colors.coral : colors.sky },
          ]}
        />
      </View>
      <Text style={styles.skillMeta}>
        {hasData ? `${stat.samples} turns judged` : 'Not enough data yet'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  emptyTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.text.primary },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  headerRow: { flexDirection: 'row', gap: spacing.sm },
  stat: {
    flex: 1,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.pink,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: { fontFamily: fonts.display, fontSize: 24, color: colors.sky },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 2,
  },
  sectionLabel: {
    fontFamily: fonts.heading,
    fontSize: 13,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: spacing.sm,
  },
  skillRow: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.pink,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  skillRowWeak: { borderColor: colors.coral },
  skillTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  skillName: { fontFamily: fonts.heading, fontSize: 15, color: colors.text.primary },
  skillRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  skillScore: { fontFamily: fonts.mono, fontSize: 16, color: colors.text.primary },
  barTrack: {
    height: 8,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: radius.pill },
  skillMeta: { fontFamily: fonts.body, fontSize: 11, color: colors.text.secondary },
  focusCard: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.coral,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  focusKicker: {
    fontFamily: fonts.heading,
    fontSize: 12,
    color: colors.coral,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  focusSkill: { fontFamily: fonts.display, fontSize: 24, color: colors.text.primary },
  focusText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 21,
    marginBottom: spacing.xs,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.pink,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  recentTopic: { fontFamily: fonts.heading, fontSize: 14, color: colors.text.primary },
  recentDate: { fontFamily: fonts.body, fontSize: 11, color: colors.text.secondary },
  recentScore: { fontFamily: fonts.mono, fontSize: 18, color: colors.sky },
});
