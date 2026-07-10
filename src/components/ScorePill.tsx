import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, radius, spacing } from '@/constants/theme';

export function ScorePill({ label, score }: { label: string; score: number }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.score}>{score}/10</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    paddingVertical: spacing.xs + 2,
    alignItems: 'center',
  },
  label: {
    color: colors.sky,
    fontSize: 11,
    fontFamily: fonts.heading,
  },
  score: {
    color: colors.text.primary,
    fontSize: 14,
    fontFamily: fonts.mono,
    marginTop: 2,
  },
});
