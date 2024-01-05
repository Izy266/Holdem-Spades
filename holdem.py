import random

class Player:
    def __init__(self, name, id, balance):
        self.name = name
        self.id = id
        self.balance = balance
        self.hand = []
        self.bets = [0 for _ in range(4)]
        self.score = []
        
class TexasHoldem:
    def __init__(self):
        self.players = []
        self.active_players = self.players
        self.deck = [(rank, suit) for suit in range(4) for rank in range(2, 15)]
        self.community_cards = []
        self.pot = []
        self.button = 0 # Who starts the new hand
        self.turn = 0
        self.round = 0
        self.bet_start = 3 if len(self.players) > 2 else 2
        self.sb_turn = 1 if len(self.players) > 2 else 0
        self.bb_turn = 2 if len(self.players) > 2 else 1
        self.small_blind = 0
        self.big_blind = 0
        self.current_bet = 0
        self.minimum_raise = 0
        self.round = 0
        self.game_over = False
        self.creator_id = None
        self.hands = ['High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush']

    def deal_cards(self):
        random.shuffle(self.deck)
        for _ in range(2):
            for player in self.players:
                card = self.deck.pop()
                player.hand.append(card)
    
    # Checks if round is over
    def round_over(self):
        if self.turn == self.bet_start - 1:
            self.pot[self.round].append(len(self.active_players))
            self.turn = (self.button + 1) % len(self.active_players)
            self.bet_start = self.turn
            self.current_bet = 0
            self.round += 1
            return True
        return False
    
    # Checks if the hand is over
    def hand_over(self):
        if len(self.active_players) == 1 or self.round == 4:
            self.allocate_pot()
            self.active_players = self.players
            self.deck = [(rank, suit) for suit in range(4) for rank in range(2, 15)]
            self.community_cards = []
            self.pot = []
            self.button += 1
            return True
        return False
    
    def allocate_pot(self):
        hands = [p.score for p in self.active_players]
        # handle ties
        # handle money left over if player couldn't afford min bet
        

    # Gets the active player
    def active(self):
        return self.active_players[self.turn % len(self.active_players)]
    
    # Used for betting and calling
    def bet(self, amount = 0):
        self.bet_start = self.turn if amount else self.bet_start
        amount = self.current_bet if not amount else amount
        player = self.active()
        bet = min(player.balance, amount)
        player.bet[self.round] += bet
        self.pot[self.round] += bet
        player.balance -= bet
        self.turn += 1
    
    def fold(self):
        self.active_players.pop(self.turn%len(self.active_players))

    # def update_pot(self, amount):


    # def update_current_bet(self, amount):


    # def update_minimum_raise(self, amount):


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
    
    # def end_game(self):
    #     # End the game and declare a winner