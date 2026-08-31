import React from 'react';
import { LandingScreen } from './LandingScreen';

interface Screen1AuthProps {
  onAuthSuccess: (phoneNumber: string, shopDetails?: { shopName: string; ownerName: string }) => void;
  onCustomerAuthSuccess?: (customerPhone: string) => void;
  defaultMode?: 'landing' | 'login' | 'signup' | 'customer';
  initialAuthModal?: 'login' | 'signup' | 'customer' | null;
  initialSection?: string;
  onNavigatePolicy?: (policy: 'terms' | 'privacy' | 'refund') => void;
  onNavigateCatalogue?: () => void;
  onNavigateCustomerIndex?: () => void;
}

export const Screen1Auth: React.FC<Screen1AuthProps> = ({
  onAuthSuccess,
  onCustomerAuthSuccess,
  defaultMode = 'landing',
  initialAuthModal,
  initialSection,
  onNavigatePolicy,
  onNavigateCatalogue,
  onNavigateCustomerIndex,
}) => {
  return (
    <LandingScreen
      onGoToSignUp={() => {}}
      onGoToLogin={() => {}}
      initialAuthModal={initialAuthModal || (defaultMode === 'login' ? 'login' : defaultMode === 'signup' ? 'signup' : defaultMode === 'customer' ? 'customer' : null)}
      initialSection={initialSection}
      onNavigatePolicy={onNavigatePolicy}
      onAuthSuccess={onAuthSuccess}
      onCustomerAuthSuccess={onCustomerAuthSuccess}
      onNavigateCatalogue={onNavigateCatalogue}
      onNavigateCustomerIndex={onNavigateCustomerIndex}
    />
  );
};
