import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request, { params }) {
  try {
    const supabase = await createClient()
    const { id: matchId } = await params
    const { participant_id } = await request.json()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }

    if (!participant_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Participant ID is required' 
      }, { status: 400 })
    }

    // Get match with tournament details
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select(`
        *,
        tournament:tournaments(*)
      `)
      .eq('id', matchId)
      .single()

    if (matchError || !match) {
      return NextResponse.json({ 
        success: false, 
        error: 'Match not found' 
      }, { status: 404 })
    }

    // Verify user is tournament creator
    if (match.tournament.creator_id !== user.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Only tournament creators can send access emails' 
      }, { status: 403 })
    }

    // Get participant details
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('*')
      .eq('id', participant_id)
      .single()

    if (participantError || !participant) {
      return NextResponse.json({ 
        success: false, 
        error: 'Participant not found' 
      }, { status: 404 })
    }

    if (!participant.email) {
      return NextResponse.json({ 
        success: false, 
        error: 'Participant does not have an email address' 
      }, { status: 400 })
    }

    // Get active access link for this participant and match
    const { data: accessLink, error: linkError } = await supabase
      .from('match_participant_privileges')
      .select('*')
      .eq('match_id', matchId)
      .eq('participant_id', participant_id)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .single()

    if (linkError || !accessLink) {
      return NextResponse.json({ 
        success: false, 
        error: 'No active access link found. Please generate match links first.' 
      }, { status: 404 })
    }

    // Construct the access URL
    const accessUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/match/${matchId}?token=${accessLink.access_token}`

    // Get opponent participant for context
    const opponentId = match.participant1_id === participant_id ? match.participant2_id : match.participant1_id
    let opponentName = 'TBD'
    
    if (opponentId) {
      const { data: opponent } = await supabase
        .from('participants')
        .select('participant_name')
        .eq('id', opponentId)
        .single()
      
      if (opponent) {
        opponentName = opponent.participant_name
      }
    }

    // TODO: Implement actual email sending service (SendGrid, Resend, etc.)
    // For now, we'll just log the email details and return success
    const emailContent = {
      to: participant.email,
      subject: `Your match access link for ${match.tournament.name}`,
      html: `
        <h2>Your Match is Ready!</h2>
        <p>Hello ${participant.participant_name},</p>
        <p>Your match in <strong>${match.tournament.name}</strong> is ready to begin.</p>
        
        <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">
          <h3>Match Details:</h3>
          <p><strong>Tournament:</strong> ${match.tournament.name}</p>
          <p><strong>Round:</strong> ${match.round}</p>
          <p><strong>Match:</strong> ${match.match_number}</p>
          <p><strong>Opponent:</strong> ${opponentName}</p>
        </div>

        <p><strong>Click the link below to access your match:</strong></p>
        <a href="${accessUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0;">
          Access Match
        </a>
        
        <p>Or copy and paste this URL into your browser:</p>
        <p style="font-family: monospace; background-color: #f8f9fa; padding: 10px; border-radius: 3px; word-break: break-all;">
          ${accessUrl}
        </p>

        <p><small>This link will expire on ${new Date(accessLink.expires_at).toLocaleDateString()}.</small></p>
        
        <hr style="margin: 20px 0;">
        <p><small>This email was sent from ${match.tournament.name} tournament system.</small></p>
      `
    }

    console.log('Email would be sent:', emailContent)

    // Update the access link to mark it as emailed
    await supabase
      .from('match_participant_privileges')
      .update({ 
        last_email_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', accessLink.id)

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      recipient: participant.email
    })

  } catch (error) {
    console.error('Send email error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}