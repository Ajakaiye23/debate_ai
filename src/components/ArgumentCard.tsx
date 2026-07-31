import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import type { Argument } from '@/types/debate';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { playSound } from '@/services/sounds';
import { ScorePill } from './ScorePill';

/** Shows a transcribed argument with its scores. Slides up on mount. */
export function ArgumentCard({ arg }: { arg: Argument }) {
  const slide = useSharedValue(60);
  const opacity = useSharedValue(0);

  useEffect(() => {
    slide.value = withSpring(0, { damping: 18, stiffness: 120 });
    opacity.value = withTiming(1, { duration: 250 });
    playSound('card');
    if (arg.fallacies?.length) setTimeout(() => playSound('fallacy'), 260);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: slide.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.card, style]}>
      <Text style={styles.meta}>
        {arg.playerName} · {arg.label}
        {arg.winner ? '  ·  WON' : ''}
      </Text>
      <Text style={styles.transcript}>{arg.transcript}</Text>
      <View style={styles.pills}>
        <ScorePill label="Accuracy" score={arg.scores.accuracy} />
        <ScorePill label="Strength" score={arg.scores.strength} />
        <ScorePill label="Clarity" score={arg.scores.clarity} />
        {arg.rebuttal !== undefined && <ScorePill label="Rebuttal" score={arg.rebuttal} />}
      </View>
      {!!arg.fallacies?.length && (
        <View style={styles.fallacies}>
          {arg.fallacies.map((f) => (
            <View key={f} style={styles.fallacyChip}>
              <Text style={styles.fallacyText}>⚠ {f}</Text>
            </View>
          ))}
        </View>
      )}
      {!!arg.factCheckNotes && <Text style={styles.notes}>{arg.factCheckNotes}</Text>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.pink,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginTop: spacing.sm + 4,
  },
  meta: {
    color: colors.text.secondary,
    fontSize: 11,
    fontFamily: fonts.heading,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  transcript: {
    color: colors.text.primary,
    fontSize: 14,
    fontFamily: fonts.body,
    lineHeight: 21,
  },
  pills: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm + 4,
  },
  fallacies: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  fallacyChip: {
    backgroundColor: 'rgba(255, 107, 138, 0.12)',
    borderWidth: 1,
    borderColor: colors.coral,
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
  },
  fallacyText: {
    color: colors.coral,
    fontSize: 11,
    fontFamily: fonts.heading,
  },
  notes: {
    color: colors.text.secondary,
    fontSize: 12,
    fontFamily: fonts.body,
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: spacing.sm + 4,
  },
});
