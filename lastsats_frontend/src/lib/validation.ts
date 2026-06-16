/**
 * Validation utilities for LastSats application
 */

/**
 * Validates a Stacks address format
 * @param address - The address to validate
 * @returns true if valid, false otherwise
 */
export function isValidStacksAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  
  // Stacks address format: (SP|ST) + 39 characters (base58)
  const stacksAddressRegex = /^(SP|ST)[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{39}$/;
  return stacksAddressRegex.test(address);
}

/**
 * Validates a vault name
 * @param name - The name to validate
 * @returns validation result with error message if invalid
 */
export function validateVaultName(name: string): { isValid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Vault name is required' };
  }
  
  const trimmed = name.trim();
  if (trimmed.length < 3) {
    return { isValid: false, error: 'Vault name must be at least 3 characters' };
  }
  
  if (trimmed.length > 50) {
    return { isValid: false, error: 'Vault name must be 50 characters or less' };
  }
  
  // Check for basic profanity or inappropriate content
  const inappropriate = ['test', 'xxx', 'fuck', 'shit', 'damn'];
  const lowerName = trimmed.toLowerCase();
  if (inappropriate.some(word => lowerName.includes(word))) {
    return { isValid: false, error: 'Please choose a more appropriate name' };
  }
  
  return { isValid: true };
}

/**
 * Validates an sBTC amount
 * @param amount - The amount to validate
 * @param maxAmount - The maximum allowed amount
 * @param minAmount - The minimum allowed amount (default: 0.00001)
 * @returns validation result with error message if invalid
 */
export function validateSbtcAmount(
  amount: string | number, 
  maxAmount: number, 
  minAmount: number = 0.00001
): { isValid: boolean; error?: string } {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return { isValid: false, error: 'Please enter a valid amount' };
  }
  
  if (numAmount < minAmount) {
    return { isValid: false, error: `Amount must be at least ${minAmount} sBTC` };
  }
  
  if (numAmount > maxAmount) {
    return { isValid: false, error: 'Amount exceeds available balance' };
  }
  
  // Free tier limit
  if (numAmount > 0.05) {
    return { isValid: false, error: 'Free tier limit is 0.05 sBTC' };
  }
  
  return { isValid: true };
}

/**
 * Validates beneficiary percentage
 * @param percentage - The percentage to validate
 * @returns validation result with error message if invalid
 */
export function validatePercentage(percentage: number): { isValid: boolean; error?: string } {
  if (isNaN(percentage)) {
    return { isValid: false, error: 'Please enter a valid percentage' };
  }
  
  if (percentage < 1) {
    return { isValid: false, error: 'Percentage must be at least 1%' };
  }
  
  if (percentage > 100) {
    return { isValid: false, error: 'Percentage cannot exceed 100%' };
  }
  
  return { isValid: true };
}