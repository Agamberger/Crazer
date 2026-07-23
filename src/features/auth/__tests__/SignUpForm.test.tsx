import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SignUpForm } from '../components/SignUpForm';
import { useAuthStore } from '../store/useAuthStore';

jest.mock('../services/authService', () => ({
  authService: {
    signInWithEmail: jest.fn(),
    signUpWithEmail: jest.fn(),
    signOut: jest.fn(),
    getCurrentSession: jest.fn(),
    onAuthStateChange: jest.fn(),
  },
}));

describe('SignUpForm', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      session: null,
      isLoading: false,
      isInitialized: true,
      error: null,
    });
  });

  it('affiche le formulaire de création de compte', () => {
    const { getByText, getByTestId } = render(<SignUpForm />);

    expect(getByText('Créer un compte')).toBeTruthy();
    expect(getByTestId('input-fullname')).toBeTruthy();
    expect(getByTestId('input-email')).toBeTruthy();
    expect(getByTestId('input-password')).toBeTruthy();
    expect(getByTestId('input-confirm-password')).toBeTruthy();
    expect(getByTestId('btn-submit-signup')).toBeTruthy();
  });

  it('valide la correspondance des mots de passe', async () => {
    const { getByTestId, getByText } = render(<SignUpForm />);

    fireEvent.changeText(getByTestId('input-fullname'), 'Jean Dupont');
    fireEvent.changeText(getByTestId('input-email'), 'jean@crazer.app');
    fireEvent.changeText(getByTestId('input-password'), 'password123');
    fireEvent.changeText(getByTestId('input-confirm-password'), 'differentpass');

    fireEvent.press(getByTestId('btn-submit-signup'));

    await waitFor(() => {
      expect(getByText('Les mots de passe ne correspondent pas.')).toBeTruthy();
    });
  });

  it('appelle la fonction de navigation vers la connexion au clic', () => {
    const onNavigateMock = jest.fn();
    const { getByTestId } = render(<SignUpForm onNavigateToLogin={onNavigateMock} />);

    fireEvent.press(getByTestId('btn-go-to-login'));

    expect(onNavigateMock).toHaveBeenCalled();
  });
});
