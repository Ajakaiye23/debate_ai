import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { colors, fonts, radius, spacing } from '@/constants/theme';

/** Animated winner announcement. */
export function VerdictBanner({ winnerName, isTie }: { winnerName: string; isTie?: boolean }) {
  const scale = useSharedValue(0.7);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 350 });
    scale.value = withDelay(120, withSpring(1, { damping: 10, stiffness: 120 }));
  }, [scale, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker}>{isTie ? 'Result' : 'Winner'}</Text>
      <Animated.Text style={[styles.name, style]}>
        {isTie ? "It's a tie" : winnerName}
      </Animated.Text>
      {!isTie && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Victory</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  kicker: {
    color: colors.gold,
    fontSize: 12,
    fontFamily: fonts.heading,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  name: {
    fontFamily: fonts.display,
    fontSize: 40,
    color: colors.sky,
    textAlign: 'center',
  },
  badge: {
    backgroundColor: 'rgba(68, 255, 136, 0.10)',
    borderWidth: 1,
    borderColor: colors.border.win,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.md,
  },
  badgeText: {
    color: colors.win,
    fontSize: 14,
    fontFamily: fonts.heading,
  },
});
