import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SignUpForm } from '@/features/auth';
import { colors, spacing } from '@/shared/constants/theme';

export default function RegisterScreen() {
  const router = useRouter();

  const handleNavigateToLogin = () => {
    router.push('/(auth)/login');
  };

  const handleSuccess = () => {
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <SignUpForm
            onNavigateToLogin={handleNavigateToLogin}
            onSuccess={handleSuccess}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  formContainer: {
    maxWidth: 400,
    width: '100%',
  },
  keyboardView: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
