import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { colors } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Large hold-to-record button. Pulses while recording. */
export function MicButton({
  isRecording,
  onPressIn,
  onPressOut,
  disabled,
}: {
  isRecording: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  disabled?: boolean;
}) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isRecording) {
      pulse.value = withRepeat(
        withSequence(withTiming(1.08, { duration: 600 }), withTiming(1, { duration: 600 })),
        -1,
        true
      );
    } else {
      pulse.value = withTiming(1);
    }
  }, [isRecording, pulse]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <AnimatedPressable
      onPressIn={disabled ? undefined : onPressIn}
      onPressOut={disabled ? undefined : onPressOut}
      disabled={disabled}
      style={[
        styles.button,
        animStyle,
        {
          backgroundColor: disabled
            ? colors.text.disabled
            : isRecording
              ? colors.pinkPressed
              : colors.pink,
          borderWidth: isRecording ? 3 : 0,
        },
      ]}
    >
      <Ionicons name="mic" size={40} color={colors.bg.void} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: 'rgba(255, 94, 224, 0.30)',
  },
});
