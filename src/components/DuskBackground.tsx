import { StyleSheet, View, Dimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { colors } from '@/constants/theme';

const { width: W, height: H } = Dimensions.get('window');

/**
 * Ambient "Neon Dusk" backdrop — soft pink + violet + blue glows over the deep
 * violet base. Rendered behind every screen for a consistent, non-bland look.
 */
export function DuskBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={W} height={H}>
        <Defs>
          <RadialGradient
            id="glowPink"
            cx={W * 0.85}
            cy={H * 0.1}
            r={W * 0.95}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor={colors.glow.pink} stopOpacity="0.30" />
            <Stop offset="1" stopColor={colors.glow.pink} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient
            id="glowViolet"
            cx={W * 0.5}
            cy={H * 0.5}
            r={W * 0.9}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor={colors.glow.violet} stopOpacity="0.22" />
            <Stop offset="1" stopColor={colors.glow.violet} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient
            id="glowBlue"
            cx={W * 0.12}
            cy={H * 0.95}
            r={W * 0.95}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor={colors.glow.blue} stopOpacity="0.18" />
            <Stop offset="1" stopColor={colors.glow.blue} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        <Rect x="0" y="0" width={W} height={H} fill={colors.bg.base} />
        <Rect x="0" y="0" width={W} height={H} fill="url(#glowViolet)" />
        <Rect x="0" y="0" width={W} height={H} fill="url(#glowBlue)" />
        <Rect x="0" y="0" width={W} height={H} fill="url(#glowPink)" />
      </Svg>
    </View>
  );
}
