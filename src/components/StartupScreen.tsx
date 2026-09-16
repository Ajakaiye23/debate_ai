import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  FadeOut,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { DuskBackground } from './DuskBackground';
import { colors, fonts, spacing } from '@/constants/theme';

/**
 * Branded startup overlay. Sits on top of the app on cold launch, plays a short
 * reveal (logo springs in, glow pulses, wordmark + tagline fade up), then calls
 * onDone and fades itself out. Auto-dismisses so it never blocks the user.
 */
export function StartupScreen({ onDone }: { onDone: () => void }) {
  const scale = useSharedValue(0.82);
  const glow = useSharedValue(0.4);
  const textOpacity = useSharedValue(0);
  const textShift = useSharedValue(12);

  useEffect(() => {
    scale.value = withTiming(1, { duration: 620, easing: Easing.out(Easing.back(1.5)) });
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 850, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.45, { duration: 850, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    textOpacity.value = withDelay(320, withTiming(1, { duration: 420 }));
    textShift.value = withDelay(320, withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) }));

    const t = setTimeout(onDone, 1550);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: glow.value,
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textShift.value }],
  }));

  return (
    <Animated.View style={styles.root} exiting={FadeOut.duration(420)} pointerEvents="none">
      <DuskBackground />
      <View style={styles.center}>
        <Animated.Image
          source={require('@/assets/images/icon.png')}
          style={[styles.logo, logoStyle]}
          resizeMode="contain"
        />
        <Animated.View style={[styles.textWrap, textStyle]}>
          <Text style={styles.title}>Debate Me</Text>
          <View style={styles.rule} />
          <Text style={styles.tagline}>Enter the arena</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg.base,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  logo: {
    width: 132,
    height: 132,
    borderRadius: 34,
    shadowColor: colors.pink,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
  },
  textWrap: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 40,
    color: colors.sky,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(133, 194, 255, 0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  rule: {
    width: 48,
    height: 3,
    borderRadius: 999,
    backgroundColor: colors.pink,
    shadowColor: colors.pink,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  tagline: {
    fontFamily: fonts.heading,
    fontSize: 13,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 2.5,
  },
});
