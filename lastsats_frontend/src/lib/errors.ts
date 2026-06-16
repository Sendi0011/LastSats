/**
 * Error handling utilities and user-friendly error messages
 */

export interface UserError {
  title: string;
  message: string;
  action?: string;
}

/**
 * Converts technical errors to user-friendly messages
 */
export function formatUserError(error: unknown): UserError {
  if (error instanceof Error) {
    // Wallet connection errors
    if (error.message.includes('User rejected')) {
      return {
        title: 'Connection Cancelled',
        message: 'You cancelled the wallet connection. Please try again when ready.',
        action: 'Try connecting again'
      };
    }
    
    if (error.message.includes('No wallet')) {
      return {
        title: 'No Wallet Found',
        message: 'Please install Xverse or Leather wallet to continue.',
        action: 'Install a wallet'
      };
    }
    
    // Balance/network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return {
        title: 'Network Error',
        message: 'Unable to connect to Stacks network. Please check your connection and try again.',
        action: 'Retry'
      };
    }
    
    // Contract interaction errors
    if (error.message.includes('unauthorized') || error.message.includes('not authorized')) {
      return {
        title: 'Not Authorized',
        message: 'You are not authorized to perform this action.',
      };
    }
    
    if (error.message.includes('insufficient')) {
      return {
        title: 'Insufficient Balance',
        message: 'You don\'t have enough sBTC to complete this transaction.',
        action: 'Check your balance'
      };
    }
    
    // Generic error with message
    return {
      title: 'Error',
      message: error.message,
      action: 'Try again'
    };
  }
  
  // Unknown error
  return {
    title: 'Unknown Error',
    message: 'An unexpected error occurred. Please try again.',
    action: 'Retry'
  };
}

/**
 * Contract error codes to user-friendly messages
 */
export const CONTRACT_ERRORS: Record<number, UserError> = {
  100: {
    title: 'Not Authorized',
    message: 'You are not authorized to perform this action.',
  },
  101: {
    title: 'Vault Not Found',
    message: 'The specified vault does not exist.',
  },
  102: {
    title: 'Invalid Tier',
    message: 'The selected tier is not valid.',
  },
  103: {
    title: 'Invalid Amount',
    message: 'Please enter a valid sBTC amount greater than 0.',
  },
  104: {
    title: 'Invalid Interval',
    message: 'Please select a valid heartbeat interval.',
  },
  105: {
    title: 'Invalid Beneficiaries',
    message: 'Please check your beneficiary information.',
  },
  106: {
    title: 'Vault Not Active',
    message: 'This vault is not in an active state.',
  },
  109: {
    title: 'Not In Grace Period',
    message: 'This action can only be performed during the grace period.',
  },
  110: {
    title: 'Not Guardian',
    message: 'Only the designated guardian can perform this action.',
  },
  111: {
    title: 'Already Paused',
    message: 'This vault is already paused.',
  },
  112: {
    title: 'Transfer Failed',
    message: 'The sBTC transfer failed. Please try again.',
    action: 'Retry transaction'
  },
  114: {
    title: 'Percentage Too High',
    message: 'Total beneficiary percentages cannot exceed 100%.',
  },
  115: {
    title: 'Incomplete Allocation',
    message: 'Beneficiary percentages must add up to exactly 100%.',
  },
  116: {
    title: 'Too Many Beneficiaries',
    message: 'You have reached the maximum number of beneficiaries for this tier.',
  },
  117: {
    title: 'Vault Already Finalized',
    message: 'This vault configuration has already been finalized.',
  },
  118: {
    title: 'Tier Limit Exceeded',
    message: 'You have reached the beneficiary limit for your current tier.',
  },
  119: {
    title: 'Not Distributing',
    message: 'Distribution has not been triggered for this vault.',
  },
  120: {
    title: 'Already Distributed',
    message: 'These funds have already been distributed.',
  },
};

/**
 * Gets user-friendly error for contract error code
 */
export function getContractError(errorCode: number): UserError {
  return CONTRACT_ERRORS[errorCode] || {
    title: 'Contract Error',
    message: `An error occurred (Code: ${errorCode}). Please try again.`,
    action: 'Retry'
  };
}