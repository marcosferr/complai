import React from 'react'
import { validatePassword, getPasswordStrength, getStrengthInfo } from '@/utils/passwordValidation'

/**
 * Password strength indicator component
 * Shows visual feedback for password requirements
 */
const PasswordStrengthIndicator = ({ password, showRequirements = true }) => {
  const { requirements } = validatePassword(password)
  const strength = getPasswordStrength(password)
  const strengthInfo = getStrengthInfo(strength)

  if (!password) {
    return null
  }

  return (
    <div className="mt-2 space-y-2">
      {/* Strength Bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${strengthInfo.bgColor}`}
            style={{ width: `${strength}%` }}
          />
        </div>
        {strengthInfo.label && (
          <span className={`text-xs font-medium ${strengthInfo.color}`}>
            {strengthInfo.label}
          </span>
        )}
      </div>

      {/* Requirements List */}
      {showRequirements && (
        <ul className="text-xs space-y-1">
          {Object.entries(requirements).map(([key, { passes, message }]) => (
            <li 
              key={key}
              className={`flex items-center gap-1.5 ${
                passes 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {passes ? (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              {message}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default PasswordStrengthIndicator
