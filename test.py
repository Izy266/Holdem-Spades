def distribute_winnings(max_wins, scores, pot):
    winnings = {}
    while pot:
        high_score = max(scores.values())
        winners = [player for player, score in scores.items() if score == high_score]
        player = winners[0]
        win = min(max_wins[player], pot//len(winners))
        winnings[player] = win
        scores[player] = -1
        pot -= win
    
    return winnings

max_wins = {'Danny': 400, 'Andy': 400, 'Bob': 550, 'Clara': 900}
scores = {'Andy': 5, 'Bob': 5, 'Clara': 3, 'Danny': 5}
pot = 900

print(distribute_winnings(max_wins, scores, pot))
