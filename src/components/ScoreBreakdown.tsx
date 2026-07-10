import { View, Text, StyleSheet } from 'react-native';
import type { Argument } from '@/types/debate';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { ScorePill } from './ScorePill';

/** Per-round score table for the results screen. */
export function ScoreBreakdown({ args }: { args: Argument[] }) {
  return (
    <View style={{ gap: spacing.sm + 4 }}>
      {args.map((a, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.meta}>
            {a.playerName} · {a.label}
          </Text>
          <View style={styles.pills}>
            <ScorePill label="Accuracy" score={a.scores.accuracy} />
            <ScorePill label="Strength" score={a.scores.strength} />
            <ScorePill label="Clarity" score={a.scores.clarity} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.pink,
    borderRadius: radius.xl,
    padding: spacing.md,
  },
  meta: {
    color: colors.text.secondary,
    fontSize: 11,
    fontFamily: fonts.heading,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  pills: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
