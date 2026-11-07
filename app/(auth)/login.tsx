import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/shared/components';
import { SignInForm } from '@/features/auth';
import { spacing } from '@/shared/constants/theme';

export default function LoginScreen() {
  const router = useRouter();

  const handleNavigateToRegister = () => {
    router.push('/(auth)/register');
  };

  const handleSuccess = () => {
    router.replace('/(tabs)');
  };

  return (
    <Screen
      scrollable
      avoidKeyboard
      edges={['top', 'bottom', 'left', 'right']}
      contentStyle={styles.container}
    >
      <View style={styles.formContainer}>
        <SignInForm onNavigateToRegister={handleNavigateToRegister} onSuccess={handleSuccess} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  formContainer: {
    maxWidth: 400,
    width: '100%',
  },
});
