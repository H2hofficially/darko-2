import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type Tier = 'free' | 'pro' | 'executive';

export const TIER_LIMITS = {
  free:      { targets: 1,  messagesPerTargetPerDay: 5 },
  pro:       { targets: 3,  messagesPerTargetPerDay: 30 },
  executive: { targets: 999, messagesPerTargetPerDay: 999 },
};

type UserContextType = {
  tier: Tier;
  userId: string | null;
  refreshTier: () => Promise<void>;
};

const UserContext = createContext<UserContextType>({
  tier: 'free',
  userId: null,
  refreshTier: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [tier, setTier] = useState<Tier>('free');
  const [userId, setUserId] = useState<string | null>(null);

  const loadTier = async (uid: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('tier')
      .eq('id', uid)
      .single();
    if (data?.tier) setTier(data.tier as Tier);
  };

  const refreshTier = async () => {
    if (userId) await loadTier(userId);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        loadTier(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        loadTier(session.user.id);
      } else {
        setUserId(null);
        setTier('free');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ tier, userId, refreshTier }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
