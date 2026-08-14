import React from 'react';
import { LandingScreen } from './LandingScreen';

interface Screen1AuthProps {
  onAuthSuccess: (phoneNumber: string, shopDetails?: { shopName: string; ownerName: string }) => void;
  defaultMode?: 'landing' | 'login' | 'signup';
  onNavigatePolicy?: (policy: 'terms' | 'privacy' | 'refund') => void;
}

export const Screen1Auth: React.FC<Screen1AuthProps> = ({
  onAuthSuccess,
  defaultMode = 'landing',
  onNavigatePolicy,
}) => {
  return (
    <LandingScreen
      onGoToSignUp={() => {}}
      onGoToLogin={() => {}}
      onDemoAccess={() =>
        onAuthSuccess('+91 98765 43210', {
          shopName: 'Tailor Shop',
          ownerName: 'Shop Owner',
        })
      }
      onNavigatePolicy={onNavigatePolicy}
      onAuthSuccess={onAuthSuccess}
    />
  );
};
