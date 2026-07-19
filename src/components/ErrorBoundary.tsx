import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen, Button } from './Primitives';
import { colors, fonts, radius, spacing } from '@/constants/theme';

interface Props {
  children: React.ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Catches render/lifecycle crashes anywhere below it and shows a recoverable
 * screen instead of a blank white app. "Try again" clears the error and
 * re-renders the tree, which is enough to recover from transient failures
 * (a bad API response, a malformed saved debate, etc.).
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Keep a breadcrumb in the dev console; no crash reporter wired yet.
    console.warn('[DebateAI] caught render error:', error?.message ?? error);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <Screen>
        <View style={styles.wrap}>
          <Text style={styles.emoji}>😵‍💫</Text>
          <Text style={styles.title}>Something went sideways</Text>
          <Text style={styles.body}>
            The app hit an unexpected error. Your saved debates are safe — you can pick up right
            where you left off.
          </Text>
          <View style={styles.detailBox}>
            <Text style={styles.detail} numberOfLines={4}>
              {this.state.error.message || 'Unknown error'}
            </Text>
          </View>
          <Button label="Try again" onPress={this.reset} style={{ alignSelf: 'stretch' }} />
        </View>
      </Screen>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  emoji: {
    fontSize: 44,
    textAlign: 'center',
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.text.primary,
    textAlign: 'center',
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  detailBox: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.pink,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  detail: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.coral,
  },
});
