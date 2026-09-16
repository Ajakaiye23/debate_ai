import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  BackHandler,
  Pressable,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { notifyWarning, tapLight } from '@/utils/haptics';
import { playSound } from '@/services/sounds';
import { Screen, Button } from '@/components/Primitives';
import { TimerBar } from '@/components/TimerBar';
import { ArgumentCard } from '@/components/ArgumentCard';
import { useDebateState } from '@/hooks/useDebateState';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useTimer } from '@/hooks/useTimer';
import { speak as speakTts } from '@/services/tts';
import { startListening, stopListening, abortListening } from '@/services/stt';
import { saveDebate } from '@/store/debateHistory';
import { getSettings } from '@/store/settings';
import { getPendingConfig, setLastSession, setLastSpokenVerdict } from '@/store/activeDebate';
import { colors, fonts, spacing, radius } from '@/constants/theme';

const READY_SECONDS = 3;
const BREAK_SECONDS = 5;

type FlowPhase =
  | 'prep'
  | 'ready'
  | 'recording'
  | 'processing'
  | 'speaking'
  | 'break'
  | 'retry'
  | 'typing';

export default function DebateScreen() {
  const router = useRouter();
  const config = getPendingConfig();

  useEffect(() => {
    if (!config) router.replace('/');
  }, [config, router]);
  if (!config) return <Screen />;

  return <DebateRunner config={config} />;
}

function DebateRunner({ config }: { config: NonNullable<ReturnType<typeof getPendingConfig>> }) {
  const router = useRouter();
  const debate = useDebateState(config);
  const recorder = useAudioRecorder();

  const [flowPhase, setFlowPhase] = useState<FlowPhase>('ready');
  const [paused, setPaused] = useState(false);
  const [typedText, setTypedText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const flowPhaseRef = useRef<FlowPhase>(flowPhase);
  flowPhaseRef.current = flowPhase;
  const debateRef = useRef(debate);
  debateRef.current = debate;
  const busyRef = useRef(false);
  const startTurnRef = useRef<() => void>(() => {});
  const handlersRef = useRef<{
    prep: () => void;
    ready: () => void;
    record: () => void;
    brk: () => void;
  }>({
    prep: () => {},
    ready: () => {},
    record: () => {},
    brk: () => {},
  });
  const prepDoneRef = useRef(!config.prepSeconds);

  const setPhase = (p: FlowPhase) => {
    flowPhaseRef.current = p;
    setFlowPhase(p);
  };

  // One timer drives the ready countdown, the speaking turn, and the break.
  const timer = useTimer(() => {
    const p = flowPhaseRef.current;
    if (p === 'prep') handlersRef.current.prep();
    else if (p === 'ready') handlersRef.current.ready();
    else if (p === 'recording') handlersRef.current.record();
    else if (p === 'break') handlersRef.current.brk();
  });

  const currentIsAI = !!debate.currentPlayer.isAI;
  const isFinalTurn = debate.segmentIndex >= debate.totalSegments - 1;
  const nextSeg = isFinalTurn ? null : config.segments[debate.segmentIndex + 1];
  const nextPlayer = nextSeg ? config.players[nextSeg.playerIndex] : null;
  const segLabel =
    config.format === 'formal'
      ? debate.segmentLabel
      : `Round ${debate.round} of ${config.rounds}`;

  // ---- flow steps (recreated each render → always read fresh state) ----

  const enterBreak = () => {
    setPhase('break');
    timer.start(BREAK_SECONDS);
  };

  const speak = async (text: string) => {
    // Fast mode: skip the per-turn read-aloud entirely (scores stay on screen).
    if (!getSettings().readTurnSummaries) {
      enterBreak();
      return;
    }
    setPhase('speaking');
    try {
      await speakTts(text);
    } catch {
      // ignore TTS failure — verdict is still on screen
    }
    enterBreak();
  };

  // True while the current turn is using on-device speech recognition
  // (free + instant). False = recording audio for Whisper (fallback).
  const deviceSttRef = useRef(false);

  const beginRecording = async () => {
    setPhase('recording');
    deviceSttRef.current = await startListening();
    if (!deviceSttRef.current) {
      try {
        await recorder.startRecording();
      } catch (e: any) {
        Alert.alert('Microphone', e?.message ?? 'Could not start recording. You can type instead.');
        setPhase('retry');
        return;
      }
    }
    timer.start(config.turnDuration);
  };

  const endRecording = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    timer.stop();
    playSound('submit');
    setPhase('processing');
    let text: string | null = null;
    if (deviceSttRef.current) {
      deviceSttRef.current = false;
      const transcript = await stopListening();
      if (transcript) text = await debateRef.current.submitTypedTurn(transcript);
    } else {
      const uri = await recorder.stopRecording();
      if (uri) text = await debateRef.current.submitHumanTurn(uri);
    }
    busyRef.current = false;
    if (text) await speak(text);
    else setPhase('retry'); // transcription failed/empty → offer retry or typing
  };

  const switchToTyping = () => {
    timer.stop();
    if (deviceSttRef.current) {
      deviceSttRef.current = false;
      abortListening();
    } else {
      recorder.stopRecording().catch(() => {});
    }
    busyRef.current = false;
    setPhase('typing');
  };

  const submitTyped = async () => {
    const t = typedText.trim();
    if (!t) return;
    playSound('submit');
    setPhase('processing');
    const text = await debateRef.current.submitTypedTurn(t);
    setTypedText('');
    if (text) await speak(text);
    else setPhase('retry');
  };

  const runAITurn = async () => {
    setPhase('processing');
    const text = await debateRef.current.submitAITurn();
    if (text) await speak(text);
    else enterBreak();
  };

  const goNext = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    timer.stop();
    setPhase('processing');
    await debateRef.current.finishTurn();
    busyRef.current = false;
    // if not complete, the [turnIndex, round] effect starts the next turn;
    // if complete, the [phase==='complete'] effect navigates to results.
  };

  const startTurn = () => {
    busyRef.current = false;
    // Silent prep window before the very first turn (formal debates).
    if (!prepDoneRef.current && config.prepSeconds) {
      setPhase('prep');
      timer.start(config.prepSeconds);
      return;
    }
    if (debateRef.current.currentPlayer.isAI) {
      runAITurn();
    } else {
      setPhase('ready');
      timer.start(READY_SECONDS);
    }
  };
  const endPrep = () => {
    prepDoneRef.current = true;
    timer.stop();
    startTurnRef.current();
  };
  startTurnRef.current = startTurn;
  handlersRef.current = {
    prep: endPrep,
    ready: beginRecording,
    record: endRecording,
    brk: goNext,
  };

  // Start each turn when the player/round changes (and on first mount).
  useEffect(() => {
    if (debate.phase === 'complete') return;
    startTurnRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debate.segmentIndex]);

  // Navigate to results when the debate completes.
  useEffect(() => {
    if (debate.phase === 'complete') {
      const session = debate.buildSession();
      saveDebate(session).catch(() => {});
      setLastSession(session);
      setLastSpokenVerdict(debate.verdict?.spokenVerdict ?? null);
      router.replace('/results');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debate.phase]);

  // Warning haptic at 10s left while recording.
  useEffect(() => {
    if (flowPhase === 'recording' && timer.timeLeft === 10) notifyWarning();
  }, [flowPhase, timer.timeLeft]);

  // Countdown ticks on the last 3 seconds of the ready phase.
  useEffect(() => {
    if (flowPhase === 'ready' && timer.timeLeft >= 1 && timer.timeLeft <= 3) playSound('countdown');
  }, [flowPhase, timer.timeLeft]);

  // "Go" cue the moment a turn goes live.
  useEffect(() => {
    if (flowPhase === 'recording') {
      tapLight();
      playSound('record_start');
    }
  }, [flowPhase]);

  // Soft error cue when a turn couldn't be captured.
  useEffect(() => {
    if (flowPhase === 'retry') playSound('mic_fail');
  }, [flowPhase]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [debate.args.length, flowPhase]);

  /** Abandon the debate. Confirms first — progress is lost. */
  const confirmQuit = useCallback(() => {
    playSound('back');
    timer.pause();
    Alert.alert('Leave debate?', 'This debate will be discarded. Nothing is saved.', [
      { text: 'Keep debating', style: 'cancel', onPress: () => timer.resume() },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          timer.stop();
          abortListening();
          recorder.stopRecording().catch(() => {});
          router.replace('/');
        },
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Android hardware back should confirm, not silently drop the debate.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      confirmQuit();
      return true; // we handled it
    });
    return () => sub.remove();
  }, [confirmQuit]);

  const togglePause = () => {
    if (paused) {
      setPaused(false);
      timer.resume();
      // Device STT has no pause API — it just keeps listening while paused.
      if (flowPhaseRef.current === 'recording' && !deviceSttRef.current)
        recorder.resumeRecording();
    } else {
      setPaused(true);
      timer.pause();
      if (flowPhaseRef.current === 'recording' && !deviceSttRef.current)
        recorder.pauseRecording();
    }
  };

  const pausable =
    flowPhase === 'prep' ||
    flowPhase === 'ready' ||
    flowPhase === 'recording' ||
    flowPhase === 'break';

  return (
    <Screen>
      <View style={styles.topBar}>
        <View style={styles.topRow}>
          <Pressable
            onPress={confirmQuit}
            android_disableSound
            hitSlop={10}
            style={styles.pauseBtn}
            accessibilityRole="button"
            accessibilityLabel="Leave debate"
          >
            <Ionicons name="close" size={20} color={colors.text.secondary} />
          </Pressable>
          <Text style={styles.topic} numberOfLines={2}>
            {config.topic}
          </Text>
          {pausable && (
            <Pressable
              onPress={togglePause}
              hitSlop={10}
              style={styles.pauseBtn}
              accessibilityRole="button"
              accessibilityLabel={paused ? 'Resume debate' : 'Pause debate'}
            >
              <Ionicons name={paused ? 'play' : 'pause'} size={20} color={colors.sky} />
            </Pressable>
          )}
        </View>
        <Text style={styles.roundLine}>
          {segLabel} — {debate.currentPlayer.name} ·{' '}
          {debate.currentPlayer.side === 'for' ? 'For' : 'Against'}
        </Text>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.feed}>
        {debate.args.map((a, i) => (
          <ArgumentCard key={i} arg={a} />
        ))}
        {debate.error && <Text style={styles.error}>{debate.error}</Text>}
      </ScrollView>

      <View style={styles.stage}>
        <Stage
          flowPhase={flowPhase}
          paused={paused}
          timeLeft={timer.timeLeft}
          turnDuration={config.turnDuration}
          currentName={debate.currentPlayer.name}
          currentIsAI={currentIsAI}
          nextName={nextPlayer?.name ?? null}
          hookPhase={debate.phase}
          errorText={debate.error}
          typedText={typedText}
          onChangeTyped={setTypedText}
          onDone={endRecording}
          onSkipBreak={goNext}
          onEndPrep={endPrep}
          onTogglePause={togglePause}
          onType={switchToTyping}
          onRetry={() => startTurnRef.current()}
          onSubmitTyped={submitTyped}
        />
      </View>
    </Screen>
  );
}

function TypeLink({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Text style={styles.typeLink}>Type instead</Text>
    </Pressable>
  );
}

function Stage({
  flowPhase,
  paused,
  timeLeft,
  turnDuration,
  currentName,
  currentIsAI,
  nextName,
  hookPhase,
  errorText,
  typedText,
  onChangeTyped,
  onDone,
  onSkipBreak,
  onEndPrep,
  onTogglePause,
  onType,
  onRetry,
  onSubmitTyped,
}: {
  flowPhase: FlowPhase;
  paused: boolean;
  timeLeft: number;
  turnDuration: number;
  currentName: string;
  currentIsAI: boolean;
  nextName: string | null;
  hookPhase: string;
  errorText: string | null;
  typedText: string;
  onChangeTyped: (t: string) => void;
  onDone: () => void;
  onSkipBreak: () => void;
  onEndPrep: () => void;
  onTogglePause: () => void;
  onType: () => void;
  onRetry: () => void;
  onSubmitTyped: () => void;
}) {
  if (paused) {
    return (
      <View style={styles.center}>
        <Ionicons name="pause-circle" size={56} color={colors.sky} />
        <Text style={styles.bigLabel}>Paused</Text>
        <Button label="Resume" onPress={onTogglePause} style={{ alignSelf: 'stretch' }} />
      </View>
    );
  }

  if (flowPhase === 'prep') {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    return (
      <View style={styles.center}>
        <Text style={styles.kicker}>Prep time</Text>
        <Text style={styles.count}>{m > 0 ? `${m}:${String(s).padStart(2, '0')}` : timeLeft}</Text>
        <Text style={styles.sub}>Plan your case — the debate starts when time runs out</Text>
        <Button label="We're ready" onPress={onEndPrep} style={{ alignSelf: 'stretch' }} />
      </View>
    );
  }

  if (flowPhase === 'ready') {
    return (
      <View style={styles.center}>
        <Text style={styles.kicker}>Get ready, {currentName}</Text>
        <Text style={styles.count}>{timeLeft}</Text>
        <Text style={styles.sub}>Recording starts automatically</Text>
        <TypeLink onPress={onType} />
      </View>
    );
  }

  if (flowPhase === 'recording') {
    return (
      <View style={styles.center}>
        <View style={styles.recRow}>
          <View style={styles.recDot} />
          <Text style={styles.bigLabel}>Recording · {timeLeft}s</Text>
        </View>
        <View style={{ alignSelf: 'stretch', marginVertical: spacing.sm }}>
          <TimerBar timeLeft={timeLeft} duration={turnDuration} />
        </View>
        <Button label="I'm done" onPress={onDone} style={{ alignSelf: 'stretch' }} />
        <TypeLink onPress={onType} />
      </View>
    );
  }

  if (flowPhase === 'processing') {
    const label =
      hookPhase === 'transcribing'
        ? 'Transcribing…'
        : hookPhase === 'ai-thinking'
          ? `${currentName} is thinking…`
          : 'Judging the argument…';
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.pink} size="large" />
        <Text style={styles.sub}>{label}</Text>
      </View>
    );
  }

  if (flowPhase === 'speaking') {
    return (
      <View style={styles.center}>
        <Ionicons name="volume-high" size={40} color={colors.sky} />
        <Text style={styles.sub}>Reading the verdict aloud…</Text>
      </View>
    );
  }

  if (flowPhase === 'retry') {
    return (
      <View style={styles.center}>
        <Text style={styles.sub}>{errorText ?? "That didn't go through."}</Text>
        <View style={styles.retryRow}>
          <Button label="Try recording again" variant="secondary" onPress={onRetry} style={{ flex: 1 }} />
        </View>
        <Button label="Type it instead" onPress={onType} style={{ alignSelf: 'stretch' }} />
      </View>
    );
  }

  if (flowPhase === 'typing') {
    return (
      <View style={{ gap: spacing.sm }}>
        <Text style={styles.kicker}>{currentName}&apos;s argument</Text>
        <TextInput
          value={typedText}
          onChangeText={onChangeTyped}
          placeholder="Type your argument…"
          placeholderTextColor={colors.text.disabled}
          style={styles.typeInput}
          multiline
          autoFocus
        />
        <Button label="Submit argument" onPress={onSubmitTyped} disabled={!typedText.trim()} />
      </View>
    );
  }

  // break
  return (
    <View style={styles.center}>
      <Text style={styles.kicker}>{nextName ? `Up next: ${nextName}` : 'Final verdict'}</Text>
      <Text style={styles.count}>{timeLeft}</Text>
      <Button
        label={nextName ? 'Start now' : 'See verdict'}
        onPress={onSkipBreak}
        style={{ alignSelf: 'stretch' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.pink,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  topic: {
    flex: 1,
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.text.primary,
  },
  pauseBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundLine: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.sky,
  },
  feed: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    flexGrow: 1,
  },
  error: {
    color: colors.coral,
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  stage: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.pink,
    minHeight: 180,
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  kicker: {
    fontFamily: fonts.heading,
    fontSize: 15,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  count: {
    fontFamily: fonts.display,
    fontSize: 64,
    color: colors.sky,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  bigLabel: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.text.primary,
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.coral,
  },
  typeLink: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.sky,
    textDecorationLine: 'underline',
    marginTop: spacing.xs,
  },
  retryRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
  },
  typeInput: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.pink,
    borderRadius: radius.lg,
    padding: spacing.md,
    color: colors.text.primary,
    fontFamily: fonts.body,
    fontSize: 16,
    minHeight: 90,
    textAlignVertical: 'top',
  },
});
