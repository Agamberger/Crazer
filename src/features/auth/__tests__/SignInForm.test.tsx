import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SignInForm } from '../components/SignInForm';
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

describe('SignInForm', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      session: null,
      isLoading: false,
      isInitialized: true,
      error: null,
    });
  });

  it('affiche le titre et les champs du formulaire', () => {
    const { getByText, getByTestId } = render(<SignInForm />);

    expect(getByText('Connexion')).toBeTruthy();
    expect(getByTestId('input-email')).toBeTruthy();
    expect(getByTestId('input-password')).toBeTruthy();
    expect(getByTestId('btn-submit-signin')).toBeTruthy();
  });

  it('affiche une erreur de validation si l email est vide lors de la soumission', async () => {
    const { getByTestId, getByText } = render(<SignInForm />);

    fireEvent.press(getByTestId('btn-submit-signin'));

    await waitFor(() => {
      expect(getByText('Veuillez saisir votre adresse email.')).toBeTruthy();
    });
  });

  it('appelle la fonction de navigation vers l inscription au clic', () => {
    const onNavigateMock = jest.fn();
    const { getByTestId } = render(<SignInForm onNavigateToRegister={onNavigateMock} />);

    fireEvent.press(getByTestId('btn-go-to-register'));

    expect(onNavigateMock).toHaveBeenCalled();
  });
});
