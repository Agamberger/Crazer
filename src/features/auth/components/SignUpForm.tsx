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

export interface SignUpFormProps {
  onNavigateToLogin?: () => void;
  onSuccess?: () => void;
}

export const SignUpForm: React.FC<SignUpFormProps> = ({
  onNavigateToLogin,
  onSuccess,
}) => {
  const { register, isLoading, error, clearError } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSignUp = async () => {
    setValidationError(null);
    clearError();

    if (!fullName.trim()) {
      setValidationError('Veuillez saisir votre nom complet.');
      return;
    }

    if (!email.trim()) {
      setValidationError('Veuillez saisir une adresse email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setValidationError('Veuillez saisir une adresse email valide.');
      return;
    }

    if (!password) {
      setValidationError('Veuillez saisir un mot de passe.');
      return;
    }

    if (password.length < 6) {
      setValidationError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (password !== confirmPassword) {
      setValidationError('Les mots de passe ne correspondent pas.');
      return;
    }

    try {
      await register({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
      });
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
      <Text style={styles.title}>Créer un compte</Text>
      <Text style={styles.subtitle}>Rejoignez la communauté Crazer 🚀</Text>

      {displayError ? (
        <View style={styles.errorContainer} testID="error-container">
          <Text style={styles.errorText}>{displayError}</Text>
        </View>
      ) : null}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Nom complet</Text>
        <TextInput
          style={styles.input}
          placeholder="Jean Dupont"
          placeholderTextColor={colors.textMuted}
          value={fullName}
          onChangeText={(text) => {
            setFullName(text);
            if (validationError) setValidationError(null);
          }}
          autoCapitalize="words"
          accessibilityLabel="Nom complet"
          testID="input-fullname"
        />
      </View>

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
          placeholder="Au moins 6 caractères"
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

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Confirmer le mot de passe</Text>
        <TextInput
          style={styles.input}
          placeholder="Confirmez votre mot de passe"
          placeholderTextColor={colors.textMuted}
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text);
            if (validationError) setValidationError(null);
          }}
          secureTextEntry
          autoCapitalize="none"
          accessibilityLabel="Confirmer le mot de passe"
          testID="input-confirm-password"
        />
      </View>

      <Button
        title="Créer mon compte"
        variant="primary"
        loading={isLoading}
        onPress={handleSignUp}
        style={styles.submitButton}
        testID="btn-submit-signup"
      />

      {onNavigateToLogin ? (
        <View style={styles.footer}>
          <Text style={styles.footerText}>Déjà un compte ? </Text>
          <TouchableOpacity onPress={onNavigateToLogin} testID="btn-go-to-login">
            <Text style={styles.footerLink}>Se connecter</Text>
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
