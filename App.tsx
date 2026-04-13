import React from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppNavigator from './android/app/src/navigation/AppNavigator';

;(MaterialCommunityIcons as any).loadFont();

export default function App() {
  return <AppNavigator />;
}