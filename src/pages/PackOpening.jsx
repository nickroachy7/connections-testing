import { useState, useEffect } from 'react'
import { useNavigate, useParams, useRevalidator } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { useToast } from '../contexts/ToastContext'
import LoadingSpinner from '../components/LoadingSpinner'
import TierAssignment from '../components/TierAssignment'
import PackAnimation from '../components/PackAnimation'
import CardReveal from '../components/CardReveal'

export default function PackOpening() {
  const navigate = useNavigate()
  const revalidator = useRevalidator()
  const { teamId, packId } = useParams()
  const { success, error: showError } = useToast()
  
  const [pack, setPack] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showPackAnimation, setShowPackAnimation] = useState(true)
  const [opening, setOpening] = useState(false)
  const [revealedItems, setRevealedItems] = useState([])
  const [showCardReveal, setShowCardReveal] = useState(false)
  const [allCardsRevealed, setAllCardsRevealed] = useState(false)
  const [needsTierAssignment, setNeedsTierAssignment] = useState(false)
  const [tierConfig, setTierConfig] = useState(null)
  const [unassignedCards, setUnassignedCards] = useState([])
  const [packTokens, setPackTokens] = useState([])
  const [showTierAssignment, setShowTierAssignment] = useState(false)
  const [isProcessingTiers, setIsProcessingTiers] = useState(false)

  useEffect(() => {
    loadPack()
  }, [packId, teamId])

  const loadPack = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }

      // Get the pack details from user_packs table
      const { data: userPack, error: packError } = await supabase
        .from('user_packs')
        .select(`
          id,
          pack_id,
          pack:pack_id (
            pack_name,
            pack_type,
            player_count,
            token_count,
            description
          )
        `)
        .eq('id', packId)
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .eq('is_opened', false)
        .single()

      if (packError) throw packError
      if (!userPack) {
        showError('Pack not found or already opened')
        navigate(`/teams/${teamId}/dashboard`)
        return
      }

      console.log('Loaded pack data:', {
        user_pack_id: userPack.id,
        pack_id: userPack.pack_id,
        pack_details: userPack.pack,
        has_pack_id: !!userPack.pack_id,
        pack_type: userPack.pack?.pack_type
      })

      setPack(userPack)
    } catch (error) {
      console.error('Error loading pack:', error)
      showError('Failed to load pack')
      navigate(`/teams/${teamId}/dashboard`)
    } finally {
      setLoading(false)
    }
  }

  const openPack = async () => {
    setOpening(true)
    setShowPackAnimation(false)
    
    // Validate pack data before calling Edge Function
    if (!pack || !pack.pack_id) {
      console.error('Invalid pack data:', pack)
      showError('Invalid pack data. Please try again.')
      setOpening(false)
      return
    }
    
    console.log('Opening pack with data:', {
      user_pack_id: pack.id,
      pack_id: pack.pack_id,
      team_id: teamId,
      pack_type: pack.pack?.pack_type
    })
    
    try {
      // Call the Edge Function to open the pack
      const { data, error } = await supabase.functions.invoke('open-pack', {
        body: {
          pack_id: pack.pack_id,
          team_id: teamId,
          is_starter_pack: pack.pack.pack_type === 'starter'
        }
      })

      if (error) throw error
      if (!data || !data.success) {
        const errorMsg = data?.error || 'Failed to open pack'
        console.error('Edge Function returned error:', errorMsg, 'Full response:', data)
        throw new Error(errorMsg)
      }

      console.log('Pack opened successfully:', data)

      // Handle tier assignment for starter packs
      if (data.tier_config) {
        console.log('Starter pack detected with tier config:', data.tier_config)
        setTierConfig(data.tier_config)
        setNeedsTierAssignment(true)
        setUnassignedCards(data.contents.players.map(p => p.id))
        setPackTokens(data.contents.tokens || [])
        
        // Transform to card format for CardReveal
        const players = data.contents.players.map(player => ({
          type: 'player',
          data: player
        }))
        
        const tokens = data.contents.tokens.map(token => ({
          type: 'token',
          data: token
        }))
        
        setRevealedItems([...players, ...tokens])
        setShowCardReveal(true)
        setOpening(false)
        return
      }

      // Transform the response to match the expected format
      const players = data.contents.players.map(player => ({
        type: 'player',
        data: player
      }))
      
      const tokens = data.contents.tokens.map(token => ({
        type: 'token',
        data: token
      }))
      
      const validItems = [...players, ...tokens]
      
      // Mark pack as opened
      await supabase
        .from('user_packs')
        .update({ 
          is_opened: true, 
          opened_at: new Date().toISOString() 
        })
        .eq('id', packId)

      setRevealedItems(validItems)
      setShowCardReveal(true)
      success(data.message || 'Pack opened!')
    } catch (error) {
      console.error('Error opening pack:', error)
      showError(error.message || 'Failed to open pack')
      setShowPackAnimation(true)
    } finally {
      setOpening(false)
    }
  }

  const handleTierAssignments = async (tierAssignments) => {
    // Prevent duplicate execution
    if (isProcessingTiers) {
      console.warn('Already processing tier assignments, ignoring duplicate call')
      return
    }

    try {
      setIsProcessingTiers(true)
      setOpening(true)

      console.log('handleTierAssignments called with:', tierAssignments)
      console.log('Pack tokens:', packTokens)

      // Insert cards directly using the tier assignments
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Get the players with their assigned tiers
      const playersWithTiers = revealedItems
        .filter(item => item.type === 'player')
        .map(item => {
          const playerId = item.data.id
          const assignedTier = tierAssignments[playerId] || 'B'
          return {
            ...item.data,
            tier: assignedTier
          }
        })

      console.log('Players with assigned tiers:', playersWithTiers)

      // Insert all cards (players and tokens) into team_cards
      const cardsToInsert = playersWithTiers.map(player => ({
        team_id: teamId,
        player_id: player.id,
        tier: player.tier,
        level: 1,
        is_benched: true
      }))

      console.log('Inserting cards:', cardsToInsert)

      const { error: cardsError } = await supabase
        .from('team_cards')
        .insert(cardsToInsert)

      if (cardsError) throw cardsError

      // Insert tokens if any
      if (packTokens && packTokens.length > 0) {
        console.log('Inserting tokens:', packTokens)
        const tokensToInsert = packTokens.map(token => ({
          team_id: teamId,
          token_id: token.id
        }))

        const { error: tokensError } = await supabase
          .from('team_tokens')
          .insert(tokensToInsert)

        if (tokensError) throw tokensError
      }

      // Mark pack as opened
      const { error: packError } = await supabase
        .from('user_packs')
        .update({ 
          is_opened: true, 
          opened_at: new Date().toISOString() 
        })
        .eq('id', packId)

      if (packError) throw packError

      success('Cards added to your collection!')
      revalidator.revalidate()
      
      // Navigate to dashboard
      navigate(`/teams/${teamId}/dashboard`)
    } catch (error) {
      console.error('Error processing tier assignments:', error)
      showError(error.message || 'Failed to save cards')
    } finally {
      setOpening(false)
      setIsProcessingTiers(false)
    }
  }

  const handleCardFlip = (index) => {
    // Deprecated - using new CardReveal component
  }

  const handleRevealComplete = async (tierAssignments = null) => {
    setAllCardsRevealed(true);
    
    // If tier assignments provided (from starter pack), process them
    if (tierAssignments && pack.pack.pack_type === 'starter') {
      try {
        setOpening(true);
        await handleTierAssignments(tierAssignments);
      } catch (error) {
        console.error('Error processing tier assignments:', error);
        showError('Failed to assign tiers');
      } finally {
        setOpening(false);
      }
    } else {
      // Regular pack - just navigate
      navigate(`/teams/${teamId}/dashboard`);
    }
  };

  const handleProceedToTierAssignment = () => {
    setShowTierAssignment(true)
    setShowCardReveal(false)
  }

  const goToDashboard = () => {
    navigate(`/teams/${teamId}/dashboard`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-primary-black-950 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Show tier assignment screen
  if (showTierAssignment) {
    return (
      <div className="min-h-screen bg-primary-black-950 py-12">
        <TierAssignment
          cards={revealedItems.filter(item => item.type === 'player')}
          tierConfig={tierConfig}
          onConfirm={handleTierAssignments}
        />
      </div>
    )
  }

  // Show card reveal screen
  if (showCardReveal) {
    return (
      <div className="min-h-screen bg-primary-black-950 py-12">
        <div className="max-w-7xl mx-auto">
          <CardReveal 
            items={revealedItems} 
            onRevealComplete={handleRevealComplete}
            isStarterPack={pack?.pack?.pack_type === 'starter'}
            tierConfig={tierConfig}
          />

          {/* Continue Button */}
          {allCardsRevealed && (
            <div className="text-center mt-12 animate-fade-in">
              {needsTierAssignment ? (
                <div className="space-y-4">
                  <p className="text-primary-black-300 text-lg mb-4">
                    Your starter pack includes tier boosts! Assign them to your best players.
                  </p>
                  <button
                    onClick={handleProceedToTierAssignment}
                    className="px-8 py-4 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 text-xl font-bold rounded-xl transition-all shadow-glow-green hover:scale-105"
                  >
                    Assign Tiers →
                  </button>
                </div>
              ) : (
                <div className="flex gap-4 justify-center flex-wrap">
                  <button
                    onClick={goToDashboard}
                    className="px-8 py-4 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 text-xl font-bold rounded-xl transition-all shadow-glow-green hover:scale-105"
                  >
                    Continue to Dashboard
                  </button>
                  <button
                    onClick={() => navigate(`/teams/${teamId}/pack-shop`)}
                    className="px-8 py-4 bg-primary-black-700 hover:bg-primary-black-600 text-primary-black-50 text-xl font-bold rounded-xl transition-all hover:scale-105"
                  >
                    Back to Pack Shop
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Show pack animation and opening
  return (
    <div className="min-h-screen bg-primary-black-950">
      {showPackAnimation && !opening ? (
        <PackAnimation 
          pack={pack} 
          onOpenComplete={openPack}
        />
      ) : (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <div className="mt-6 text-2xl font-bold text-primary-green-400 animate-pulse">
              Opening your pack...
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
