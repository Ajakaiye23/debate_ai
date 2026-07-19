import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Primitives';
import { loadDebates } from '@/store/debateHistory';
import { setLastSession, setLastSpokenVerdict } from '@/store/activeDebate';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { tapLight } from '@/utils/haptics';
import type { DebateSession } from '@/types/debate';

const MODE_LABEL: Record<DebateSession['mode'], string> = {
  'pass-and-play': 'Pass & Play',
  'solo-vs-ai': 'Solo vs AI',
  multiplayer: 'Multiplayer',
};

export default function HistoryScreen() {
  const router = useRouter();
  const [debates, setDebates] = useState<DebateSession[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadDebates().then(setDebates);
    }, [])
  );

  const open = (session: DebateSession) => {
    tapLight();
    setLastSession(session);
    setLastSpokenVerdict(null); // don't auto-narrate old debates
    router.push('/results');
  };

  return (
    <Screen>
      <FlatList
        data={debates}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No debates yet. Start one from the home screen.</Text>
        }
        renderItem={({ item }) => {
          const winner = item.winner === 'tie' ? 'Tie' : (item.winnerLabel ?? item.winner.name);
          return (
            <Pressable
              onPress={() => open(item)}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.topic} numberOfLines={2}>
                {item.topic}
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.winner}>{winner}</Text>
                <Text style={styles.meta}>
                  {item.format === 'formal' ? 'Formal' : MODE_LABEL[item.mode]} ·{' '}
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.lg,
    gap: spacing.md,
    flexGrow: 1,
  },
  empty: {
    color: colors.text.secondary,
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  card: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.pink,
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.sm,
  },
  topic: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.text.primary,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  winner: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.gold,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text.secondary,
  },
});
