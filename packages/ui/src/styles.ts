/**
 * Shared styles for CloakCraft UI components
 * Theme: Technical Precision - Clean light theme emphasizing cryptographic clarity
 */

import type { CSSProperties } from 'react';

export const colors = {
  primary: '#0066ff',
  primaryHover: '#0052cc',
  primaryLight: '#e6f2ff',
  success: '#00875a',
  successLight: '#e3fcef',
  error: '#de350b',
  errorLight: '#ffebe6',
  warning: '#ff8b00',
  warningLight: '#fff4e6',
  text: '#0f1419',
  textMuted: '#4a5568',
  textLight: '#8993a4',
  border: '#dfe4e8',
  borderHover: '#c1c9d0',
  background: '#ffffff',
  backgroundMuted: '#f8fafb',
  backgroundDark: '#f0f4f7',
};

export const styles: Record<string, CSSProperties> = {
  // Card container
  card: {
    padding: '28px',
    borderRadius: '16px',
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.background,
    boxShadow: '0 1px 3px rgba(15, 20, 25, 0.08)',
    transition: 'box-shadow 0.3s ease, transform 0.3s ease',
  },

  cardHover: {
    boxShadow: '0 4px 8px rgba(15, 20, 25, 0.12)',
    transform: 'translateY(-2px)',
  },

  cardTitle: {
    margin: '0 0 10px 0',
    fontSize: '1.375rem',
    fontWeight: 700,
    fontFamily: "'IBM Plex Serif', Georgia, serif",
    letterSpacing: '-0.01em',
    color: colors.text,
  },

  cardDescription: {
    margin: '0 0 24px 0',
    fontSize: '0.9375rem',
    color: colors.textMuted,
    lineHeight: 1.6,
  },

  // Form elements
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },

  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: colors.text,
    letterSpacing: '0.01em',
  },

  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    border: `1px solid ${colors.border}`,
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    boxSizing: 'border-box',
    backgroundColor: colors.background,
    color: colors.text,
    fontFamily: 'inherit',
  },

  inputFocused: {
    borderColor: colors.primary,
    boxShadow: `0 0 0 3px ${colors.primaryLight}`,
  },

  textarea: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    border: `1px solid ${colors.border}`,
    fontSize: '0.9375rem',
    fontFamily: "'IBM Plex Mono', 'SF Mono', 'Monaco', monospace",
    outline: 'none',
    resize: 'vertical',
    minHeight: '100px',
    boxSizing: 'border-box',
    backgroundColor: colors.background,
    color: colors.text,
    lineHeight: 1.5,
  },

  // Buttons
  buttonPrimary: {
    padding: '14px 24px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: colors.primary,
    color: 'white',
    fontSize: '0.9375rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0, 102, 255, 0.2)',
    letterSpacing: '0.01em',
  },

  buttonPrimaryHover: {
    backgroundColor: colors.primaryHover,
    boxShadow: '0 4px 8px rgba(0, 102, 255, 0.3)',
    transform: 'translateY(-1px)',
  },

  buttonSecondary: {
    padding: '14px 24px',
    borderRadius: '10px',
    border: `1.5px solid ${colors.border}`,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: '0.9375rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    letterSpacing: '0.01em',
  },

  buttonSecondaryHover: {
    borderColor: colors.borderHover,
    backgroundColor: colors.backgroundMuted,
    transform: 'translateY(-1px)',
  },

  buttonDisabled: {
    backgroundColor: colors.textLight,
    cursor: 'not-allowed',
    opacity: 0.5,
    boxShadow: 'none',
  },

  buttonSmall: {
    padding: '8px 16px',
    fontSize: '0.8125rem',
  },

  // Status messages
  errorText: {
    color: colors.error,
    fontSize: '0.875rem',
    marginTop: '6px',
    fontWeight: 500,
  },

  successText: {
    color: colors.success,
    fontSize: '0.875rem',
    fontWeight: 600,
  },

  successBox: {
    padding: '16px 20px',
    borderRadius: '12px',
    backgroundColor: colors.successLight,
    border: `1px solid ${colors.success}`,
    color: colors.success,
  },

  warningBox: {
    padding: '16px 20px',
    borderRadius: '12px',
    backgroundColor: colors.warningLight,
    border: `1px solid ${colors.warning}`,
    color: colors.warning,
  },

  errorBox: {
    padding: '16px 20px',
    borderRadius: '12px',
    backgroundColor: colors.errorLight,
    border: `1px solid ${colors.error}`,
    color: colors.error,
  },

  // Links
  link: {
    color: colors.primary,
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: 500,
    transition: 'color 0.2s ease',
  },

  linkHover: {
    color: colors.primaryHover,
    textDecoration: 'underline',
  },

  txLink: {
    marginTop: '10px',
    fontSize: '0.8125rem',
  },

  // List items
  listItem: {
    padding: '16px 20px',
    border: `1px solid ${colors.border}`,
    borderRadius: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'all 0.2s ease',
    backgroundColor: colors.background,
  },

  listItemHover: {
    borderColor: colors.borderHover,
    backgroundColor: colors.backgroundMuted,
    transform: 'translateX(2px)',
  },

  listItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    boxShadow: `0 0 0 3px ${colors.primaryLight}`,
  },

  // Badge
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.02em',
  },

  badgeSuccess: {
    backgroundColor: colors.successLight,
    color: colors.success,
  },

  badgeWarning: {
    backgroundColor: colors.warningLight,
    color: colors.warning,
  },

  badgeError: {
    backgroundColor: colors.errorLight,
    color: colors.error,
  },

  badgePrimary: {
    backgroundColor: colors.primaryLight,
    color: colors.primary,
  },

  // Layout
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  spaceBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  stack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },

  // Typography
  heading: {
    margin: '0 0 20px 0',
    fontSize: '1.75rem',
    fontWeight: 700,
    fontFamily: "'IBM Plex Serif', Georgia, serif",
    letterSpacing: '-0.01em',
    color: colors.text,
  },

  subheading: {
    margin: 0,
    fontSize: '0.9375rem',
    color: colors.textMuted,
    lineHeight: 1.6,
  },

  mono: {
    fontFamily: "'IBM Plex Mono', 'SF Mono', 'Monaco', monospace",
    fontSize: '0.8125rem',
    backgroundColor: colors.backgroundDark,
    padding: '2px 6px',
    borderRadius: '4px',
  },

  truncate: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  // Loading spinner
  spinner: {
    display: 'inline-block',
    width: '18px',
    height: '18px',
    border: '2px solid rgba(0, 102, 255, 0.2)',
    borderTopColor: colors.primary,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },

  // Empty state
  emptyState: {
    textAlign: 'center',
    padding: '48px 32px',
    color: colors.textMuted,
    fontSize: '0.9375rem',
  },

  // Divider
  divider: {
    height: '1px',
    backgroundColor: colors.border,
    border: 'none',
    margin: '24px 0',
  },

  // Info box
  infoBox: {
    padding: '16px 20px',
    borderRadius: '12px',
    backgroundColor: colors.backgroundMuted,
    border: `1px solid ${colors.border}`,
    fontSize: '0.875rem',
    color: colors.textMuted,
    lineHeight: 1.6,
  },

  // Stat display
  stat: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  statLabel: {
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: colors.textLight,
    fontWeight: 600,
  },

  statValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    fontFamily: "'IBM Plex Serif', Georgia, serif",
    color: colors.text,
    letterSpacing: '-0.01em',
  },
};
