/**
 * Permission management hooks for FlowConfig application
 * 
 * This module provides React hooks to manage user permissions based on
 * Cognito User Group membership for role-based access control (RBAC).
 */

import { useContext, useState, useEffect } from 'react';
import { CognitoAuthenticationContext } from '../contexts/CognitoAuthenticationProvider';

export type AccessLevel = 'Full' | 'Edit' | 'Read';
export type Action = 'Create' | 'Read' | 'Edit' | 'Delete';

/**
 * Cognito User Groups for FlowConfig application
 */
export const COGNITO_GROUPS = {
  ADMIN: 'FlowConfigAdmin',
  EDIT: 'FlowConfigEdit',
  READ: 'FlowConfigRead',
} as const;

/**
 * Extract Cognito groups from JWT token
 * @param token Cognito JWT token
 * @returns Array of group names the user belongs to
 */
export function extractCognitoGroups(token: any): string[] {
  if (!token || !token['cognito:groups']) {
    return [];
  }
  
  const groupsClaim = token['cognito:groups'];
  
  // Handle both string and array formats
  if (typeof groupsClaim === 'string') {
    return groupsClaim.split(',').map(group => group.trim());
  }
  
  if (Array.isArray(groupsClaim)) {
    return groupsClaim;
  }
  
  return [];
}

/**
 * Get the highest access level for a user based on their group memberships
 * @param groups User's Cognito groups
 * @returns Highest access level or null if no access
 */
export function getAccessLevel(groups: string[]): AccessLevel | null {
  // Check in order of highest to lowest priority
  if (groups.includes(COGNITO_GROUPS.ADMIN)) {
    return 'Full';
  }
  
  if (groups.includes(COGNITO_GROUPS.EDIT)) {
    return 'Edit';
  }
  
  if (groups.includes(COGNITO_GROUPS.READ)) {
    return 'Read';
  }
  
  return null;
}

/**
 * Check if user has permission to perform a specific action
 * @param groups User's Cognito groups
 * @param action The action being performed
 * @returns AccessLevel if authorized, null if not authorized
 */
export function checkActionPermission(
  groups: string[],
  action: Action
): AccessLevel | null {
  const accessLevel = getAccessLevel(groups);
  
  if (!accessLevel) {
    return null;
  }
  
  // Map actions to required access levels
  switch (action) {
    case 'Read':
      // All groups can read
      return accessLevel;
      
    case 'Edit':
      // Edit and Admin can edit values
      if (accessLevel === 'Edit' || accessLevel === 'Full') {
        return accessLevel;
      }
      return null;
      
    case 'Create':
    case 'Delete':
      // Only Admin can create or delete
      if (accessLevel === 'Full') {
        return accessLevel;
      }
      return null;
      
    default:
      return null;
  }
}

/**
 * Check if user can perform structural changes (add/remove fields)
 * Only FlowConfigAdmin users can perform structural changes
 * @param groups User's Cognito groups
 * @returns true if user can make structural changes
 */
export function canMakeStructuralChanges(groups: string[]): boolean {
  const accessLevel = getAccessLevel(groups);
  return accessLevel === 'Full';
}

/**
 * Custom hook to get user's permission information
 * @returns Object with permission checking functions and user's access level
 */
export function usePermissions() {
  const tokenProvider = useContext(CognitoAuthenticationContext);
  const [userGroups, setUserGroups] = useState<string[]>([]);
  const [accessLevel, setAccessLevel] = useState<AccessLevel | null>(null);
  
  useEffect(() => {
    if (tokenProvider) {
      tokenProvider.getIdTokenPayload().then((token) => {
        const groups = extractCognitoGroups(token);
        setUserGroups(groups);
        setAccessLevel(getAccessLevel(groups));
      }).catch((error) => {
        console.error('Failed to get token payload:', error);
        setUserGroups([]);
        setAccessLevel(null);
      });
    }
  }, [tokenProvider]);
  
  return {
    userGroups,
    accessLevel,
    hasAccess: (action: Action) => checkActionPermission(userGroups, action) !== null,
    getAccessLevel: (action: Action) => checkActionPermission(userGroups, action),
    canMakeStructuralChanges: () => canMakeStructuralChanges(userGroups),
    isAdmin: () => accessLevel === 'Full',
    canEdit: () => accessLevel === 'Edit' || accessLevel === 'Full',
    canRead: () => accessLevel !== null,
  };
}