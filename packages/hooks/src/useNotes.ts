/**
 * Note management hook
 */

import { useState, useCallback, useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useCloakCraft } from './provider';
import type { DecryptedNote } from '@cloakcraft/types';

export function useNotes(tokenMint?: PublicKey) {
  const { notes, sync, isSyncing } = useCloakCraft();

  const filteredNotes = useMemo(() => {
    if (!tokenMint) return notes;
    return notes.filter((note) => note.tokenMint.equals(tokenMint));
  }, [notes, tokenMint]);

  const totalAmount = useMemo(() => {
    return filteredNotes.reduce((sum, note) => sum + note.amount, 0n);
  }, [filteredNotes]);

  return {
    notes: filteredNotes,
    totalAmount,
    noteCount: filteredNotes.length,
    sync,
    isSyncing,
  };
}

export function useNoteSelection(tokenMint: PublicKey) {
  const { notes } = useNotes(tokenMint);
  const [selectedNotes, setSelectedNotes] = useState<DecryptedNote[]>([]);

  const toggleNote = useCallback((note: DecryptedNote) => {
    setSelectedNotes((prev) => {
      const index = prev.findIndex(
        (n) =>
          Buffer.from(n.commitment).toString('hex') ===
          Buffer.from(note.commitment).toString('hex')
      );
      if (index >= 0) {
        return [...prev.slice(0, index), ...prev.slice(index + 1)];
      }
      return [...prev, note];
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedNotes(notes);
  }, [notes]);

  const clearSelection = useCallback(() => {
    setSelectedNotes([]);
  }, []);

  const selectedAmount = useMemo(() => {
    return selectedNotes.reduce((sum, note) => sum + note.amount, 0n);
  }, [selectedNotes]);

  return {
    selectedNotes,
    selectedAmount,
    toggleNote,
    selectAll,
    clearSelection,
  };
}
