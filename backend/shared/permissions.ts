/**
 * Cognito User Groups permission validation utilities
 * 
 * This module provides functions to validate user permissions based on
 * Cognito User Group membership for role-based access control (RBAC).
 */

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
 * Extract Cognito groups from user claims
 * @param claims User claims from Cognito JWT token
 * @returns Array of group names the user belongs to
 */
export function extractCognitoGroups(claims: Record<string, string>): string[] {
  // Cognito includes groups in the 'cognito:groups' claim as a comma-separated string
  const groupsClaim = claims['cognito:groups'];
  if (!groupsClaim) {
    return [];
  }
  
  // Handle both string and array formats
  if (typeof groupsClaim === 'string') {
    return groupsClaim.split(',').map(group => group.trim());
  }
  
  // If it's already an array (in some cases), return it
  if (Array.isArray(groupsClaim)) {
    return groupsClaim;
  }
  
  return [];
}

/**
 * Check if user has any FlowConfig group membership
 * @param claims User claims from Cognito JWT token
 * @returns true if user belongs to at least one FlowConfig group
 */
export function hasFlowConfigAccess(claims: Record<string, string>): boolean {
  const userGroups = extractCognitoGroups(claims);
  const flowConfigGroups = Object.values(COGNITO_GROUPS);
  
  return userGroups.some(group => flowConfigGroups.includes(group as any));
}

/**
 * Get the highest access level for a user based on their group memberships
 * @param claims User claims from Cognito JWT token
 * @returns Highest access level or null if no access
 */
export function getAccessLevel(claims: Record<string, string>): AccessLevel | null {
  const userGroups = extractCognitoGroups(claims);
  
  // Check in order of highest to lowest priority
  if (userGroups.includes(COGNITO_GROUPS.ADMIN)) {
    return 'Full';
  }
  
  if (userGroups.includes(COGNITO_GROUPS.EDIT)) {
    return 'Edit';
  }
  
  if (userGroups.includes(COGNITO_GROUPS.READ)) {
    return 'Read';
  }
  
  return null;
}

/**
 * Check if user has permission to perform a specific action
 * @param claims User claims from Cognito JWT token
 * @param action The action being performed
 * @returns AccessLevel if authorized, null if not authorized
 */
export function checkActionPermission(
  claims: Record<string, string>,
  action: Action
): AccessLevel | null {
  const accessLevel = getAccessLevel(claims);
  
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
 * Check if user can perform a structural change (add/remove fields)
 * Only FlowConfigAdmin users can perform structural changes
 * @param claims User claims from Cognito JWT token
 * @returns true if user can make structural changes
 */
export function canMakeStructuralChanges(claims: Record<string, string>): boolean {
  const accessLevel = getAccessLevel(claims);
  return accessLevel === 'Full';
}

/**
 * Validate that a user has permission for a flow config operation
 * This is the main function to be used by API endpoints
 * @param claims User claims from Cognito JWT token
 * @param flowConfigId The flow config ID (not used in v1, but kept for v2 compatibility)
 * @param action The action being performed
 * @returns AccessLevel if authorized, null if not authorized
 */
export function validateFlowConfigPermission(
  claims: Record<string, string>,
  flowConfigId: string,
  action: Action
): AccessLevel | null {
  // In v1, all permissions are global (flowConfigId is ignored)
  // This parameter is kept for v2 compatibility when per-config permissions are added
  
  if (!hasFlowConfigAccess(claims)) {
    return null;
  }
  
  return checkActionPermission(claims, action);
}