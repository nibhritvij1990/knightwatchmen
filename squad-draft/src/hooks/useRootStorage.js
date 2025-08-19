import { useEffect, useState } from 'react';
import { ensureValidRoot, loadRoot, saveRoot } from '../lib/storage';

export function useRootStorage() {
  const [root, setRoot] = useState(() => ensureValidRoot(loadRoot()));

  useEffect(() => {
    const id = setTimeout(() => saveRoot(root), 150);
    return () => clearTimeout(id);
  }, [root]);

  return [root, setRoot];
} 