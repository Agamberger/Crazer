import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { colors, spacing, typography } from '@/shared/constants/theme';
import { useAuth } from '../hooks/useAuth';

export interface SignInFormProps {
  onNavigateToRegister?: () => void;
  onSuccess?: () => void;
}

export const SignInForm: React.FC<SignInFormProps> = ({
  onNavigateToRegister,
  onSuccess,
}) => {
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
      if (onSuccess) {
        onSuccess();
      }
    } catch {
      // L'erreur globale est gérée par Zustand.
    }
  };

  const displayError = validationError || error;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Connexion</Text>
      <Text style={styles.subtitle}>Ravis de vous revoir sur Crazer 👋</Text>

      {displayError ? (
        <View style={styles.errorContainer} testID="error-container">
          <Text style={styles.errorText}>{displayError}</Text>
        </View>
      ) : null}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Adresse Email</Text>
        <TextInput
          style={styles.input}
          placeholder="votre.email@exemple.com"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (validationError) setValidationError(null);
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Adresse email"
          testID="input-email"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Mot de passe</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (validationError) setValidationError(null);
          }}
          secureTextEntry
          autoCapitalize="none"
          accessibilityLabel="Mot de passe"
          testID="input-password"
        />
      </View>

      <Button
        title="Se connecter"
        variant="primary"
        loading={isLoading}
        onPress={handleSignIn}
        style={styles.submitButton}
        testID="btn-submit-signin"
      />

      {onNavigateToRegister ? (
        <View style={styles.footer}>
          <Text style={styles.footerText}>Pas encore de compte ? </Text>
          <TouchableOpacity onPress={onNavigateToRegister} testID="btn-go-to-register">
            <Text style={styles.footerLink}>{"S'inscrire"}</Text>
          </TouchableOpacity>
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
  errorContainer: {
    backgroundColor: colors.errorBackground,
    borderColor: colors.error,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizes.xs,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  footerLink: {
    color: colors.primary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  input: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    marginBottom: spacing.xs,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
});
