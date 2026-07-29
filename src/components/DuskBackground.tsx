import { StyleSheet, View, Dimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect, Circle } from 'react-native-svg';
import { colors } from '@/constants/theme';

const { width: W, height: H } = Dimensions.get('window');

// Deterministic tiny "star" field so the backdrop has texture without reflowing
// on every render. A cheap seeded PRNG keeps the layout stable across mounts.
function makeStars(count: number) {
  let seed = 1337;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  return Array.from({ length: count }, () => ({
    cx: rand() * W,
    cy: rand() * H,
    r: 0.5 + rand() * 1.4,
    o: 0.06 + rand() * 0.22,
  }));
}
const STARS = makeStars(46);

/**
 * Ambient "Neon Dusk" backdrop — soft pink + violet + blue glows over the deep
 * violet base, a faint starfield for texture, and an edge vignette for depth.
 * Rendered behind every screen for a consistent, non-bland look.
 */
export function DuskBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={W} height={H}>
        <Defs>
          <RadialGradient id="glowPink" cx={W * 0.85} cy={H * 0.08} r={W * 0.95} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={colors.glow.pink} stopOpacity="0.34" />
            <Stop offset="1" stopColor={colors.glow.pink} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="glowViolet" cx={W * 0.5} cy={H * 0.45} r={W * 0.9} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={colors.glow.violet} stopOpacity="0.24" />
            <Stop offset="1" stopColor={colors.glow.violet} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="glowBlue" cx={W * 0.1} cy={H * 0.92} r={W * 0.95} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={colors.glow.blue} stopOpacity="0.2" />
            <Stop offset="1" stopColor={colors.glow.blue} stopOpacity="0" />
          </RadialGradient>
          {/* darken the edges so content in the center pops */}
          <RadialGradient id="vignette" cx={W * 0.5} cy={H * 0.5} r={H * 0.62} gradientUnits="userSpaceOnUse">
            <Stop offset="0.55" stopColor={colors.bg.void} stopOpacity="0" />
            <Stop offset="1" stopColor={colors.bg.void} stopOpacity="0.55" />
          </RadialGradient>
        </Defs>

        <Rect x="0" y="0" width={W} height={H} fill={colors.bg.base} />
        <Rect x="0" y="0" width={W} height={H} fill="url(#glowViolet)" />
        <Rect x="0" y="0" width={W} height={H} fill="url(#glowBlue)" />
        <Rect x="0" y="0" width={W} height={H} fill="url(#glowPink)" />

        {STARS.map((s, i) => (
          <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="#FFFFFF" opacity={s.o} />
        ))}

        <Rect x="0" y="0" width={W} height={H} fill="url(#vignette)" />
      </Svg>
    </View>
  );
}
