import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Primitives';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { tapLight } from '@/utils/haptics';
import { playSound } from '@/services/sounds';
import type { DebateMode, DebateFormat } from '@/types/debate';

/** #RRGGBB + alpha (0–1) → rgba() string, for tinting per-mode accents. */
function hexAlpha(hex: string, a: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

const MODES: {
  mode: DebateMode;
  format?: DebateFormat;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  comingSoon?: boolean;
}[] = [
  {
    mode: 'pass-and-play',
    title: 'Pass & Play',
    subtitle: 'Same phone, quick rounds',
    icon: 'people',
    accent: colors.pink,
  },
  {
    mode: 'solo-vs-ai',
    title: 'Solo vs AI',
    subtitle: 'Debate against Rival',
    icon: 'hardware-chip',
    accent: colors.sky,
  },
  {
    mode: 'pass-and-play',
    format: 'formal',
    title: 'Formal Debate',
    subtitle: 'Opening · cross-exam · closing',
    icon: 'podium',
    accent: colors.gold,
  },
  {
    mode: 'multiplayer',
    title: 'Online Multiplayer',
    subtitle: 'Share a party code',
    icon: 'globe',
    accent: colors.win,
  },
];

export default function HomeScreen() {
  const router = useRouter();

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              tapLight();
              playSound('tap');
              router.push('/settings');
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={24} color={colors.text.secondary} />
          </Pressable>
        </View>

        <Animated.View entering={FadeIn.duration(400)} style={styles.hero}>
          <Text style={styles.title}>Debate Me</Text>
          <View style={styles.titleRule} />
          <Text style={styles.tagline}>
            Speak your case. Claude judges. The verdict is read aloud.
          </Text>
        </Animated.View>

        <Text style={styles.kicker}>Choose your arena</Text>
        <View style={{ gap: spacing.md }}>
          {MODES.map((m, i) => (
            <Animated.View key={m.title} entering={FadeInDown.delay(80 * i + 120).springify()}>
              <Pressable
                onPress={() => {
                  tapLight();
              playSound('tap');
                  m.mode === 'multiplayer'
                    ? router.push('/multiplayer')
                    : router.push({
                        pathname: '/setup',
                        params: { mode: m.mode, ...(m.format ? { format: m.format } : {}) },
                      });
                }}
                style={({ pressed }) => [
                  styles.card,
                  { borderColor: hexAlpha(m.accent, 0.28) },
                  pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                ]}
              >
                <View style={[styles.accentBar, { backgroundColor: m.accent }]} />
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: hexAlpha(m.accent, 0.12), borderColor: hexAlpha(m.accent, 0.35) },
                  ]}
                >
                  <Ionicons name={m.icon} size={22} color={m.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{m.title}</Text>
                  <Text style={styles.cardSubtitle}>{m.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.text.disabled} />
              </Pressable>
            </Animated.View>
          ))}
        </View>

        <View style={styles.footerRow}>
          <Pressable
            onPress={() => {
              tapLight();
              playSound('tap');
              router.push('/history');
            }}
            style={({ pressed }) => [styles.historyBtn, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel="Debate history"
          >
            <Ionicons name="time-outline" size={18} color={colors.sky} />
            <Text style={styles.historyText}>History</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              tapLight();
              playSound('tap');
              router.push('/leaderboard');
            }}
            style={({ pressed }) => [styles.historyBtn, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel="Leaderboard"
          >
            <Ionicons name="trophy-outline" size={18} color={colors.sky} />
            <Text style={styles.historyText}>Leaderboard</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 46,
    color: colors.sky,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(133, 194, 255, 0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  titleRule: {
    width: 56,
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.pink,
    marginTop: spacing.xs,
    shadowColor: colors.pink,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  kicker: {
    fontFamily: fonts.heading,
    fontSize: 12,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: -spacing.sm,
  },
  tagline: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    lineHeight: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.pink,
    borderRadius: radius.xl,
    padding: spacing.md + 4,
    paddingLeft: spacing.md + 10,
    overflow: 'hidden',
    shadowColor: colors.glow.violet,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 94, 224, 0.10)',
    borderWidth: 1,
    borderColor: colors.border.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: fonts.heading,
    fontSize: 17,
    color: colors.text.primary,
  },
  cardSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    marginTop: 'auto',
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  historyText: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.sky,
  },
});
