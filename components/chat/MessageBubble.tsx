import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { ChatMessage } from '../../types';
import { Colors } from '../../constants/colors';

interface Props {
  message: ChatMessage;
  onRetry?: () => void;
}

export function MessageBubble({ message, onRetry }: Props) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.wrapper, isUser ? styles.wrapperUser : styles.wrapperAssistant]}>
      <View style={[
        styles.bubble,
        isUser ? styles.bubbleUser : styles.bubbleAssistant,
        message.isError && styles.bubbleError,
      ]}>
        {message.isLoading ? (
          <ActivityIndicator size="small" color={Colors.textSecondary} />
        ) : (
          <Text style={[styles.text, isUser ? styles.textUser : styles.textAssistant, message.isError && styles.textError]}>
            {message.content}
          </Text>
        )}
      </View>
      {message.isError && onRetry && (
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
          <Text style={styles.retryText}>↻ Reintentar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  wrapperUser: {
    alignItems: 'flex-end',
  },
  wrapperAssistant: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleError: {
    borderColor: '#ef4444',
    backgroundColor: '#1a0a0a',
  },
  text: {
    fontSize: 15,
    lineHeight: 21,
  },
  textUser: {
    color: '#fff',
  },
  textAssistant: {
    color: Colors.text,
  },
  textError: {
    color: '#f87171',
  },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  retryText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
});
