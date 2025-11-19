import { useState, useEffect } from 'react'
import { useNavigate, useParams, useRevalidator } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { useToast } from '../contexts/ToastContext'
import LoadingSpinner from '../components/LoadingSpinner'
import TierAssignment from '../components/TierAssignment'

export default function PackOpening() {
  const navigate = useNavigate()
  const revalidator = useRevalidator()
  const { teamId, packId } = useParams()
  const { success, error: showError } = useToast()
  
  const [pack, setPack] = useState(null)
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState(false)
  const [opened, setOpened] = useState(false)
  const [revealedItems, setRevealedItems] = useState([])
  const [flippedCards, setFlippedCards] = useState(new Set())
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
    
    // Animate pack opening
    setTimeout(async () => {
      try {
        // Call the Edge Function to open the pack (initial call without tier assignments)
        // Use pack.pack_id (reference to packs table), NOT pack.id (user_packs table id)
        const { data, error } = await supabase.functions.invoke('open-pack', {
          body: {
            pack_id: pack.pack_id,  // This is the ID from the packs table
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

        // Check if this is a starter pack that needs tier assignment
        if (data.needs_tier_assignment) {
          console.log('Starter pack data received:', data)
          console.log('Players:', data.contents.players)
          console.log('Tokens:', data.contents.tokens)
          
          setNeedsTierAssignment(true)
          setTierConfig(data.tier_config)
          setUnassignedCards(data.contents.players)
          setPackTokens(data.contents.tokens)
          
          // Show cards as revealed items for flipping
          const players = data.contents.players.map(player => ({
            type: 'player',
            data: player
          }))
          
          const tokens = data.contents.tokens.map(token => ({
            type: 'token',
            data: token
          }))
          
          setRevealedItems([...players, ...tokens])
          setOpened(true)
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
        setOpened(true)
        success(data.message || 'Pack opened!')
      } catch (error) {
        console.error('Error opening pack:', error)
        showError(error.message || 'Failed to open pack')
      } finally {
        setOpening(false)
      }
    }, 2000) // 2 second animation
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
      
      // Insert players with tier assignments
      for (const assignment of tierAssignments) {
        console.log('Inserting player:', assignment.player_card_id, 'with tier:', assignment.tier)
        const tier = assignment.tier || 'base'
        const tierLevels = {
          'base': 1,
          'role_player': 3,
          'starter': 5,
          'all_star': 7,
          'elite': 9
        }
        const startingLevel = tierLevels[tier] || 1

        // Insert player to inventory
        const { error: inventoryError } = await supabase.rpc('insert_player_to_inventory', {
          p_user_id: user.id,
          p_team_id: teamId,
          p_player_card_id: assignment.player_card_id,
          p_card_level: startingLevel,
          p_card_tier: tier,
          p_experience_points: 0
        })

        if (inventoryError) {
          console.error('Error inserting player:', inventoryError)
          throw new Error(`Failed to add player to inventory: ${inventoryError.message}`)
        }
      }

      // Insert tokens
      console.log('Inserting tokens, count:', packTokens.length)
      for (const token of packTokens) {
        console.log('Inserting token:', token.id, token.token_name)
        const { error: tokenError } = await supabase.rpc('insert_token_to_inventory', {
          p_user_id: user.id,
          p_team_id: teamId,
          p_token_card_id: token.id
        })

        if (tokenError) {
          console.error('Error inserting token:', tokenError)
          throw new Error(`Failed to add token to inventory: ${tokenError.message}`)
        }
      }

      // Mark pack as opened
      await supabase
        .from('user_packs')
        .update({ 
          is_opened: true, 
          opened_at: new Date().toISOString() 
        })
        .eq('id', packId)

      setNeedsTierAssignment(false)
      success('Tiers assigned successfully! Set your starting lineup.')
      
      // Revalidate to refresh context inventory before navigation
      console.log('🔄 Revalidating router data to refresh inventory...');
      revalidator.revalidate();
      
      // Small delay to allow revalidation to complete
      setTimeout(() => {
        navigate(`/teams/${teamId}/starting-lineup`);
      }, 100);
    } catch (error) {
      console.error('Error assigning tiers:', error)
      showError(error.message || 'Failed to assign tiers')
    } finally {
      setOpening(false)
      setIsProcessingTiers(false)
    }
  }

  const handleCardFlip = (index) => {
    setFlippedCards(prev => {
      const newSet = new Set(prev)
      newSet.add(index)
      return newSet
    })
  }

  const allCardsFlipped = flippedCards.size === revealedItems.length

  const handleProceedToTierAssignment = () => {
    setShowTierAssignment(true)
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

  if (!pack) return null

  // Show tier assignment screen after cards are flipped
  if (showTierAssignment && needsTierAssignment && tierConfig && unassignedCards.length > 0) {
    return (
      <TierAssignment
        cards={unassignedCards}
        tierConfig={tierConfig}
        onConfirm={handleTierAssignments}
      />
    )
  }

  return (
    <div className="min-h-screen bg-primary-black-950 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {!opened ? (
          // Unopened Pack View
          <div className="flex flex-col items-center justify-center min-h-[80vh]">
            <div className={`transition-all duration-500 ${opening ? 'scale-110 animate-pulse' : ''}`}>
              <div className="relative">
                {/* Pack Card */}
                <div className="w-80 h-96 bg-gradient-to-br from-primary-green-500 via-primary-green-600 to-primary-green-700 rounded-2xl shadow-glow-green border-4 border-primary-green-400 p-8 flex flex-col items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">📦</div>
                    <h2 className="text-3xl font-bold text-white mb-2">
                      {pack.pack.pack_name}
                    </h2>
                    <p className="text-primary-black-50 text-sm mb-6">
                      {pack.pack.description}
                    </p>
                    
                    <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
                      <div className="text-white font-bold mb-2">Contains:</div>
                      <div className="text-primary-black-50 text-sm space-y-1">
                        <div>🏈 {pack.pack.player_count} Players</div>
                        <div>🎯 {pack.pack.token_count} Tokens</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sparkles Effect */}
                {opening && (
                  <div className="absolute inset-0 pointer-events-none">
                    {[...Array(20)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute text-2xl animate-ping"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                          animationDelay: `${Math.random() * 0.5}s`,
                          animationDuration: '1s'
                        }}
                      >
                        ✨
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {!opening && (
              <button
                onClick={openPack}
                className="mt-12 px-8 py-4 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 text-xl font-bold rounded-xl transition-all shadow-glow-green hover:scale-105"
              >
                Open Pack
              </button>
            )}

            {opening && (
              <div className="mt-12 text-center">
                <div className="text-2xl font-bold text-primary-green-400 animate-pulse">
                  Opening Pack...
                </div>
              </div>
            )}
          </div>
        ) : (
          // Revealed Items View
          <div>
            <div className="text-center mb-8">
              <p className="text-xl text-primary-black-300 mb-4">
                Click each card to reveal what you got!
              </p>
              <button
                onClick={() => {
                  const allIndices = new Set(Array.from({ length: revealedItems.length }, (_, i) => i))
                  setFlippedCards(allIndices)
                }}
                disabled={allCardsFlipped}
                className="px-6 py-2 bg-primary-green-500 hover:bg-primary-green-400 disabled:bg-primary-black-700 disabled:text-primary-black-500 text-primary-black-950 font-bold rounded-lg transition-all"
              >
                Flip All Cards
              </button>
            </div>

            {/* Revealed Items Grid - Using lineup card style */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
              {revealedItems.map((item, index) => (
                <div
                  key={index}
                  className="relative w-full aspect-[3.2/5]"
                  style={{ perspective: '1000px' }}
                >
                  <div
                    className={`
                      relative w-full h-full transition-transform duration-700 cursor-pointer
                      ${flippedCards.has(index) ? '[transform:rotateY(180deg)]' : ''}
                    `}
                    style={{ transformStyle: 'preserve-3d' }}
                    onClick={() => handleCardFlip(index)}
                  >
                    {/* Card Back */}
                    <div
                      className="absolute inset-0 rounded-xl border-2 border-primary-black-600 bg-gradient-to-br from-primary-black-800 via-primary-black-750 to-primary-black-800 flex items-center justify-center"
                      style={{ backfaceVisibility: 'hidden' }}
                    >
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary-black-700 border-2 border-primary-black-600 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-primary-black-600"></div>
                        </div>
                        <div className="text-primary-black-500 font-bold text-xs uppercase tracking-wider">
                          YAP Sports
                        </div>
                      </div>
                    </div>

                    {/* Card Front */}
                    <div
                      className="absolute inset-0"
                      style={{ 
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)'
                      }}
                    >
                      {item.type === 'player' ? (
                        // Player Card - Same style as lineup
                        <div className="relative rounded-xl border-2 border-primary-black-600 bg-primary-black-800/50 w-full h-full">
                          <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                            <span className="text-xs font-bold text-primary-black-400 uppercase tracking-wide">
                              {item.data.position === 'Quarterback' ? 'QB' :
                               item.data.position === 'Running Back' ? 'RB' :
                               item.data.position === 'Wide Receiver' ? 'WR' :
                               item.data.position === 'Tight End' ? 'TE' :
                               item.data.position === 'Kicker' ? 'K' :
                               item.data.position === 'Defense' ? 'DEF' : item.data.position}
                            </span>
                          </div>
                          <div className="absolute inset-0 flex flex-col">
                            <div className="relative w-full h-full">
                              <div className="relative flex flex-col border-2 border-gray-600 rounded-lg h-full p-2 pb-2 absolute inset-0 rounded-xl">
                                <div className="flex-grow min-h-0"></div>
                                <div className="flex-shrink-0 flex justify-center mb-2 pointer-events-none"></div>
                                <div className="flex-shrink-0 mt-1 mb-1 px-1">
                                  <div className="text-sm font-bold text-primary-black-50 text-center leading-tight">
                                    {item.data.player_name}
                                  </div>
                                  <div className="flex items-center justify-center gap-1 mt-1">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-700 text-white">
                                      {item.data.tier || 'B'}
                                    </span>
                                    <span className="text-[10px] text-primary-black-400 font-medium">
                                      Level 1
                                    </span>
                                  </div>
                                </div>
                                <div className="mb-1 text-center flex-shrink-0">
                                  <div className="text-xs text-primary-black-400 font-semibold">
                                    {item.data.team || 'NFL'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Token Card - Same dark style as player cards
                        <div className="relative rounded-xl border-2 border-primary-black-600 bg-primary-black-800/50 w-full h-full">
                          <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                            <span className="text-xs font-bold text-primary-black-400 uppercase tracking-wide">
                              TOKEN
                            </span>
                          </div>
                          <div className="absolute inset-0 flex flex-col">
                            <div className="relative w-full h-full">
                              <div className="relative flex flex-col border-2 border-gray-600 rounded-lg h-full p-2 pb-2 absolute inset-0 rounded-xl">
                                <div className="flex-grow min-h-0"></div>
                                <div className="flex-shrink-0 flex justify-center mb-2">
                                  <div className="w-10 h-10 flex items-center justify-center bg-primary-green-500/20 border-2 border-primary-green-500/50 rounded-full shadow-lg">
                                    <span className="text-xl">🎯</span>
                                  </div>
                                </div>
                                <div className="flex-shrink-0 mt-1 mb-1 px-1">
                                  <div className="text-sm font-bold text-primary-black-50 text-center leading-tight">
                                    {item.data.token_name}
                                  </div>
                                  <div className="flex items-center justify-center gap-1 mt-1">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-700 text-white">
                                      {item.data.multiplier}x
                                    </span>
                                    <span className="text-[10px] text-primary-black-400 font-medium">
                                      Multiplier
                                    </span>
                                  </div>
                                </div>
                                <div className="mb-1 text-center flex-shrink-0">
                                  <div className="text-[10px] text-primary-black-400 font-semibold px-1">
                                    {item.data.condition?.stat && (
                                      <>
                                        {item.data.condition.stat.replace(/_/g, ' ').toUpperCase()} {item.data.condition.operator} {item.data.condition.value}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Continue Button */}
            {allCardsFlipped && (
              <div className="text-center animate-fade-in">
                {needsTierAssignment ? (
                  <div className="space-y-4">
                    <p className="text-dk-white-muted text-lg mb-4">
                      Your starter pack includes tier boosts! Assign them to your best players.
                    </p>
                    <button
                      onClick={handleProceedToTierAssignment}
                      className="px-8 py-4 bg-primary-green-500 hover:bg-primary-green-400 text-primary-black-950 text-xl font-bold rounded-xl transition-all shadow-glow-green hover:scale-105"
                    >
                      Assign Tiers
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-4 justify-center">
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
        )}
      </div>
    </div>
  )
}
