import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, Pressable, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Button } from '@/components/Primitives';
import { MicButton } from '@/components/MicButton';
import { TimerBar } from '@/components/TimerBar';
import { ArgumentCard } from '@/components/ArgumentCard';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useTimer } from '@/hooks/useTimer';
import { transcribeAudio } from '@/services/whisper';
import { factCheckArgument, getFinalVerdict } from '@/services/claude';
import { speak as speakText } from '@/services/tts';
import { saveDebate } from '@/store/debateHistory';
import { setLastSession, setLastSpokenVerdict } from '@/store/activeDebate';
import { getDeviceId } from '@/store/identity';
import {
  subscribeRoom,
  submitTurn,
  finishRoom,
  recordResult,
  type Room,
  type MpPlayer,
} from '@/services/firebase';
import type { Argument, DebateSession, Player } from '@/types/debate';
import { colors, fonts, radius, spacing } from '@/constants/theme';

const READY_SECONDS = 3;
type Phase = 'idle' | 'ready' | 'recording' | 'processing' | 'speaking' | 'typing' | 'tallying';

export default function MpDebateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const code = typeof params.code === 'string' ? params.code : '';
  const [room, setRoom] = useState<Room | null>(null);

  useEffect(() => {
    if (!code) {
      router.replace('/');
      return;
    }
    return subscribeRoom(code, setRoom);
  }, [code, router]);

  if (!room || !room.players.player2) return <Screen />;
  return <MpRunner code={code} room={room} />;
}

function MpRunner({ code, room }: { code: string; room: Room }) {
  const router = useRouter();
  const recorder = useAudioRecorder();
  const [phase, setPhase] = useState<Phase>('idle');
  const [typedText, setTypedText] = useState('');

  const myDeviceId = getDeviceId();
  const myIndex = room.players.player1.deviceId === myDeviceId ? 0 : 1;
  const me: MpPlayer = myIndex === 0 ? room.players.player1 : room.players.player2!;
  const opp: MpPlayer = myIndex === 0 ? room.players.player2! : room.players.player1;

  const totalSegments = room.segments.length;
  const done = room.currentIndex >= totalSegments;
  const seg = done ? null : room.segments[room.currentIndex];
  const activePlayer = seg
    ? seg.playerIndex === 0
      ? room.players.player1
      : room.players.player2!
    : null;
  const isMyTurn = !!activePlayer && activePlayer.deviceId === myDeviceId;

  const roomRef = useRef(room);
  roomRef.current = room;
  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;
  const busyRef = useRef(false);
  const startedIndexRef = useRef(-1);
  const verdictStartedRef = useRef(false);
  const completedRef = useRef(false);
  const handlersRef = useRef<{ ready: () => void; record: () => void }>({ ready: () => {}, record: () => {} });

  const timer = useTimer(() => {
    const p = phaseRef.current;
    if (p === 'ready') handlersRef.current.ready();
    else if (p === 'recording') handlersRef.current.record();
  });

  const setP = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  // ---- scoring (active device) ----
  const scoreAndSubmit = async (transcript: string | null) => {
    const r = roomRef.current;
    const s = r.segments[r.currentIndex];
    const speaker: MpPlayer = s.playerIndex === 0 ? r.players.player1 : r.players.player2!;
    const history = r.args
      .map((a) => `[${a.label}] ${a.playerName}: ${a.transcript}`)
      .join('\n');
    let arg: Argument;
    try {
      if (!transcript) throw new Error('empty');
      const res = await factCheckArgument(r.topic, speaker.side, transcript, history, s.label);
      arg = {
        playerId: `player${s.playerIndex + 1}`,
        playerName: speaker.name,
        transcript,
        round: s.round,
        label: s.label,
        scores: { accuracy: res.accuracy, strength: res.strength, clarity: res.clarity },
        factCheckNotes: res.factCheckNotes,
        spokenSummary: res.spokenSummary,
        winner: res.roundWinner,
      };
      setP('speaking');
      try {
        await speakText(res.spokenSummary);
      } catch {
        // ignore TTS failure
      }
    } catch {
      // Failure/timeout → record a forfeit so the match can't stall.
      arg = {
        playerId: `player${s.playerIndex + 1}`,
        playerName: speaker.name,
        transcript: transcript || '(no argument given)',
        round: s.round,
        label: s.label,
        scores: { accuracy: 0, strength: 0, clarity: 0 },
        factCheckNotes: transcript ? 'Could not score this argument.' : 'No argument given in time.',
        spokenSummary: '',
        winner: false,
      };
    }
    await submitTurn(code, [...r.args, arg], r.currentIndex + 1);
    busyRef.current = false;
    setP('idle');
  };

  const submitRecording = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    timer.stop();
    setP('processing');
    const uri = await recorder.stopRecording();
    let transcript: string | null = null;
    if (uri) {
      try {
        transcript = await transcribeAudio(uri);
      } catch {
        transcript = null;
      }
    }
    await scoreAndSubmit(transcript);
  };

  const beginRecording = async () => {
    setP('recording');
    try {
      await recorder.startRecording();
    } catch (e: any) {
      Alert.alert('Microphone', e?.message ?? 'Could not record. Type instead.');
      setP('typing');
      return;
    }
    timer.start(roomRef.current.turnDuration);
  };

  const submitTyped = async () => {
    const t = typedText.trim();
    if (!t || busyRef.current) return;
    busyRef.current = true;
    timer.stop();
    setTypedText('');
    setP('processing');
    await scoreAndSubmit(t);
  };

  const switchToTyping = () => {
    timer.stop();
    recorder.stopRecording().catch(() => {});
    setP('typing');
  };

  handlersRef.current = { ready: beginRecording, record: submitRecording };

  const computeVerdict = async (r: Room) => {
    try {
      const v = await getFinalVerdict(r.topic, r.args);
      const names = [r.players.player1.name, r.players.player2?.name];
      let winnerName = v.winner;
      if (winnerName !== 'tie' && !names.includes(winnerName)) {
        // Claude returned an unexpected name — fall back to total scores.
        const total = (id: string) =>
          r.args
            .filter((a) => a.playerId === id)
            .reduce((s, a) => s + a.scores.accuracy + a.scores.strength + a.scores.clarity, 0);
        const t1 = total('player1');
        const t2 = total('player2');
        winnerName =
          t1 === t2 ? 'tie' : t1 > t2 ? r.players.player1.name : r.players.player2!.name;
      }
      await finishRoom(code, v, winnerName);
    } catch {
      await finishRoom(code, { winner: 'tie', reason: 'Could not compute a verdict.', spokenVerdict: '' }, 'tie');
    }
  };

  const onComplete = (r: Room) => {
    if (completedRef.current) return;
    completedRef.current = true;
    const p1: Player = { id: 'player1', name: r.players.player1.name, side: r.players.player1.side };
    const p2: Player = { id: 'player2', name: r.players.player2!.name, side: r.players.player2!.side };
    const winnerPlayer: Player | 'tie' =
      r.winnerName === 'tie' ? 'tie' : ([p1, p2].find((p) => p.name === r.winnerName) ?? 'tie');
    const session: DebateSession = {
      id: `mp-${code}-${Date.now()}`,
      topic: r.topic,
      mode: 'multiplayer',
      format: 'quick',
      players: [p1, p2],
      rounds: r.rounds,
      turnDuration: r.turnDuration,
      arguments: r.args,
      verdict: r.verdict?.reason ?? '',
      winner: winnerPlayer,
      // Both devices save this same match, but from opposite seats — record
      // which one is ours so the progress dashboard scores the right person.
      ownerPlayerId: `player${myIndex + 1}`,
      createdAt: Date.now(),
    };
    saveDebate(session).catch(() => {});
    setLastSession(session);
    setLastSpokenVerdict(r.verdict?.spokenVerdict ?? null);
    if (r.winnerName && r.winnerName !== 'tie') {
      recordResult(me.deviceId, me.name, r.winnerName === me.name, opp.eloAtStart).catch(() => {});
    }
    router.replace('/results');
  };

  // ---- drive the flow from room changes ----
  useEffect(() => {
    const r = roomRef.current;
    if (r.status === 'complete') {
      onComplete(r);
      return;
    }
    if (r.currentIndex >= r.segments.length) {
      setP('tallying');
      if (r.host === myDeviceId && !verdictStartedRef.current) {
        verdictStartedRef.current = true;
        computeVerdict(r);
      }
      return;
    }
    const s = r.segments[r.currentIndex];
    const active = (s.playerIndex === 0 ? r.players.player1 : r.players.player2!).deviceId === myDeviceId;
    if (active && startedIndexRef.current !== r.currentIndex) {
      startedIndexRef.current = r.currentIndex;
      setP('ready');
      timer.start(READY_SECONDS);
    } else if (!active) {
      setP('idle');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.status, room.currentIndex]);

  // ---- render ----
  const roundLine = seg
    ? `${seg.label} — ${activePlayer?.name} · ${activePlayer?.side === 'for' ? 'For' : 'Against'}`
    : 'Final verdict';

  return (
    <Screen>
      <View style={styles.topBar}>
        <Text style={styles.topic} numberOfLines={2}>
          {room.topic}
        </Text>
        <Text style={styles.roundLine}>{roundLine}</Text>
        <Text style={styles.you}>You are {me.name} · vs {opp.name}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.feed}>
        {room.args.map((a, i) => (
          <ArgumentCard key={i} arg={a} />
        ))}
      </ScrollView>

      <View style={styles.dock}>
        {phase === 'tallying' && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.pink} size="large" />
            <Text style={styles.sub}>Tallying the final verdict…</Text>
          </View>
        )}

        {phase === 'idle' && !done && !isMyTurn && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.sky} />
            <Text style={styles.sub}>Waiting for {activePlayer?.name} to argue…</Text>
          </View>
        )}

        {phase === 'ready' && (
          <View style={styles.center}>
            <Text style={styles.kicker}>Get ready, {me.name}</Text>
            <Text style={styles.count}>{timer.timeLeft}</Text>
            <Pressable onPress={switchToTyping} hitSlop={8}>
              <Text style={styles.typeLink}>Type instead</Text>
            </Pressable>
          </View>
        )}

        {phase === 'recording' && (
          <View style={styles.center}>
            <View style={styles.recRow}>
              <View style={styles.recDot} />
              <Text style={styles.bigLabel}>Recording · {timer.timeLeft}s</Text>
            </View>
            <View style={{ alignSelf: 'stretch', marginVertical: spacing.sm }}>
              <TimerBar timeLeft={timer.timeLeft} duration={room.turnDuration} />
            </View>
            <MicButton isRecording onPressIn={() => {}} onPressOut={() => {}} disabled />
            <Button label="I'm done" onPress={submitRecording} style={{ alignSelf: 'stretch' }} />
            <Pressable onPress={switchToTyping} hitSlop={8}>
              <Text style={styles.typeLink}>Type instead</Text>
            </Pressable>
          </View>
        )}

        {phase === 'processing' && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.pink} size="large" />
            <Text style={styles.sub}>Judging your argument…</Text>
          </View>
        )}

        {phase === 'speaking' && (
          <View style={styles.center}>
            <Text style={styles.sub}>Reading the verdict aloud…</Text>
          </View>
        )}

        {phase === 'typing' && (
          <View style={{ gap: spacing.sm }}>
            <Text style={styles.kicker}>{me.name}&apos;s argument</Text>
            <TextInput
              value={typedText}
              onChangeText={setTypedText}
              placeholder="Type your argument…"
              placeholderTextColor={colors.text.disabled}
              style={styles.typeInput}
              multiline
              autoFocus
            />
            <Button label="Submit argument" onPress={submitTyped} disabled={!typedText.trim()} />
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.pink,
  },
  topic: { fontFamily: fonts.heading, fontSize: 18, color: colors.text.primary },
  roundLine: { fontFamily: fonts.body, fontSize: 13, color: colors.sky },
  you: { fontFamily: fonts.body, fontSize: 12, color: colors.text.secondary },
  feed: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm, flexGrow: 1 },
  dock: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.pink,
    minHeight: 180,
    justifyContent: 'center',
  },
  center: { alignItems: 'center', gap: spacing.sm },
  kicker: {
    fontFamily: fonts.heading,
    fontSize: 15,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  count: { fontFamily: fonts.display, fontSize: 64, color: colors.sky },
  sub: { fontFamily: fonts.body, fontSize: 14, color: colors.text.secondary, textAlign: 'center' },
  bigLabel: { fontFamily: fonts.heading, fontSize: 20, color: colors.text.primary },
  recRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  recDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.coral },
  typeLink: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.sky,
    textDecorationLine: 'underline',
    marginTop: spacing.xs,
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
