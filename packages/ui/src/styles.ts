/**
 * Shared styles for CloakCraft UI components
 */

import type { CSSProperties } from 'react';

export const colors = {
  primary: '#6366f1',
  primaryHover: '#4f46e5',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  text: '#1f2937',
  textMuted: '#6b7280',
  textLight: '#9ca3af',
  border: '#e5e7eb',
  borderHover: '#d1d5db',
  background: '#ffffff',
  backgroundMuted: '#f9fafb',
  backgroundDark: '#f3f4f6',
};

export const styles: Record<string, CSSProperties> = {
  // Card container
  card: {
    padding: '24px',
    borderRadius: '12px',
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.background,
  },

  cardTitle: {
    margin: '0 0 8px 0',
    fontSize: '1.25rem',
    fontWeight: 600,
    color: colors.text,
  },

  cardDescription: {
    margin: '0 0 20px 0',
    fontSize: '0.875rem',
    color: colors.textMuted,
  },

  // Form elements
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },

  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: colors.text,
  },

  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: `1px solid ${colors.border}`,
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.15s ease',
    boxSizing: 'border-box',
  },

  inputFocused: {
    borderColor: colors.primary,
  },

  textarea: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: `1px solid ${colors.border}`,
    fontSize: '0.875rem',
    fontFamily: 'monospace',
    outline: 'none',
    resize: 'vertical',
    minHeight: '80px',
    boxSizing: 'border-box',
  },

  // Buttons
  buttonPrimary: {
    padding: '12px 20px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: colors.primary,
    color: 'white',
    fontSize: '0.9375rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },

  buttonSecondary: {
    padding: '12px 20px',
    borderRadius: '8px',
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: '0.9375rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease, border-color 0.15s ease',
  },

  buttonDisabled: {
    backgroundColor: colors.textLight,
    cursor: 'not-allowed',
  },

  buttonSmall: {
    padding: '6px 12px',
    fontSize: '0.8125rem',
  },

  // Status messages
  errorText: {
    color: colors.error,
    fontSize: '0.875rem',
    marginTop: '4px',
  },

  successText: {
    color: colors.success,
    fontSize: '0.875rem',
    fontWeight: 500,
  },

  successBox: {
    padding: '12px 16px',
    borderRadius: '8px',
    backgroundColor: '#ecfdf5',
    border: `1px solid ${colors.success}`,
  },

  warningBox: {
    padding: '12px 16px',
    borderRadius: '8px',
    backgroundColor: '#fffbeb',
    border: `1px solid ${colors.warning}`,
  },

  // Links
  link: {
    color: colors.primary,
    textDecoration: 'none',
    fontSize: '0.875rem',
  },

  txLink: {
    marginTop: '8px',
    fontSize: '0.8125rem',
  },

  // List items
  listItem: {
    padding: '12px 16px',
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  listItemSelected: {
    borderColor: colors.primary,
    backgroundColor: '#eef2ff',
  },

  // Badge
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 500,
  },

  badgeSuccess: {
    backgroundColor: '#ecfdf5',
    color: colors.success,
  },

  badgeWarning: {
    backgroundColor: '#fffbeb',
    color: colors.warning,
  },

  badgeError: {
    backgroundColor: '#fef2f2',
    color: colors.error,
  },

  // Layout
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  spaceBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  stack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },

  // Typography
  heading: {
    margin: '0 0 16px 0',
    fontSize: '1.5rem',
    fontWeight: 600,
    color: colors.text,
  },

  subheading: {
    margin: 0,
    fontSize: '0.875rem',
    color: colors.textMuted,
  },

  mono: {
    fontFamily: 'monospace',
    fontSize: '0.8125rem',
  },

  truncate: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  // Loading spinner placeholder
  spinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid #e5e7eb',
    borderTopColor: colors.primary,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },

  // Empty state
  emptyState: {
    textAlign: 'center',
    padding: '32px',
    color: colors.textMuted,
  },
};
