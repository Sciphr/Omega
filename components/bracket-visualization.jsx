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

// CSS to override any library constraints
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
    if (!bracket || !bracket.rounds) return [];

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
              resultText:
                match.participant1 && match.score
                  ? String(match.score[match.participant1.id] || "")
                  : null,
              isWinner: match.winner === match.participant1?.id,
              status: match.participant1 ? "PLAYED" : "NO_SHOW",
              name:
                match.participant1?.participantName ||
                match.participant1?.participant_name ||
                "TBD",
            },
            {
              id: match.participant2?.id || `p2-${matchId}`,
              resultText:
                match.participant2 && match.score
                  ? String(match.score[match.participant2.id] || "")
                  : null,
              isWinner: match.winner === match.participant2?.id,
              status: match.participant2 ? "PLAYED" : "NO_SHOW",
              name:
                match.participant2?.participantName ||
                match.participant2?.participant_name ||
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

  if (!bracket || !bracket.rounds || transformedMatches.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No bracket data available</p>
        </div>
      </div>
    );
  }

  const BracketComponent =
    tournament?.format === "double_elimination"
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
              <BracketComponent
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
                      fontColor: "#ffffff",
                      fontSize: 14,
                    },
                    connectorColor: "#cbd5e1",
                    connectorColorHighlight: "#3b82f6",
                  },
                  width: 250,
                  boxHeight: 150,
                  spacingY: 40,
                  matchMaxWidth: 250
                }}
              />
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
                      {selectedMatch.participant1 && selectedMatch.score
                        ? selectedMatch.score[selectedMatch.participant1.id] ||
                          "-"
                        : "-"}
                    </div>
                    {selectedMatch.winner ===
                      selectedMatch.participant1?.id && (
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
                      {selectedMatch.participant2 && selectedMatch.score
                        ? selectedMatch.score[selectedMatch.participant2.id] ||
                          "-"
                        : "-"}
                    </div>
                    {selectedMatch.winner ===
                      selectedMatch.participant2?.id && (
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
                {selectedMatch?.id ? (
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
