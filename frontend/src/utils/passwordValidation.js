/**
 * Password validation utility for strong password policy
 * Requirements:
 * - At least 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */

export const PASSWORD_REQUIREMENTS = {
  minLength: {
    test: (password) => password.length >= 8,
    message: 'Al menos 8 caracteres',
  },
  hasUppercase: {
    test: (password) => /[A-Z]/.test(password),
    message: 'Al menos una letra mayúscula',
  },
  hasLowercase: {
    test: (password) => /[a-z]/.test(password),
    message: 'Al menos una letra minúscula',
  },
  hasNumber: {
    test: (password) => /\d/.test(password),
    message: 'Al menos un número',
  },
  hasSpecialChar: {
    test: (password) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password),
    message: 'Al menos un carácter especial (!@#$%^&*...)',
  },
}

/**
 * Validates a password against all requirements
 * @param {string} password - The password to validate
 * @returns {Object} - { isValid: boolean, errors: string[], requirements: Object }
 */
export const validatePassword = (password) => {
  const requirements = {}
  const errors = []

  Object.entries(PASSWORD_REQUIREMENTS).forEach(([key, requirement]) => {
    const passes = requirement.test(password || '')
    requirements[key] = {
      passes,
      message: requirement.message,
    }
    if (!passes) {
      errors.push(requirement.message)
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    requirements,
  }
}

/**
 * Calculates password strength as a percentage
 * @param {string} password - The password to check
 * @returns {number} - Strength percentage (0-100)
 */
export const getPasswordStrength = (password) => {
  if (!password) return 0
  
  const { requirements } = validatePassword(password)
  const passedCount = Object.values(requirements).filter(r => r.passes).length
  const totalCount = Object.keys(requirements).length
  
  return Math.round((passedCount / totalCount) * 100)
}

/**
 * Gets the strength label and color based on password strength
 * @param {number} strength - Strength percentage
 * @returns {Object} - { label: string, color: string, bgColor: string }
 */
export const getStrengthInfo = (strength) => {
  if (strength === 0) {
    return { label: '', color: 'text-gray-400', bgColor: 'bg-gray-200' }
  }
  if (strength < 40) {
    return { label: 'Débil', color: 'text-red-500', bgColor: 'bg-red-500' }
  }
  if (strength < 80) {
    return { label: 'Media', color: 'text-yellow-500', bgColor: 'bg-yellow-500' }
  }
  return { label: 'Fuerte', color: 'text-green-500', bgColor: 'bg-green-500' }
}
