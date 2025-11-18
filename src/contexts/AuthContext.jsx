import { createContext, useEffect, useState, useRef } from 'react';
import { supabase, getUserProfile } from '../services/supabase';

const AuthContext = createContext({});

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const isInitializedRef = useRef(false);
  const isCheckingUserRef = useRef(false);

  useEffect(() => {
    // Check active session on mount
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        
        // Only skip INITIAL_SESSION event on mount - checkUser handles this
        // But we DO want to process SIGNED_IN events (user actively logging in)
        if (!isInitializedRef.current && event === 'INITIAL_SESSION') {
          console.log('Skipping initial session event, checkUser already handled it');
          return;
        }
        
        // For SIGNED_OUT event, always clear state
        if (event === 'SIGNED_OUT') {
          console.log('User signed out, clearing state');
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        
        if (session?.user) {
          console.log('Setting user state first...');
          setUser(session.user);
          
          // Fetch profile directly without deferring
          const fetchProfileAsync = async () => {
            try {
              console.log('Fetching profile for user:', session.user.id);
              
              // Try direct fetch as a workaround for hanging Supabase client
              console.log('Trying direct fetch workaround...');
              const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/users?id=eq.${session.user.id}&select=*`,
                {
                  headers: {
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                  }
                }
              );
              
              console.log('Direct fetch completed, status:', response.status);
              const data = await response.json();
              console.log('Direct fetch data:', data);
              
              const userProfile = data && data.length > 0 ? data[0] : null;
              const profileError = !userProfile ? { message: 'Profile not found' } : null;
              
              console.log('PROFILE QUERY RETURNED!');
              console.log('Profile query completed. Data:', userProfile, 'Error:', profileError);
            
              if (profileError) {
                console.error('Error fetching profile in auth listener:', profileError);
                console.error('Profile error details:', {
                  message: profileError.message,
                  details: profileError.details,
                  hint: profileError.hint,
                  code: profileError.code
                });
                setProfile(null);
              } else {
                console.log('Profile loaded in auth listener:', userProfile);
                setProfile(userProfile);
              }
            } catch (error) {
              console.error('Error fetching profile:', error);
              console.error('Full error:', error);
              setProfile(null);
            } finally {
              setLoading(false);
            }
          };
          
          // Call the async function
          fetchProfileAsync();
        } else {
          console.log('Auth event with no session:', event);
          // Only clear state if this is explicitly a sign-out event
          // Don't clear on TOKEN_REFRESHED or other events that might temporarily have no session
          if (event === 'SIGNED_OUT') {
            setUser(null);
            setProfile(null);
          }
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array - only run once on mount

  const checkUser = async () => {
    // Prevent multiple simultaneous calls (React 18 Strict Mode double-mount)
    if (isCheckingUserRef.current) {
      console.log('Already checking user, skipping duplicate call');
      return;
    }
    
    isCheckingUserRef.current = true;
    
    try {
      console.log('Checking for existing session...');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session error:', error);
        throw error;
      }
      
      if (session?.user) {
        console.log('Session found:', session.user.id);
        setUser(session.user);
        
        try {
          console.log('About to fetch profile for:', session.user.id);
          // Fetch profile using the session's access token
          const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          console.log('Profile query completed in checkUser. Data:', userProfile, 'Error:', profileError);
          
          if (profileError) {
            console.error('Error loading profile:', profileError);
            console.error('Profile error details:', {
              message: profileError.message,
              details: profileError.details,
              hint: profileError.hint,
              code: profileError.code
            });
            setProfile(null);
          } else {
            console.log('Profile loaded on mount:', userProfile);
            setProfile(userProfile);
          }
        } catch (profileError) {
          console.error('Exception loading profile:', profileError);
          console.error('Full exception:', profileError);
          setProfile(null);
        } finally {
          // Set loading false AFTER profile fetch completes
          setLoading(false);
        }
      } else {
        console.log('No existing session found');
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      setUser(null);
      setProfile(null);
      setLoading(false);
    } finally {
      isInitializedRef.current = true; // Mark as initialized after first check
      isCheckingUserRef.current = false; // Allow future checks
    }
  };

  const value = {
    user,
    profile,
    loading,
    refreshProfile: async () => {
      if (user) {
        const userProfile = await getUserProfile(user.id);
        setProfile(userProfile);
      }
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthProvider, AuthContext };
