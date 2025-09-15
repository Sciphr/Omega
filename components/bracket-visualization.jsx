"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  SingleEliminationBracket,
  DoubleEliminationBracket,
  createTheme,
} from "@g-loot/react-tournament-brackets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trophy, Clock, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

// Best of X utility functions
const isSeriesFormat = (matchFormat) => {
  return matchFormat === 'bo3' || matchFormat === 'bo5'
}

const getSeriesScoreDisplay = (match) => {
  if (!isSeriesFormat(match.match_format)) {
    return {
      participant1Score: (match.participant1_score !== null && match.participant1_score !== undefined) ? String(match.participant1_score) : null,
      participant2Score: (match.participant2_score !== null && match.participant2_score !== undefined) ? String(match.participant2_score) : null
    }
  }

  // Handle Best of X series
  if (match.score && match.score.format && match.score.overall) {
    const overall = match.score.overall
    return {
      participant1Score: String(overall.participant1_wins || 0),
      participant2Score: String(overall.participant2_wins || 0),
      isSeriesInProgress: overall.status === 'in_progress',
      seriesStatus: overall.status
    }
  }

  // Legacy format - use participant scores as series wins
  return {
    participant1Score: (match.participant1_score !== null && match.participant1_score !== undefined) ? String(match.participant1_score) : null,
    participant2Score: (match.participant2_score !== null && match.participant2_score !== undefined) ? String(match.participant2_score) : null,
    isSeriesInProgress: match.status === 'in_progress' && (match.participant1_score > 0 || match.participant2_score > 0),
    seriesStatus: match.status
  }
}

// CSS to override any library constraints

// Transform generated double elimination bracket structure (for preview)
function transformGeneratedDoubleElimination(bracket) {

  const winnerMatches = [];
  const loserMatches = [];

  // Process winner bracket
  if (bracket.winnerBracket && bracket.winnerBracket.rounds) {
    const rounds = bracket.winnerBracket.rounds;

    for (let roundIndex = 0; roundIndex < rounds.length; roundIndex++) {
      const round = rounds[roundIndex];

      round.matches.forEach((match, matchIndex) => {
        // Calculate next match ID for winner bracket
        let nextMatchId = null;
        if (roundIndex < rounds.length - 1) {
          // Not the final round, advance to next winner bracket round
          const nextRound = rounds[roundIndex + 1];
          const nextMatchIndex = Math.floor(matchIndex / 2);
          nextMatchId = `winner-${nextRound.roundNumber}-${nextMatchIndex + 1}`;
        } else {
          // Winner bracket final goes to grand finals
          nextMatchId = "grand-final";
        }

        // Calculate next looser match ID - this is crucial for proper bracket flow
        let nextLooserMatchId = null;
        if (bracket.loserBracket && bracket.loserBracket.length > 0) {
          // First round losers go to first round of loser bracket
          // Later round losers get inserted into loser bracket at appropriate points
          if (roundIndex === 0) {
            // First round: losers go to loser bracket round 1
            // But they get paired differently in loser bracket
            nextLooserMatchId = `loser-1-1`;
          } else {
            // Later rounds: losers go to later loser bracket rounds
            // This creates the alternating pattern
            const loserRoundNumber = roundIndex + 1;
            nextLooserMatchId = `loser-${loserRoundNumber}-1`;
          }
        }

        const matchData = {
          id: `winner-${round.roundNumber}-${match.matchNumber}`,
          name: `WB ${match.matchNumber}`,
          nextMatchId,
          nextLooserMatchId,
          tournamentRoundText: `Winner Round ${round.roundNumber}`,
          startTime: null,
          state: "SCHEDULED",
          participants: [
            {
              id: match.participant1?.id || `p1-winner-${round.roundNumber}-${match.matchNumber}`,
              resultText: null,
              isWinner: false,
              status: match.participant1 ? "PLAYED" : "NO_SHOW",
              name: match.participant1?.participantName || match.participant1?.participant_name || match.participant1?.name || "TBD",
            },
            {
              id: match.participant2?.id || `p2-winner-${round.roundNumber}-${match.matchNumber}`,
              resultText: null,
              isWinner: false,
              status: match.participant2 ? "PLAYED" : "NO_SHOW",
              name: match.participant2?.participantName || match.participant2?.participant_name || match.participant2?.name || "TBD",
            }
          ],
          // Store original match data for click handling
          originalMatch: match
        };

        winnerMatches.push({ ...matchData, round: round.roundNumber });
      });
    }
  }

  // Process loser bracket
  if (bracket.loserBracket && Array.isArray(bracket.loserBracket)) {
    for (let roundIndex = 0; roundIndex < bracket.loserBracket.length; roundIndex++) {
      const round = bracket.loserBracket[roundIndex];

      round.matches.forEach((match, matchIndex) => {
        // Calculate next match ID for loser bracket
        let nextMatchId = null;
        if (roundIndex < bracket.loserBracket.length - 1) {
          // Not the final loser round, advance to next loser bracket round
          const nextRound = bracket.loserBracket[roundIndex + 1];
          const nextMatchIndex = Math.floor(matchIndex / 2);
          nextMatchId = `loser-${nextRound.roundNumber}-${Math.max(nextMatchIndex, 0) + 1}`;
        } else {
          // Final loser round goes to grand finals
          nextMatchId = "grand-final";
        }

        const matchData = {
          id: `loser-${round.roundNumber}-${match.matchNumber}`,
          name: `LB ${match.matchNumber}`,
          nextMatchId,
          nextLooserMatchId: null, // Loser bracket has no losers bracket
          tournamentRoundText: `Loser Round ${round.roundNumber}`,
          startTime: null,
          state: "SCHEDULED",
          participants: [
            {
              id: match.participant1?.id || `p1-loser-${round.roundNumber}-${match.matchNumber}`,
              resultText: null,
              isWinner: false,
              status: "NO_SHOW",
              name: "TBD",
            },
            {
              id: match.participant2?.id || `p2-loser-${round.roundNumber}-${match.matchNumber}`,
              resultText: null,
              isWinner: false,
              status: "NO_SHOW",
              name: "TBD",
            }
          ],
          // Store original match data for click handling
          originalMatch: match
        };

        loserMatches.push({ ...matchData, round: round.roundNumber });
      });
    }
  }

  // Process grand finals
  let grandFinalMatch = null;
  if (bracket.grandFinals) {
    grandFinalMatch = {
      id: "grand-final",
      name: "Grand Final",
      nextMatchId: null, // Grand finals is the final match
      nextLooserMatchId: null,
      tournamentRoundText: "Grand Finals",
      startTime: null,
      state: "SCHEDULED",
      participants: [
        {
          id: "p1-grand-final",
          resultText: null,
          isWinner: false,
          status: "NO_SHOW",
          name: "Winner Bracket Champion",
        },
        {
          id: "p2-grand-final",
          resultText: null,
          isWinner: false,
          status: "NO_SHOW",
          name: "Loser Bracket Champion",
        }
      ],
      // Store original match data for click handling
      originalMatch: bracket.grandFinals
    };
  }

  // Add grand finals to the end of upper bracket (as per library examples)
  if (grandFinalMatch) {
    winnerMatches.push(grandFinalMatch);
  }

  const result = {
    upper: winnerMatches,
    lower: loserMatches
  };

  return result;
}

// Transform double elimination matches into the format expected by g-loot package
function transformDoubleEliminationMatches(bracket, tournament) {
  // Handle generated double elimination bracket structure (preview)
  if (bracket.winnerBracket && bracket.loserBracket) {
    return transformGeneratedDoubleElimination(bracket);
  }

  // Handle database matches structure (in-progress/completed tournaments)
  if (!bracket || !bracket.rounds || !Array.isArray(bracket.rounds)) {
    return [];
  }

  // Separate matches by bracket type
  const winnerMatches = [];
  const loserMatches = [];
  let grandFinalMatch = null;

  try {
    // Group all matches by bracket type
    bracket.rounds.forEach((round, roundIndex) => {
      if (!round.matches || !Array.isArray(round.matches)) {
        console.warn('Round has no matches array:', round);
        return;
      }

      console.log(`Round ${roundIndex + 1} matches:`, round.matches);

      round.matches.forEach((match, matchIndex) => {
      const matchData = {
        id: match.id || `${round.roundNumber}-${match.matchNumber}`,
        name: `${match.matchNumber || 1}`,
        nextMatchId: null,
        nextLooserMatchId: null,
        participants: [
          {
            id: match.participant1?.id || `p1-${match.id}`,
            resultText: getSeriesScoreDisplay(match).participant1Score || null,
            isWinner: match.winner === match.participant1?.id,
            status: match.participant1 ? "PLAYED" : "NO_SHOW",
            name: match.participant1?.participantName || match.participant1?.participant_name || match.participant1?.name || "TBD",
          },
          {
            id: match.participant2?.id || `p2-${match.id}`,
            resultText: getSeriesScoreDisplay(match).participant2Score || null,
            isWinner: match.winner === match.participant2?.id,
            status: match.participant2 ? "PLAYED" : "NO_SHOW",
            name: match.participant2?.participantName || match.participant2?.participant_name || match.participant2?.name || "TBD",
          }
        ],
        state: match.status === "completed" ? "DONE" :
               (match.participant1 && match.participant2) ? "SCHEDULED" : "NO_PARTY"
      };

      // Sort into appropriate bracket based on bracket_type
      if (match.bracket_type === 'winner') {
        winnerMatches.push({ ...matchData, round: round.roundNumber });
      } else if (match.bracket_type === 'loser') {
        loserMatches.push({ ...matchData, round: round.roundNumber });
      } else if (match.bracket_type === 'grand_final') {
        grandFinalMatch = matchData;
      }
    });
  });

    // Add grand finals to the end of upper bracket (as per library examples)
    if (grandFinalMatch) {
      winnerMatches.push(grandFinalMatch);
    }

    const result = {
      upper: winnerMatches,
      lower: loserMatches
    };

    return result;

  } catch (error) {
    console.error('Error transforming double elimination matches:', error);
    return [];
  }
}

const bracketOverrideStyles = `
  .bracket .bracket-match {
    overflow: visible !important;
    height: auto !important;
    min-height: 130px !important;
  }
  .bracket .bracket-match > div {
    overflow: visible !important;
    height: auto !important;
  }
  /* Fix round headers to match app design */
  .bracket .bracket-round-title {
    background: linear-gradient(to right, hsl(var(--primary)), hsl(var(--primary) / 0.9)) !important;
    color: hsl(var(--primary-foreground)) !important;
    font-size: 14px !important;
    font-weight: 600 !important;
    padding: 12px 20px !important;
    border-radius: 8px !important;
    margin-bottom: 20px !important;
    text-align: center !important;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1) !important;
    border: 1px solid hsl(var(--primary) / 0.2) !important;
    font-family: inherit !important;
  }
  /* Override any svg clipping */
  .bracket svg {
    overflow: visible !important;
  }
  .bracket foreignObject {
    overflow: visible !important;
  }
`;

// Create a completely custom theme
const customTheme = createTheme({
  textColor: {
    main: "#0f172a",
    highlighted: "#1e293b",
    dark: "#64748b",
  },
  matchBackground: {
    wonColor: "transparent",
    lostColor: "transparent",
  },
  score: {
    background: {
      wonColor: "transparent",
      lostColor: "transparent",
    },
    text: {
      highlightedWonColor: "#1e3a8a",
      highlightedLostColor: "#64748b",
    },
  },
  border: {
    color: "transparent",
    highlightedColor: "transparent",
  },
  roundHeader: {
    backgroundColor: "#3b82f6",
    fontColor: "#ffffff",
  },
  connectorColor: "#cbd5e1",
  connectorColorHighlight: "#3b82f6",
  svgBackground: "transparent",
});

// Custom Match Component with full styling control
const CustomMatchComponent = ({ match, onMatchClick, topWon, bottomWon }) => {
  const participant1 = match.participants?.[0];
  const participant2 = match.participants?.[1];

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onMatchClick?.(match);
  };

  return (
    <div
      className="bracket-match cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-200 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-primary/20"
      onClick={handleClick}
      style={{
        width: "200px",
        padding: "8px",
        margin: "4px",
        fontFamily: "inherit",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        overflow: "visible"
      }}
    >
      {/* Match Header */}
      <div className="text-xs font-semibold text-center mb-2 text-slate-600 bg-slate-50 py-1 px-2 rounded-md">
        Match {match.name || match.id}
      </div>

      {/* Participants */}
      <div className="space-y-1 flex-1">
        {/* Participant 1 */}
        <div
          className={`flex justify-between items-center text-sm p-1.5 rounded-md transition-colors ${
            participant1?.isWinner
              ? "bg-green-50 border-2 border-green-300 font-bold text-green-900 shadow-sm"
              : participant1?.resultText && participant2?.resultText && !participant1?.isWinner && participant1?.resultText !== "NS" && participant2?.resultText !== "NS"
              ? "bg-red-50 border border-red-200 text-red-700 opacity-75"
              : "bg-slate-50 text-slate-700 hover:bg-slate-100"
          }`}
        >
          <span className="truncate flex-1 font-medium text-xs">
            {participant1?.name || "TBD"}
          </span>
          {participant1?.resultText && participant1.resultText !== "NS" && (
            <div
              className={`ml-2 px-1.5 py-0.5 rounded text-xs font-bold ${
                participant1?.isWinner
                  ? "bg-green-600 text-white"
                  : "bg-red-400 text-white"
              }`}
            >
              {participant1.resultText}
            </div>
          )}
        </div>

        {/* Participant 2 */}
        <div
          className={`flex justify-between items-center text-sm p-1.5 rounded-md transition-colors ${
            participant2?.isWinner
              ? "bg-green-50 border-2 border-green-300 font-bold text-green-900 shadow-sm"
              : participant2?.resultText && participant1?.resultText && !participant2?.isWinner && participant1?.resultText !== "NS" && participant2?.resultText !== "NS"
              ? "bg-red-50 border border-red-200 text-red-700 opacity-75"
              : "bg-slate-50 text-slate-700 hover:bg-slate-100"
          }`}
        >
          <span className="truncate flex-1 font-medium text-xs">
            {participant2?.name || "TBD"}
          </span>
          {participant2?.resultText && participant2.resultText !== "NS" && (
            <div
              className={`ml-2 px-1.5 py-0.5 rounded text-xs font-bold ${
                participant2?.isWinner
                  ? "bg-green-600 text-white"
                  : "bg-red-400 text-white"
              }`}
            >
              {participant2.resultText}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export function BracketVisualization({
  bracket,
  tournament,
  onMatchClick,
  onReportScore,
  currentUser,
  isAdmin = false,
}) {
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(0.8);

  // Transform our bracket data to the format expected by g-loot package
  const transformedMatches = useMemo(() => {
    if (!bracket) {
      return [];
    }

    // For double elimination, we need to create separate bracket structures
    if (tournament?.format === "double_elimination") {
      return transformDoubleEliminationMatches(bracket, tournament);
    }

    // For single elimination, check if rounds exist
    if (!bracket.rounds) {
      return [];
    }

    // Single elimination transformation
    const matches = [];
    const matchMap = new Map();

    // First pass: create all matches
    bracket.rounds.forEach((round, roundIndex) => {
      round.matches.forEach((match, matchIndex) => {
        const matchId = match.id || `${round.roundNumber}-${match.matchNumber}`;
        const transformedMatch = {
          id: matchId,
          name: `${match.matchNumber || matchIndex + 1}`,
          nextMatchId: null, // Will be set in second pass
          nextLooserMatchId: null,
          participants: [
            {
              id: match.participant1?.id || `p1-${matchId}`,
              resultText: getSeriesScoreDisplay(match).participant1Score || null,
              isWinner: match.winner === match.participant1?.id,
              status: match.participant1 ? "PLAYED" : "NO_SHOW",
              name:
                match.participant1?.participantName ||
                match.participant1?.participant_name ||
                match.participant1?.name ||
                "TBD",
            },
            {
              id: match.participant2?.id || `p2-${matchId}`,
              resultText: getSeriesScoreDisplay(match).participant2Score || null,
              isWinner: match.winner === match.participant2?.id,
              status: match.participant2 ? "PLAYED" : "NO_SHOW",
              name:
                match.participant2?.participantName ||
                match.participant2?.participant_name ||
                match.participant2?.name ||
                "TBD",
            },
          ],
          startTime: match.scheduled_time || match.scheduledTime,
          state: mapMatchStatus(match.status),
          tournamentRoundText: round.name || `Round ${round.roundNumber}`,
          roundIndex,
          matchIndex,
          // Store original match data for click handling
          originalMatch: match,
        };
        matches.push(transformedMatch);
        matchMap.set(matchId, transformedMatch);
      });
    });

    // Second pass: set up next match relationships for proper bracket connections
    bracket.rounds.forEach((round, roundIndex) => {
      if (roundIndex < bracket.rounds.length - 1) {
        const nextRound = bracket.rounds[roundIndex + 1];
        round.matches.forEach((match, matchIndex) => {
          const matchId =
            match.id || `${round.roundNumber}-${match.matchNumber}`;
          const currentMatch = matchMap.get(matchId);

          // Calculate which match in the next round this feeds into
          const nextMatchIndex = Math.floor(matchIndex / 2);
          if (nextRound.matches[nextMatchIndex]) {
            const nextMatchId =
              nextRound.matches[nextMatchIndex].id ||
              `${nextRound.roundNumber}-${nextRound.matches[nextMatchIndex].matchNumber}`;
            currentMatch.nextMatchId = nextMatchId;
          }
        });
      }
    });

    return matches;
  }, [bracket]);

  const handleMatchClick = (match) => {
    setSelectedMatch(match.originalMatch || match);
    onMatchClick?.(match.originalMatch || match);
  };

  const handleDialogClose = () => {
    setSelectedMatch(null);
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev * 1.2, 2));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev / 1.2, 0.3));
  };

  const handleReset = () => {
    setZoomLevel(0.8);
  };


  // Check for valid bracket data based on tournament format
  const hasValidBracketData = tournament?.format === "double_elimination"
    ? (bracket && (bracket.winnerBracket || bracket.loserBracket))
    : (bracket && bracket.rounds);

  if (!hasValidBracketData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No bracket data available</p>
          <p className="text-xs text-muted-foreground mt-2">
            Debug: bracket={bracket ? 'exists' : 'null'},
            rounds={bracket?.rounds ? 'exists' : 'null'},
            format={tournament?.format},
            winnerBracket={bracket?.winnerBracket ? 'exists' : 'null'}
          </p>
        </div>
      </div>
    );
  }

  if (!transformedMatches) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Error transforming match data</p>
          <p className="text-xs text-muted-foreground mt-2">
            transformedMatches is {typeof transformedMatches}
          </p>
        </div>
      </div>
    );
  }

  // Determine bracket component based on actual tournament format
  const BracketComponent = tournament?.format === "double_elimination"
    ? DoubleEliminationBracket
    : SingleEliminationBracket;

  return (
    <div className="w-full h-full">
      <style dangerouslySetInnerHTML={{ __html: bracketOverrideStyles }} />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="h-5 w-5" />
            <span>Tournament Bracket</span>
            <Badge variant="outline">
              {tournament?.format === "double_elimination"
                ? "Double Elimination"
                : "Single Elimination"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Zoom Controls */}
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 2}
            >
              <ZoomIn className="h-4 w-4 mr-1" />
              Zoom In
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.3}
            >
              <ZoomOut className="h-4 w-4 mr-1" />
              Zoom Out
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
            <span className="text-sm text-muted-foreground ml-2">
              Zoom: {Math.round(zoomLevel * 100)}%
            </span>
          </div>

          {/* Bracket Container */}
          <div
            className="border border-slate-200 rounded-lg overflow-auto bg-slate-50/30"
            style={{ height: "700px" }}
          >
            <div
              className="bracket"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: "top left",
                width: `${100 / zoomLevel}%`,
                height: `${100 / zoomLevel}%`,
                minWidth: "fit-content",
                padding: "24px",
              }}
            >
              {tournament?.format === "double_elimination" ? (
                <DoubleEliminationBracket
                  matches={transformedMatches}
                  matchComponent={CustomMatchComponent}
                  theme={customTheme}
                  onMatchClick={handleMatchClick}
                />
              ) : (
                <SingleEliminationBracket
                  matches={transformedMatches}
                  matchComponent={CustomMatchComponent}
                  theme={customTheme}
                  onMatchClick={handleMatchClick}
                  onPartyClick={(party, partyWon) => {
                    console.log("Party clicked:", party, "Won:", partyWon);
                  }}
                  options={{
                    style: {
                      roundHeader: {
                        backgroundColor: "#3b82f6",
                        color: "white",
                      },
                    },
                  }}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Match Details Dialog */}
      {selectedMatch && (
        <Dialog
          open={true}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              handleDialogClose();
            }
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Match Details</DialogTitle>
              <DialogDescription>
                Match {selectedMatch?.matchNumber || ""} Information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">
                      {selectedMatch.participant1?.participantName ||
                        selectedMatch.participant1?.participant_name ||
                        "TBD"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-center">
                      {getSeriesScoreDisplay(selectedMatch).participant1Score ?? "-"}
                    </div>
                    {selectedMatch.winner && selectedMatch.winner === selectedMatch.participant1?.id && (
                      <Badge className="w-full justify-center mt-2">
                        Winner
                      </Badge>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">
                      {selectedMatch.participant2?.participantName ||
                        selectedMatch.participant2?.participant_name ||
                        "TBD"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-center">
                      {getSeriesScoreDisplay(selectedMatch).participant2Score ?? "-"}
                    </div>
                    {selectedMatch.winner && selectedMatch.winner === selectedMatch.participant2?.id && (
                      <Badge className="w-full justify-center mt-2">
                        Winner
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Status:</span>
                  <Badge variant="outline">
                    {selectedMatch.status || "Pending"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Match Number:</span>
                  <span>{selectedMatch.matchNumber}</span>
                </div>
                {selectedMatch.scheduled_time && (
                  <div className="flex justify-between">
                    <span className="font-medium">Scheduled:</span>
                    <span>
                      {new Date(selectedMatch.scheduled_time).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {selectedMatch?.id && tournament?.status === 'in_progress' ? (
                  <Link href={`/match/${selectedMatch.id}`} className="flex-1">
                    <Button className="w-full">
                      <Clock className="h-4 w-4 mr-2" />
                      View Match
                    </Button>
                  </Link>
                ) : (
                  <Button
                    className="w-full"
                    disabled
                    title="Match not available yet - tournament must be started first"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    View Match
                  </Button>
                )}
              </div>

              {/* Best of X Games Details */}
              {isSeriesFormat(selectedMatch.match_format) && selectedMatch.score && selectedMatch.score.games && (
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3 flex items-center">
                    <Trophy className="h-4 w-4 mr-2" />
                    Individual Games ({selectedMatch.match_format.toUpperCase()})
                  </h4>
                  <div className="space-y-2">
                    {selectedMatch.score.games.filter(g => g.status === 'completed').map((game) => (
                      <div key={game.game_number} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                        <span className="font-medium">Game {game.game_number}</span>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm">{game.participant1_score} - {game.participant2_score}</span>
                          <Badge variant="outline" className="text-xs">
                            {game.winner_id === selectedMatch.participant1_id ?
                              selectedMatch.participant1?.participant_name || selectedMatch.participant1?.participantName :
                              selectedMatch.participant2?.participant_name || selectedMatch.participant2?.participantName
                            } wins
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  {getSeriesScoreDisplay(selectedMatch).isSeriesInProgress && (
                    <div className="mt-2 text-center text-sm text-blue-600">
                      Series in progress - First to {selectedMatch.match_format === 'bo3' ? '2' : '3'} wins
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 border-t">
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleDialogClose}
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Helper function to map our match status to the package's expected status
function mapMatchStatus(status) {
  switch (status) {
    case "completed":
      return "DONE";
    case "in_progress":
      return "WALK_OVER";
    case "scheduled":
      return "NO_SHOW";
    default:
      return "NO_SHOW";
  }
}
