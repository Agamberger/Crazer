import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Card, InlineAlert, TextField } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { useAuth } from '../hooks/useAuth';

export interface SignUpFormProps {
  onNavigateToLogin?: () => void;
  onSuccess?: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

interface SignUpValues {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/** Retourne le premier message d'erreur de validation, ou `null` si tout est valide. */
const validateSignUp = ({ fullName, email, password, confirmPassword }: SignUpValues) => {
  if (!fullName.trim()) return 'Veuillez saisir votre nom complet.';
  if (!email.trim()) return 'Veuillez saisir une adresse email.';
  if (!EMAIL_REGEX.test(email.trim())) return 'Veuillez saisir une adresse email valide.';
  if (!password) return 'Veuillez saisir un mot de passe.';
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`;
  }
  if (password !== confirmPassword) return 'Les mots de passe ne correspondent pas.';
  return null;
};

export const SignUpForm: React.FC<SignUpFormProps> = ({ onNavigateToLogin, onSuccess }) => {
  const { register, isLoading, error, clearError } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSignUp = async () => {
    clearError();
    const message = validateSignUp({ fullName, email, password, confirmPassword });
    setValidationError(message);
    if (message) return;

    try {
      await register({ email: email.trim(), password, fullName: fullName.trim() });
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
        Créer un compte
      </AppText>
      <AppText variant="bodySmall" color="secondary" align="center" style={styles.subtitle}>
        Rejoignez la communauté Crazer 🚀
      </AppText>

      {displayError ? <InlineAlert message={displayError} testID="error-container" /> : null}

      <TextField
        label="Nom complet"
        placeholder="Jean Dupont"
        value={fullName}
        onChangeText={handleChange(setFullName)}
        autoCapitalize="words"
        leftIcon="person-outline"
        accessibilityLabel="Nom complet"
        testID="input-fullname"
      />

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
        placeholder={`Au moins ${MIN_PASSWORD_LENGTH} caractères`}
        value={password}
        onChangeText={handleChange(setPassword)}
        isPassword
        autoCapitalize="none"
        leftIcon="lock-closed-outline"
        accessibilityLabel="Mot de passe"
        testID="input-password"
      />

      <TextField
        label="Confirmer le mot de passe"
        placeholder="Confirmez votre mot de passe"
        value={confirmPassword}
        onChangeText={handleChange(setConfirmPassword)}
        isPassword
        autoCapitalize="none"
        leftIcon="lock-closed-outline"
        accessibilityLabel="Confirmer le mot de passe"
        testID="input-confirm-password"
      />

      <Button
        title="Créer mon compte"
        loading={isLoading}
        onPress={handleSignUp}
        style={styles.submitButton}
        testID="btn-submit-signup"
      />

      {onNavigateToLogin ? (
        <View style={styles.footer}>
          <AppText variant="bodySmall" color="secondary">
            Déjà un compte ?
          </AppText>
          <Button
            title="Se connecter"
            variant="ghost"
            size="sm"
            onPress={onNavigateToLogin}
            testID="btn-go-to-login"
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
