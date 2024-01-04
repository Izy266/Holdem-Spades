import random

class Player:
    def __init__(self, name, id, balance):
        self.name = name
        self.id = id
        self.balance = balance
        self.hand = []
        self.score = [0]
        
class TexasHoldem:
    def __init__(self):
        self.players = []
        self.deck = [(rank, suit) for suit in range(4) for rank in range(2, 15)]
        self.community_cards = []
        self.pot = 0
        self.current_player = None
        self.current_bet = 0
        self.minimum_raise = 0
        self.round = 0
        self.game_over = False
        self.game_id = None
        self.creator_id = None

    def deal_cards(self):
        random.shuffle(self.deck)
        for player in self.players:
            for i in range(2):
                card = self.deck.pop()
                player.hand.append(card)

    # def next_player(self):
    #     # Move to the next player

    # def update_pot(self, amount):
    #     # Update the pot with the given amount

    # def update_current_bet(self, amount):
    #     # Update the current bet with the given amount

    # def update_minimum_raise(self, amount):
    #     # Update the minimum raise with the given amount
    
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
