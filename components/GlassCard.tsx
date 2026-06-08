import { View, StyleSheet, Platform, ViewStyle } from 'react-native';
import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  intensity?: 'low' | 'mid' | 'high';
}

export function GlassCard({ children, style, intensity = 'mid' }: Props) {
  const bg = intensity === 'low'
    ? 'rgba(255,255,255,0.15)'
    : intensity === 'mid'
    ? 'rgba(255,255,255,0.25)'
    : 'rgba(255,255,255,0.45)';

  const webExtra = Platform.OS === 'web'
    ? { backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }
    : {};

  return (
    <View style={[
      styles.base,
      { backgroundColor: bg },
      webExtra as any,
      ...(Array.isArray(style) ? style : [style]),
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    shadowColor: 'rgba(180,80,140,0.2)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
  },
});
