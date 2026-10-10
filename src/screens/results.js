// Stage two integration keeps identity across Play Again; Next Player resets it.
export function resultsActions(player, { startRound, showLanding, showLeaderboard }) {
  return {
    playAgain: () => startRound(player),
    nextPlayer: () => showLanding({ resetPlayer: true }),
    leaderboard: () => showLeaderboard({ currentPlayerId: player.playerId })
  };
}
