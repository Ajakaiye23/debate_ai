import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Screen } from '@/components/Primitives';
import { getLeaderboard, firebaseConfigured, type PlayerStats } from '@/services/firebase';
import { getDeviceId } from '@/store/identity';
import { colors, fonts, radius, spacing } from '@/constants/theme';

export default function LeaderboardScreen() {
  const [rows, setRows] = useState<(PlayerStats & { id: string })[] | null>(null);
  const myId = getDeviceId();

  useEffect(() => {
    if (!firebaseConfigured()) {
      setRows([]);
      return;
    }
    getLeaderboard(50)
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  if (!firebaseConfigured()) {
    return (
      <Screen>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            The leaderboard turns on once online multiplayer (Firebase) is configured.
          </Text>
        </View>
      </Screen>
    );
  }

  if (!rows) {
    return (
      <Screen>
        <View style={styles.empty}>
          <ActivityIndicator color={colors.sky} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No ranked players yet — play an online match to appear here.</Text>
        }
        renderItem={({ item, index }) => {
          const mine = item.id === myId;
          return (
            <View style={[styles.row, mine && styles.rowMine]}>
              <Text style={styles.rank}>{index + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name || 'Anonymous'}</Text>
                <Text style={styles.record}>
                  {item.wins}W · {item.losses}L
                </Text>
              </View>
              <Text style={styles.elo}>{item.elo}</Text>
            </View>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.pink,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  rowMine: { borderColor: colors.sky },
  rank: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.text.secondary,
    width: 32,
    textAlign: 'center',
  },
  name: { fontFamily: fonts.heading, fontSize: 16, color: colors.text.primary },
  record: { fontFamily: fonts.body, fontSize: 12, color: colors.text.secondary },
  elo: { fontFamily: fonts.mono, fontSize: 20, color: colors.sky },
});
