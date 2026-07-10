import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  interpolateColor,
  withTiming,
} from 'react-native-reanimated';
import { colors, radius } from '@/constants/theme';

/** Animated countdown bar. Fills from full → empty and shifts sky → coral under 10s. */
export function TimerBar({ timeLeft, duration }: { timeLeft: number; duration: number }) {
  const pct = useDerivedValue(() => withTiming(Math.max(0, Math.min(1, timeLeft / duration))));

  const style = useAnimatedStyle(() => ({
    width: `${pct.value * 100}%`,
    backgroundColor: interpolateColor(
      timeLeft,
      [0, 10, 11],
      [colors.coral, colors.coral, colors.sky]
    ),
  }));

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, style]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    height: 6,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
});
