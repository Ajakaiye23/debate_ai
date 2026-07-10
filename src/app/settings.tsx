import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Button } from '@/components/Primitives';
import { getSettings, updateSettings, type AppSettings } from '@/store/settings';
import { clearDebates } from '@/store/debateHistory';
import { purchaseAdFree, restorePurchases, AD_FREE_PRICE } from '@/services/purchases';
import { JUDGE_VOICES, DEFAULT_VOICE_ID } from '@/constants/voices';
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

  const onBuyAdFree = async () => {
    const res = await purchaseAdFree();
    if (res.ok) setS(getSettings());
    Alert.alert('Remove ads', res.message);
  };

  const onRestore = async () => {
    const res = await restorePurchases();
    if (res.ok) setS(getSettings());
    Alert.alert('Restore purchase', res.message);
  };

  const onClearHistory = () => {
    Alert.alert('Clear history', 'Delete all saved debates?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => clearDebates() },
    ]);
  };

  const selectedVoice = s.elevenVoiceId || DEFAULT_VOICE_ID;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label="Voice engine">
          <Text style={styles.hint}>
            Premium voices are more natural; the device voice is free, instant, and works offline.
          </Text>
          <View style={styles.row}>
            <Pill
              label="Premium (ElevenLabs)"
              selected={s.ttsEngine !== 'device'}
              onPress={() => set({ ttsEngine: 'elevenlabs' })}
            />
            <Pill
              label="Device (free, faster)"
              selected={s.ttsEngine === 'device'}
              onPress={() => set({ ttsEngine: 'device' })}
            />
          </View>
        </Field>

        <Field label="Judge voice">
          <Text style={styles.hint}>Pick who reads the verdicts aloud.</Text>
          <View style={{ gap: spacing.sm }}>
            {JUDGE_VOICES.map((v) => {
              const active = selectedVoice === v.id;
              return (
                <Pressable
                  key={v.id}
                  onPress={() => set({ elevenVoiceId: v.id })}
                  style={[
                    styles.voiceRow,
                    { borderColor: active ? colors.pink : colors.border.pink },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.voiceName}>{v.name}</Text>
                    <Text style={styles.voicePersona}>{v.persona}</Text>
                  </View>
                  <Ionicons
                    name={active ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={active ? colors.pink : colors.text.disabled}
                  />
                </Pressable>
              );
            })}
          </View>
        </Field>

        <Field label={`Judge volume — ${Math.round(s.judgeVolume * 100)}%`}>
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

        <Field label="Default rounds">
          <View style={styles.row}>
            {ROUND_OPTIONS.map((r) => (
              <Pill
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
            Off = faster debates: scores show on screen after each turn but aren't read aloud.
            The final verdict is always read.
          </Text>
          <View style={styles.row}>
            <Pill
              label="On"
              selected={s.readTurnSummaries}
              onPress={() => set({ readTurnSummaries: true })}
            />
            <Pill
              label="Off (faster)"
              selected={!s.readTurnSummaries}
              onPress={() => set({ readTurnSummaries: false })}
            />
          </View>
        </Field>

        <Field label="Default turn duration">
          <View style={styles.row}>
            {DURATION_OPTIONS.map((d) => (
              <Pill
                key={d}
                label={`${d}s`}
                selected={s.defaultTurnDuration === d}
                onPress={() => set({ defaultTurnDuration: d })}
              />
            ))}
          </View>
        </Field>

        <Field label="Ads">
          {s.adFree ? (
            <Text style={styles.hint}>Ads removed — thanks for supporting DebateAI! 💜</Text>
          ) : (
            <>
              <Text style={styles.hint}>
                A short ad plays after each debate. Remove them forever with a one-time purchase.
              </Text>
              <Button
                label={`Remove ads — ${AD_FREE_PRICE}`}
                variant="secondary"
                onPress={onBuyAdFree}
              />
              <Button label="Restore purchase" variant="ghost" onPress={onRestore} />
            </>
          )}
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

function Pill({
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
        styles.pill,
        {
          backgroundColor: selected ? colors.pink : colors.bg.elevated,
          borderColor: selected ? colors.pink : colors.border.pink,
        },
      ]}
    >
      <Text style={[styles.pillText, { color: selected ? colors.bg.void : colors.text.secondary }]}>
        {label}
      </Text>
    </Pressable>
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
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  voiceName: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.text.primary,
  },
  voicePersona: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  pillText: {
    fontSize: 14,
    fontFamily: fonts.heading,
  },
});
