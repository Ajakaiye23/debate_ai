import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import { Screen, Button, Chip } from '@/components/Primitives';
import { getSettings, updateSettings, type AppSettings } from '@/store/settings';
import { clearDebates } from '@/store/debateHistory';
import { debatesUsedToday, isUnlimited, DAILY_LIMIT } from '@/store/usage';
import { colors, fonts, radius, spacing } from '@/constants/theme';

const ROUND_OPTIONS = [1, 2, 3, 4, 5];
const DURATION_OPTIONS = [15, 30, 60, 90];

export default function SettingsScreen() {
  const [s, setS] = useState<AppSettings>(getSettings());
  const [saved, setSaved] = useState(false);

  const set = (patch: Partial<AppSettings>) => {
    setS((prev) => ({ ...prev, ...patch }));
    updateSettings(patch).catch(() => {});
  };

  const save = async () => {
    await updateSettings(s);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const onClearHistory = () => {
    Alert.alert('Clear history', 'Delete all saved debates?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => clearDebates() },
    ]);
  };

  const unlimited = isUnlimited();
  const usedToday = debatesUsedToday();

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label="Debates today">
          <Text style={styles.hint}>
            {unlimited
              ? 'Unlimited — running on your own Anthropic key.'
              : `${usedToday}/${DAILY_LIMIT} used today (resets daily). Add your own Anthropic key below for no limit.`}
          </Text>
        </Field>

        <Field label="Your Anthropic key (optional)">
          <Text style={styles.hint}>
            Paste your own key to run debates on your own account with no daily limit.
            Get one at console.anthropic.com. Leave blank to use the shared free allowance.
          </Text>
          <TextInput
            value={s.anthropicKey}
            onChangeText={(t) => set({ anthropicKey: t })}
            placeholder="sk-ant-…"
            placeholderTextColor={colors.text.disabled}
            style={styles.keyInput}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
        </Field>

        <Field label={`Voice volume — ${Math.round(s.judgeVolume * 100)}%`}>
          <Slider
            minimumValue={0}
            maximumValue={1}
            value={s.judgeVolume}
            onValueChange={(v) => set({ judgeVolume: v })}
            minimumTrackTintColor={colors.pink}
            maximumTrackTintColor={colors.bg.elevated}
            thumbTintColor={colors.pink}
          />
        </Field>

        <Field label="Sound effects">
          <View style={styles.row}>
            <Chip label="On" selected={s.soundEffects} onPress={() => set({ soundEffects: true })} />
            <Chip
              label="Off"
              selected={!s.soundEffects}
              onPress={() => set({ soundEffects: false })}
            />
          </View>
        </Field>

        <Field label="Default rounds">
          <View style={styles.row}>
            {ROUND_OPTIONS.map((r) => (
              <Chip
                key={r}
                label={String(r)}
                selected={s.defaultRounds === r}
                onPress={() => set({ defaultRounds: r })}
              />
            ))}
          </View>
        </Field>

        <Field label="Read turn scores aloud">
          <Text style={styles.hint}>
            Off = faster debates: scores show on screen after each turn but aren&apos;t read aloud.
            The final verdict is always read.
          </Text>
          <View style={styles.row}>
            <Chip
              label="On"
              selected={s.readTurnSummaries}
              onPress={() => set({ readTurnSummaries: true })}
            />
            <Chip
              label="Off (faster)"
              selected={!s.readTurnSummaries}
              onPress={() => set({ readTurnSummaries: false })}
            />
          </View>
        </Field>

        <Field label="Default turn duration">
          <View style={styles.row}>
            {DURATION_OPTIONS.map((d) => (
              <Chip
                key={d}
                label={`${d}s`}
                selected={s.defaultTurnDuration === d}
                onPress={() => set({ defaultTurnDuration: d })}
              />
            ))}
          </View>
        </Field>

        <Button label={saved ? 'Saved ✓' : 'Save settings'} onPress={save} />
        <Button label="Clear history" variant="ghost" onPress={onClearHistory} />
      </ScrollView>
    </Screen>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  label: {
    fontFamily: fonts.heading,
    fontSize: 13,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text.secondary,
  },
  keyInput: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.pink,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    color: colors.text.primary,
    fontFamily: fonts.mono,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
