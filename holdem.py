import random
from collections import defaultdict

class Player:
    def __init__(self, name, id, balance):
        self.name = name
        self.id = id
        self.balance = balance
        self.hand = []
        self.bets = [0 for _ in range(4)]
        self.stake = 0
        self.score = [-1]
        self.moved = False
        self.live = True
        
class TexasHoldem:
    def __init__(self):
        self.players = []
        self.players_live = []
        self.deck = [(rank, suit) for suit in range(4) for rank in range(2, 15)]
        self.community_cards = []
        self.pot = 0
        self.button = 0 # to track sb_turn, bb_turn, and turn at new hand
        self.round = 0
        self.turn = 3 if len(self.players) > 2 else 2
        self.sb_turn = 1 if len(self.players) > 2 else 0
        self.bb_turn = 2 if len(self.players) > 2 else 1
        self.small_blind = 0
        self.big_blind = 0
        self.current_bet = 0
        self.round = 0
        self.creator_id = None
        self.hands = ['High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush']

    def deal_cards(self):
        random.shuffle(self.deck)
        for _ in range(2):
            for player in self.players:
                card = self.deck.pop()
                player.hand.append(card)

    def place_card(self):
        self.community_cards.append(self.deck.pop())
        
    # Checks if round is over
    def if_round_over(self):
        if not all(player.moved for player in self.players_live):
            return False
        
        max_bet, max_better, bets = 0, None, []
        for player in self.players_live:
            player.moved = False
            bet = player.bets[self.round]
            bets.append(bet)
            if bet > max_bet:
                max_bet, max_better = bet, player

        if bets.count(max_bet) == 1:
            bet_ceil = max([bet for bet in bets if bet != max_bet])
            diff = max_bet - bet_ceil
            max_better.bets[self.round] = bet_ceil
            max_better.balance += diff
            max_better.stake += diff
            
        self.turn = (self.button + 1) % len(self.active_players)
        self.current_bet = 0
        self.round += 1
        return True
    
    # Checks if the hand is over
    def if_hand_over(self):
        if len([player for player in self.players_live]) > 1 or self.round < 4:
            return False
        
        self.distribute_pot()
        self.new_hand()
        self.button += 1
        self.turn = self.button + 3 if len(self.players) > 2 else 2
        self.sb_turn = self.button + 1 if len(self.players) > 2 else 0
        self.bb_turn = self.button + 2 if len(self.players) > 2 else 1
        return True

    def new_hand(self):
        self.players_live = []
        for player in self.players:
            player.hand = []
            player.bets = [0 for _ in range(4)]
            player.stake = 0
            player.score = [-1]
            player.moved = False
            player.live = True
            if player.balance:
                self.players_live.append(player)

        self.deck = [(rank, suit) for suit in range(4) for rank in range(2, 15)]
        self.community_cards = []
        self.pot = 0
        self.round = 0

    def distribute_pot(self):
        max_win = defaultdict(int)
        in_pot = self.pot

        # Calculate max possible win for each player
        while in_pot:
            bets = [p.stake for p in self.players if p.stake]
            min_bet = min(bets)
            for p in self.players:
                if p.stake:
                    max_win[p.id] += min_bet * len(bets) if p.live else 0
                    p.stake -= min_bet
                    in_pot -= min_bet

        # Calculate winners and split pot
        while self.pot:
            max_score = max([p.score for p in self.players_live])
            winners = [p for p in self.players_live if p.score == max_score]
            top_player = winners[0]
            profit = min(max_win[top_player.id], self.pot//len(winners))
            top_player.balance += profit
            top_player.score = [-1]
            self.pot -= profit

    # Returns active player
    def cur_player(self):
        return self.players_live[self.turn % len(self.players_live)]

    # Handle betting and calling
    def bet(self, amount = 0):
        player = self.cur_player()
        if player.live and player.balance != 0:
            if amount:
                for player in self.players:
                    player.moved = False
            player.moved = True
            amount = self.current_bet - player.bets[self.round] if not amount else amount
            bet = min(player.balance, amount)
            player.stake += bet
            player.bets[self.round] += bet
            self.pot += bet
            player.balance -= bet
        self.turn += 1
    
    def fold(self):
        player = self.cur_player()
        player.live = False
        self.players_live.remove(player)

    def score(self, player):
        all_cards = player.hand + self.community_cards
        all_ranks = [card[0] for card in all_cards]
        all_suits = [card[1] for card in all_cards]
        all_ranks_set = sorted(set(all_ranks), reverse=True)

        # Check straight flush and flush
        for suit in set(all_suits):
            if all_suits.count(suit) >= 5:
                player.score = [5]
                suit_ranks = [all_ranks[r] for r in range(len(all_ranks)) if all_suits[r] == suit]
                suit_ranks_set = sorted(set(suit_ranks), reverse=True)
                # Check straight flush
                for i in range(len(suit_ranks_set) - 4):
                    if suit_ranks_set[i] - 4 == suit_ranks_set[i + 4]:
                        player.score = [8, suit_ranks_set[i]]
                        return player.score
                    if all(val in all_ranks_set for val in [14, 2, 3, 4, 5]):
                        player.score = [8, 5]
                        return player.score
                # Add highest card
                player.score += sorted(suit_ranks, reverse=True)[:5] 

        # Check four of a kind
        for rank in all_ranks_set:
            if all_ranks.count(rank) == 4:
                player.score = [7, rank]
                return player.score
        
        # Check full house and three of a kind
        for rank in all_ranks_set:
            if all_ranks.count(rank) == 3:
                for rank2 in all_ranks_set:
                    if rank2 != rank and all_ranks.count(rank2) >= 2:
                        player.score = [6, rank, rank2]
                        return player.score
                if player.score[0] < 4:
                    kicker_ranks = sorted([krank for krank in all_ranks if krank != rank], reverse=True)
                    player.score = [3, rank] + kicker_ranks[:3]
        
        if player.score[0] == 5:
            return player.score

        # Check straight
        for i in range(len(all_ranks_set) - 4):
            if all_ranks_set[i] - 4 == all_ranks_set[i + 4]:
                player.score = [4, all_ranks_set[i]]
                return player.score
            if all(val in all_ranks_set for val in [14, 2, 3, 4, 5]):
                player.score = [4, 5]
                return player.score
                
        if player.score[0] == 3:
            return player.score
        
        # Check pairs
        for r in range(len(all_ranks_set)):
            if all_ranks.count(all_ranks_set[r]) == 2:
                if r + 1 < len(all_ranks_set):
                    for r2 in range(r + 1, len(all_ranks_set)):
                        if all_ranks.count(all_ranks_set[r2]) == 2:
                            kicker_ranks = sorted([krank for krank in all_ranks if krank not in [all_ranks_set[r], all_ranks_set[r2]]], reverse=True)
                            player.score = [2, all_ranks_set[r], all_ranks_set[r2]] + kicker_ranks[:1]
                            return player.score
                kicker_ranks = sorted([krank for krank in all_ranks if krank != all_ranks_set[r]], reverse=True)
                player.score = [1, all_ranks_set[r]] + kicker_ranks[:3]
                return player.score
        
        player.score = [0] + sorted(all_ranks, reverse=True)[:5]
        return player.score
    
