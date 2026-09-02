/**
 * PRACTICE SCREEN — a single focused drill on one weak skill.
 *
 * This is deliberately not a debate. There's no opponent, no rounds, no timer
 * pressure: the AI sets one short scenario, the user answers it, and the AI
 * grades that answer against one skill only. Narrowing it is the point — you
 * can't fix rebuttal technique while also worrying about clarity and facts.
 *
 * Flow: loading → drill shown → user types/speaks → graded → try again or leave.
 */

import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen, Button } from '@/components/Primitives';
import {
  getPracticeDrill,
  scorePracticeAttempt,
  type PracticeDrill,
  type PracticeFeedback,
} from '@/services/claude';
import { SKILL_LABELS, SKILL_BLURBS, type SkillKey } from '@/services/progress';
import { notifySuccess } from '@/utils/haptics';
import { colors, fonts, radius, spacing } from '@/constants/theme';

type Phase = 'loading' | 'drill' | 'grading' | 'result' | 'error';

export default function PracticeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ skill?: string }>();

  // Default to rebuttal — the skill most people are weakest at — if the screen
  // is opened directly rather than from the dashboard.
  const skill = (params.skill as SkillKey) || 'rebuttal';
  const skillLabel = SKILL_LABELS[skill] ?? 'Rebuttal';
  const skillMeaning = SKILL_BLURBS[skill] ?? '';

  const [phase, setPhase] = useState<Phase>('loading');
  const [drill, setDrill] = useState<PracticeDrill | null>(null);
  const [attempt, setAttempt] = useState('');
  const [feedback, setFeedback] = useState<PracticeFeedback | null>(null);
  const [error, setError] = useState('');

  const loadDrill = useCallback(async () => {
    setPhase('loading');
    setFeedback(null);
    setAttempt('');
    try {
      setDrill(await getPracticeDrill(skillLabel, skillMeaning));
      setPhase('drill');
    } catch (e: any) {
      setError(e?.message ?? 'Could not load a drill.');
      setPhase('error');
    }
  }, [skillLabel, skillMeaning]);

  useEffect(() => {
    loadDrill();
  }, [loadDrill]);

  const submit = async () => {
    if (!drill || !attempt.trim()) return;
    setPhase('grading');
    try {
      const result = await scorePracticeAttempt(skillLabel, skillMeaning, drill, attempt.trim());
      setFeedback(result);
      setPhase('result');
      notifySuccess();
    } catch (e: any) {
      setError(e?.message ?? 'Could not grade that attempt.');
      setPhase('error');
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.kicker}>Practising</Text>
          <Text style={styles.skill}>{skillLabel}</Text>
          <Text style={styles.blurb}>{skillMeaning}</Text>
        </View>

        {phase === 'loading' && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.pink} size="large" />
            <Text style={styles.muted}>Writing you a drill…</Text>
          </View>
        )}

        {phase === 'error' && (
          <View style={styles.center}>
            <Text style={styles.error}>{error}</Text>
            <Button label="Try again" onPress={loadDrill} />
            <Button label="Back" variant="ghost" onPress={() => router.back()} />
          </View>
        )}

        {(phase === 'drill' || phase === 'grading') && drill && (
          <Animated.View entering={FadeInDown.springify()} style={{ gap: spacing.md }}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>The situation</Text>
              <Text style={styles.body}>{drill.scenario}</Text>
            </View>

            <View style={[styles.card, styles.taskCard]}>
              <Text style={[styles.cardLabel, { color: colors.sky }]}>Your task</Text>
              <Text style={styles.body}>{drill.task}</Text>
            </View>

            <View style={styles.hintRow}>
              <Ionicons name="bulb-outline" size={16} color={colors.gold} />
              <Text style={styles.hint}>{drill.hint}</Text>
            </View>

            <TextInput
              value={attempt}
              onChangeText={setAttempt}
              placeholder="Type your response…"
              placeholderTextColor={colors.text.disabled}
              style={styles.input}
              multiline
              editable={phase === 'drill'}
            />

            {phase === 'grading' ? (
              <View style={styles.center}>
                <ActivityIndicator color={colors.pink} />
                <Text style={styles.muted}>Coach is reading it…</Text>
              </View>
            ) : (
              <Button label="Submit for feedback" onPress={submit} disabled={!attempt.trim()} />
            )}
          </Animated.View>
        )}

        {phase === 'result' && feedback && (
          <Animated.View entering={FadeInDown.springify()} style={{ gap: spacing.md }}>
            <View style={styles.scoreCard}>
              <Text style={styles.scoreLabel}>{skillLabel} score</Text>
              <Text style={styles.scoreValue}>{feedback.score}/10</Text>
            </View>

            <View style={styles.card}>
              <Text style={[styles.cardLabel, { color: colors.win }]}>What worked</Text>
              <Text style={styles.body}>{feedback.didWell}</Text>
            </View>

            <View style={styles.card}>
              <Text style={[styles.cardLabel, { color: colors.coral }]}>Do this next time</Text>
              <Text style={styles.body}>{feedback.improve}</Text>
            </View>

            <View style={[styles.card, styles.rewriteCard]}>
              <Text style={[styles.cardLabel, { color: colors.gold }]}>A stronger version</Text>
              <Text style={[styles.body, styles.rewriteText]}>{feedback.rewrite}</Text>
            </View>

            <Button label="Another drill" onPress={loadDrill} />
            <Button label="Done" variant="ghost" onPress={() => router.back()} />
          </Animated.View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  header: { gap: spacing.xs, marginBottom: spacing.xs },
  kicker: {
    fontFamily: fonts.heading,
    fontSize: 12,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  skill: { fontFamily: fonts.display, fontSize: 30, color: colors.sky },
  blurb: { fontFamily: fonts.body, fontSize: 14, color: colors.text.secondary, lineHeight: 21 },
  center: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  muted: { fontFamily: fonts.body, fontSize: 14, color: colors.text.secondary },
  error: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.coral,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.pink,
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.xs,
  },
  taskCard: { borderColor: colors.border.sky },
  rewriteCard: { borderColor: 'rgba(255, 215, 0, 0.3)' },
  cardLabel: {
    fontFamily: fonts.heading,
    fontSize: 12,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  body: { fontFamily: fonts.body, fontSize: 15, color: colors.text.primary, lineHeight: 22 },
  rewriteText: { fontStyle: 'italic' },
  hintRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  hint: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.text.secondary, lineHeight: 19 },
  input: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.pink,
    borderRadius: radius.lg,
    padding: spacing.md,
    color: colors.text.primary,
    fontFamily: fonts.body,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  scoreCard: {
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.sky,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
  },
  scoreLabel: {
    fontFamily: fonts.heading,
    fontSize: 12,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  scoreValue: { fontFamily: fonts.display, fontSize: 44, color: colors.sky },
});
