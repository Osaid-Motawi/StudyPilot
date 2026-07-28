import { createContext, useContext, useEffect, useState } from 'react';

// Which design system the signed-in user is viewing: 'classic' (original) or
// 'mui' (Material). The choice is persisted PER USER in localStorage, keyed by
// uid, so two people sharing a browser keep independent preferences and the
// pick survives reloads. Signed-out users always see Classic (the switcher only
// appears once authenticated), so there is no anonymous key.

const DESIGNS = ['classic', 'mui'];
const DEFAULT_DESIGN = 'classic';

function storageKey(uid) {
  return `studypilot-design:${uid}`;
}

function readStored(uid) {
  if (!uid) return DEFAULT_DESIGN;
  const v = localStorage.getItem(storageKey(uid));
  return DESIGNS.includes(v) ? v : DEFAULT_DESIGN;
}

const DesignContext = createContext({
  design: DEFAULT_DESIGN,
  setDesign: () => {},
  toggleDesign: () => {},
});

export function DesignProvider({ uid, children }) {
  const [design, setDesignState] = useState(() => readStored(uid));

  // Re-load the stored preference whenever the signed-in user changes (login,
  // logout, account switch) so we never show one user another's choice.
  useEffect(() => {
    setDesignState(readStored(uid));
  }, [uid]);

  function setDesign(next) {
    if (!DESIGNS.includes(next)) return;
    setDesignState(next);
    if (uid) localStorage.setItem(storageKey(uid), next);
  }

  function toggleDesign() {
    setDesign(design === 'mui' ? 'classic' : 'mui');
  }

  return (
    <DesignContext.Provider value={{ design, setDesign, toggleDesign }}>
      {children}
    </DesignContext.Provider>
  );
}

export function useDesign() {
  return useContext(DesignContext);
}
