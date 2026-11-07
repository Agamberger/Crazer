import { Ionicons } from '@expo/vector-icons';
import React from 'react';

/** Nom d'icône Ionicons valide (auto-complété par TypeScript). */
export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export type ComponentSize = 'sm' | 'md' | 'lg';
