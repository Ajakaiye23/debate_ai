import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Button, Chip } from '@/components/Primitives';
import { getSettings, updateSettings, type AppSettings } from '@/store/settings';
import { clearDebates } from '@/store/debateHistory';
import {
  purchaseAdFree,
  purchasePremium,
  restorePurchases,
  AD_FREE_PRICE,
  PREMIUM_PRICE,
} from '@/services/purchases';
import { debatesUsedToday, isUnlimited, FREE_DAILY_LIMIT } from '@/store/usage';
import { JUDGE_VOICES, DEFAULT_VOICE_ID } from '@/constants/voices';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { tapSelect } from '@/utils/haptics';

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

  const onBuyPremium = async () => {
    const res = await purchasePremium();
    if (res.ok) setS(getSettings());
    Alert.alert('Premium', res.message);
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
  const unlimited = isUnlimited();
  const usedToday = debatesUsedToday();

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label="Your plan">
          {s.premium ? (
            <Text style={styles.hint}>✨ Premium — unlimited debates & premium voices. Thank you!</Text>
          ) : unlimited ? (
            <Text style={styles.hint}>
              Unlimited debates — running on your own Anthropic key.
            </Text>
          ) : (
            <>
              <Text style={styles.hint}>
                Free plan: {usedToday}/{FREE_DAILY_LIMIT} debates today (resets daily). Go Premium
                for unlimited debates, natural ElevenLabs voices, and no ads.
              </Text>
              <Button
                label={`Go Premium — ${PREMIUM_PRICE}`}
                onPress={onBuyPremium}
              />
            </>
          )}
        </Field>

        <Field label="Your Anthropic key (optional)">
          <Text style={styles.hint}>
            Paste your own key for unlimited debates on your own account (free of the daily cap).
            Get one at console.anthropic.com. Leave blank to use the free plan.
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

        <Field label="Voice engine">
          <Text style={styles.hint}>
            {s.premium
              ? 'Premium voices are more natural; the device voice is free, instant, and works offline.'
              : 'The device voice is free and instant. Natural ElevenLabs voices are a Premium feature.'}
          </Text>
          <View style={styles.row}>
            <Chip
              label={s.premium ? 'Premium (ElevenLabs)' : '🔒 ElevenLabs (Premium)'}
              selected={s.premium && s.ttsEngine !== 'device'}
              onPress={() =>
                s.premium
                  ? set({ ttsEngine: 'elevenlabs' })
                  : Alert.alert(
                      'Premium voices',
                      'Natural ElevenLabs voices unlock with Premium. The free device voice is used until then.'
                    )
              }
            />
            <Chip
              label="Device (free, faster)"
              selected={!s.premium || s.ttsEngine === 'device'}
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
                  onPress={() => {
                    tapSelect();
                    set({ elevenVoiceId: v.id });
                  }}
                  style={({ pressed }) => [
                    styles.voiceRow,
                    { borderColor: active ? colors.pink : colors.border.pink },
                    pressed && { opacity: 0.85 },
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
            Off = faster debates: scores show on screen after each turn but aren't read aloud.
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
});
