import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Card, InlineAlert, TextField } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { useAuth } from '../hooks/useAuth';

export interface SignInFormProps {
  onNavigateToRegister?: () => void;
  onSuccess?: () => void;
}

export const SignInForm: React.FC<SignInFormProps> = ({ onNavigateToRegister, onSuccess }) => {
  const { login, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setValidationError(null);
    clearError();

    if (!email.trim()) {
      setValidationError('Veuillez saisir votre adresse email.');
      return;
    }

    if (!password) {
      setValidationError('Veuillez saisir votre mot de passe.');
      return;
    }

    try {
      await login({ email: email.trim(), password });
      onSuccess?.();
    } catch {
      // L'erreur globale est gérée par Zustand.
    }
  };

  const handleChange = (setter: (value: string) => void) => (text: string) => {
    setter(text);
    if (validationError) setValidationError(null);
  };

  const displayError = validationError || error;

  return (
    <Card style={styles.card}>
      <AppText variant="h1" align="center" style={styles.title}>
        Connexion
      </AppText>
      <AppText variant="bodySmall" color="secondary" align="center" style={styles.subtitle}>
        Ravis de vous revoir sur Crazer 👋
      </AppText>

      {displayError ? <InlineAlert message={displayError} testID="error-container" /> : null}

      <TextField
        label="Adresse Email"
        placeholder="votre.email@exemple.com"
        value={email}
        onChangeText={handleChange(setEmail)}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        leftIcon="mail-outline"
        accessibilityLabel="Adresse email"
        testID="input-email"
      />

      <TextField
        label="Mot de passe"
        placeholder="••••••••"
        value={password}
        onChangeText={handleChange(setPassword)}
        isPassword
        autoCapitalize="none"
        leftIcon="lock-closed-outline"
        accessibilityLabel="Mot de passe"
        testID="input-password"
      />

      <Button
        title="Se connecter"
        loading={isLoading}
        onPress={handleSignIn}
        style={styles.submitButton}
        testID="btn-submit-signin"
      />

      {onNavigateToRegister ? (
        <View style={styles.footer}>
          <AppText variant="bodySmall" color="secondary">
            Pas encore de compte ?
          </AppText>
          <Button
            title="S'inscrire"
            variant="ghost"
            size="sm"
            onPress={onNavigateToRegister}
            testID="btn-go-to-register"
          />
        </View>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    width: '100%',
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  subtitle: {
    marginBottom: spacing.lg,
  },
  title: {
    marginBottom: spacing.xs,
  },
});
