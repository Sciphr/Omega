import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { TournamentManager } from '@/lib/bracket-utils'
import { generateSmartSeeding } from '@/lib/smart-seeding'

export async function POST(request, { params }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    const tournamentId = params.id
    const rebalanceData = await request.json()

    // Get tournament details
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single()

    if (tournamentError) {
      return NextResponse.json({
        success: false,
        error: 'Tournament not found'
      }, { status: 404 })
    }

    // Verify permissions
    if (tournament.creator_id !== user.id) {
      return NextResponse.json({
        success: false,
        error: 'Only tournament creator can rebalance tournament'
      }, { status: 403 })
    }

    // Only allow rebalancing during registration phase
    if (tournament.status !== 'registration') {
      return NextResponse.json({
        success: false,
        error: 'Tournament can only be rebalanced during registration phase'
      }, { status: 400 })
    }

    // Get current participants
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('status', 'active')

    if (participantsError) {
      throw new Error('Failed to get participants')
    }

    if (participants.length < 2) {
      return NextResponse.json({
        success: false,
        error: 'Need at least 2 participants to rebalance'
      }, { status: 400 })
    }

    // Apply new seeding algorithm
    const newSeedingType = rebalanceData.seedingType || tournament.seeding_type
    const options = {
      preserveTopSeeds: rebalanceData.preserveTopSeeds || false,
      randomnessFactor: rebalanceData.randomnessFactor || 0.1
    }

    let rebalancedParticipants

    if (['ai_optimized', 'recent_performance', 'skill_balanced'].includes(newSeedingType)) {
      // Use smart seeding algorithms
      rebalancedParticipants = await generateSmartSeeding(
        participants,
        newSeedingType,
        tournament.game,
        options
      )
    } else {
      // Use traditional seeding algorithms
      rebalancedParticipants = TournamentManager.seedParticipants(
        participants,
        newSeedingType,
        tournament.game,
        options
      )
    }

    // Update participant seeds in database
    const updatePromises = rebalancedParticipants.map((participant, index) => {
      return supabase
        .from('participants')
        .update({
          seed: index + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', participant.id)
    })

    const updateResults = await Promise.all(updatePromises)

    // Check for any update errors
    const updateErrors = updateResults.filter(result => result.error)
    if (updateErrors.length > 0) {
      console.error('Some participant updates failed:', updateErrors)
      return NextResponse.json({
        success: false,
        error: 'Failed to update some participant seeds'
      }, { status: 500 })
    }

    // Update tournament seeding type if changed
    if (newSeedingType !== tournament.seeding_type) {
      const { error: tournamentUpdateError } = await supabase
        .from('tournaments')
        .update({
          seeding_type: newSeedingType,
          updated_at: new Date().toISOString()
        })
        .eq('id', tournamentId)

      if (tournamentUpdateError) {
        console.error('Failed to update tournament seeding type:', tournamentUpdateError)
      }
    }

    // Record the rebalance event
    const { error: eventError } = await supabase
      .from('match_events')
      .insert({
        match_id: null, // Tournament-level event
        event_type: 'tournament_rebalance',
        participant_id: null,
        event_data: {
          oldSeedingType: tournament.seeding_type,
          newSeedingType: newSeedingType,
          participantCount: participants.length,
          options: options,
          timestamp: new Date().toISOString()
        },
        created_by: user.id
      })

    if (eventError) {
      console.error('Error recording rebalance event:', eventError)
    }

    return NextResponse.json({
      success: true,
      message: 'Tournament rebalanced successfully',
      rebalanceSummary: {
        participantCount: participants.length,
        oldSeedingType: tournament.seeding_type,
        newSeedingType: newSeedingType,
        seedChanges: rebalancedParticipants.map((p, index) => ({
          participantId: p.id,
          participantName: p.participant_name,
          oldSeed: p.seed,
          newSeed: index + 1
        })).filter(change => change.oldSeed !== change.newSeed)
      }
    })

  } catch (error) {
    console.error('Tournament rebalance error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}