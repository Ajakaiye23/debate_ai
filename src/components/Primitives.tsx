import { Pressable, Text, View, StyleSheet, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { DuskBackground } from './DuskBackground';

/** Root screen wrapper with the glowing Neon Dusk backdrop. */
export function Screen({ children, style }: { children?: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={styles.root}>
      <DuskBackground />
      <SafeAreaView style={[styles.screen, style]} edges={['top', 'bottom']}>
        {children}
      </SafeAreaView>
    </View>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const palette: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: colors.pink, fg: colors.bg.void },
    secondary: { bg: colors.bg.elevated, fg: colors.text.primary },
    ghost: { bg: 'transparent', fg: colors.sky, border: colors.border.pink },
  };
  const p = palette[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && !disabled && styles.primaryGlow,
        {
          backgroundColor: disabled ? colors.text.disabled : p.bg,
          borderWidth: p.border ? 1 : 0,
          borderColor: p.border,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      <Text style={[styles.buttonText, { color: disabled ? colors.bg.base : p.fg }]}>{label}</Text>
    </Pressable>
  );
}

/** Small selectable chip used for rounds / duration / side pickers. */
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.pink : colors.bg.elevated,
          borderColor: selected ? colors.pink : colors.border.pink,
        },
      ]}
    >
      <Text
        style={[styles.chipText, { color: selected ? colors.bg.void : colors.text.secondary }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  button: {
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryGlow: {
    shadowColor: colors.pink,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: fonts.heading,
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  chipText: {
    fontSize: 14,
    fontFamily: fonts.heading,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.pink,
    marginVertical: spacing.md,
  },
});
