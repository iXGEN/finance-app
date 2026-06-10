import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../services/supabase';
import { Colors } from '../../constants/colors';
import { useT } from '../../services/i18n';

export default function LoginScreen() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t.common.error, t.login.missingFields);
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        Alert.alert(t.login.accountCreatedTitle, t.login.accountCreatedMsg);
      }
      router.replace('/(tabs)/resumen');
    } catch (err: any) {
      Alert.alert(t.common.error, err.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <Text style={styles.title}>💸 Finance</Text>
        <Text style={styles.subtitle}>{t.login.subtitle}</Text>

        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder={t.login.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder={t.login.password}
          secureTextEntry
          autoComplete="password"
        />

        <TouchableOpacity style={styles.btn} onPress={handleAuth} disabled={loading}>
          <Text style={styles.btnText}>
            {loading ? t.common.loading : mode === 'login' ? t.login.enter : t.login.createAccount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchMode}
          onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          <Text style={styles.switchText}>
            {mode === 'login' ? t.login.noAccount : t.login.hasAccount}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
    marginBottom: 12,
    backgroundColor: Colors.background,
  },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  switchMode: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchText: {
    color: Colors.primary,
    fontSize: 14,
  },
});
