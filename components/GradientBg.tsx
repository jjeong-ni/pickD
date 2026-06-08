import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { Gradient } from '../constants/colors';

interface Props {
  children: ReactNode;
  style?: ViewStyle;
  variant?: 'main' | 'soft' | 'header';
}

export function GradientBg({ children, style, variant = 'main' }: Props) {
  const colors = Gradient[variant];
  return (
    <LinearGradient
      colors={colors as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.base, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  base: { flex: 1 },
});
