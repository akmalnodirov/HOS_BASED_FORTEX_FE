export const ActionStates: Record<number, { label: string; color: string }> = {
  0: { label: 'Pending', color: '#7588BF' },
  1: { label: 'Staged', color: '#3F963F' },
  2: { label: 'Finished', color: '#3F963F' },
  3: { label: 'Edited', color: '#007BFF' },
  4: { label: 'Archived', color: '#9A6935' },
  5: { label: 'RolledBack', color: '#D6A834' },
  6: { label: 'Copied', color: '#C1D116' },
  7: { label: 'Ignored', color: '#A3A5A3' },
  8: { label: 'Reassigned', color: '#9A6935' },
}

export const TabTypes: Record<number, string> = {
  0: 'Initial',
  1: 'New',
  2: 'Edited',
  3: 'Move',
  4: 'Optimized',
  7: 'Reassigned',
}

export const RecordOrigin: Record<number, { shortName: string }> = {
  1: { shortName: 'ELD' },
  2: { shortName: 'Driver' },
  3: { shortName: 'User' },
  4: { shortName: 'Unidentified' },
}

