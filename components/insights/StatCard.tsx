import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Colors } from '../../constants/colors';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

interface Props {
  label: string;
  value: string;
  accent?: string;
  sub?: string;
  onPress?: () => void;
}

export function StatCard({ label, value, accent, sub, onPress }: Props) {
  const Container: any = onPress ? TouchableOpacity : View;
  return (
    <Container style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: accent ?? Colors.text }]} numberOfLines={1}>{value}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 4,
  },
  label: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  value: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: MONO,
    fontVariant: ['tabular-nums'],
  },
  sub: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
});
