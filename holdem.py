import random
from collections import defaultdict
from werkzeug.security import generate_password_hash, check_password_hash

class Player:
    def __init__(self, name, id, balance):
        self.name, self.id, self.balance = name, id, balance
        self.session_id = None
        self.hand, self.best_hand = [], []
        self.bets = [0 for _ in range(4)]
        self.score = [-1]
        self.moved = False
        self.live = True
        self.in_game = True
        self.show = False
        self.profit = 0
        self.next_move = None
        self.afk = 0
        
class TexasHoldem:
    def __init__(self, game_id, creator_id, buy_in, small_blind, big_blind, password):
        self.id, self.creator_id, self.password = game_id, creator_id, password
        self.buy_in, self.small_blind, self.big_blind = buy_in, small_blind, big_blind
        self.deck, self.community_cards, self.players = [], [], []
        self.pot, self.button, self.round, self.turn, self.turn_start = 0, 0, 0, 0, 0
        self.min_raise, self.current_bet = 0, 0
        self.round, self.hand = -1, -1
        self.live = False
        self.last_better_id = None
        self.timer_thread, self.time_per_move, self.move_time_start, self.move_time_remaining = None, 3, 0, 0
        self.chat, self.log = [], []
    
    def add_player(self, player):
        self.players.append(player)
        self.log.append(('join', player.name))

    def remove_player(self, player_id):
        self.players = [p for p in self.players if p.id != player_id]

    def get_player_by_id(self, player_id):
        return next(p for p in self.players if p.id == player_id)
    
    def get_active_ind(self, ind):
        ind %= len(self.players)
        player = self.players[ind]
        while not self.round_over() and not (player.live and player.balance):
            player.moved = True
            ind = (ind + 1) % len(self.players)
            player = self.players[ind]
        return ind

    def get_live_ind(self, ind):
        ind %= len(self.players)
        player = self.players[ind]
        while not player.live:
            ind = (ind + 1) % len(self.players)
            player = self.players[ind]
        return ind
    
    def set_turn_next(self):
        self.turn = self.get_active_ind(self.turn + 1)
    
    def current_player(self):
        return self.players[self.turn]
    
    def live_players(self):
        return [p for p in self.players if p.live and p.afk < 3]
    
    def active_players(self):
        return [p for p in self.players if p.live and p.afk < 3 and p.balance]
    
    def round_over(self):
        return all(player.moved for player in self.players)
    
    def hand_over(self):
        return self.round > 3 or (len(self.live_players()) == 1 and self.round > -1)
    
    def handle_round_over(self):
        if self.round_over():
            self.new_round()
        if self.hand_over():
            self.distribute_pot()
    
    def max_profits(self):
        max_wins = defaultdict(int)
        stakes = {p.id: sum(p.bets) for p in self.players}
        in_pot = self.pot

        while in_pot:
            bets = [stakes[p.id] for p in self.players if stakes[p.id]]
            min_bet = min(bets)
            for p in self.players:
                if stakes[p.id]:
                    max_wins[p.id] += min_bet * len(bets) if p.live else 0
                    stakes[p.id] -= min_bet
                    in_pot -= min_bet
        return max_wins

    def distribute_pot(self):
        max_wins = self.max_profits()
        scores = [p.score for p in self.players if p.live]
        last_better = self.get_player_by_id(self.last_better_id)
        show_start = self.get_live_ind(self.turn_start)

        while self.pot:
            max_score = max(scores)
            scores = [score for score in scores if score != max_score]
            winners = [p for p in self.players if p.live and p.score == max_score]
            while winners:
                winner =  winners[-1]
                profit = min(max_wins[winner.id], self.pot//len(winners))
                winner.show = len(self.live_players()) > 1
                winner.balance += profit
                winner.profit = profit
                self.pot -= profit
                winners.pop()
                self.log.append(('win', winner.name, profit, winner.best_hand if winner.show else []))

        if last_better.bets[-1] > 0:
            show_start = self.players.index(last_better)

        self.players[show_start].show = True
        show_scores = [self.players[show_start].score]
        ind = self.get_live_ind(show_start + 1)
        while ind != show_start:
            if self.players[ind].score >= max(show_scores):
                self.players[ind].show = True
            ind = self.get_live_ind(ind + 1)

    def deal_community_cards(self):
        if not self.hand_over():
            main_logs = [('flop', (0, 3)), ('turn', (3, 4)), ('river', (4, 5))]
            cards_down = len(self.community_cards)
            cards_to_deal = 5 - cards_down if len(self.active_players()) < 2 else 3 if self.round == 0 else 1 if self.round < 3 else 0
            for _ in range(cards_to_deal):
                self.community_cards.append(self.deck.pop())

            cards_down2 = len(self.community_cards)
            start = cards_down2 - 3
            diff = 1 if cards_down2 == 3 else cards_down2 - cards_down
            
            if diff > 1:
                while start < len(main_logs):
                    card_start, card_end = main_logs[start][1]
                    self.log.append((main_logs[start][0], self.community_cards[card_start:card_end]))
                    start += 1
            else:
                card_start, card_end = main_logs[start][1]
                self.log.append((main_logs[start][0], self.community_cards[card_start:card_end]))

            cards_down - 2

    def new_round(self):
        self.deal_community_cards()
        max_bet, max_better, bets = 0, None, []
        show_all = len(self.live_players()) > 1 and len(self.active_players()) < 2

        for player in self.players:
            self.score(player)
            player.moved = False
            player.next_move = None
            bet = player.bets[self.round]
            bets.append(bet)
            if player.live and show_all:
                player.show = True
                player.moved = True
            if bet > max_bet:
                max_bet, max_better = bet, player

        if bets.count(max_bet) == 1:
            bet_ceil = max([bet for bet in bets if bet != max_bet]) if len(bets) > 1 else 0
            diff = max_bet - bet_ceil
            max_better.bets[self.round] = bet_ceil
            max_better.balance += diff
            self.pot -= diff    
        
        self.turn = self.get_active_ind(self.turn_start)
        self.current_bet = 0
        self.min_raise = self.big_blind
        self.round += 1
        if show_all:
            self.round = 4
    
    def new_hand(self):
        self.round, self.pot, self.community_cards = 0, 0, []
        self.live = True
        self.hand += 1
        self.log.append(['new_hand'])
        self.deck = [(rank, suit) for suit in range(4) for rank in range(2, 15)]
        random.shuffle(self.deck)
        for player in self.players:
            player.live = player.balance and player.afk < 3
            player.hand = [self.deck.pop() for _ in range(2)] if player.live else []
            player.bets = [0 for _ in range(4)]
            player.profit = 0
            player.show = False
            self.score(player)
            if not player.live:
                if player.afk > 5:
                    player.in_game = False
                player.afk += 1
        
        self.players = [p for p in self.players if p.in_game]
        self.button = self.get_active_ind(self.button + 1)
        self.turn_start = self.get_active_ind(self.button + 1 if len(self.live_players()) > 2 else self.button)
        self.turn = self.turn_start
        self.bet(self.small_blind, 1)
        self.bet(self.big_blind, 2)
    
    def place_bet(self, player, amount):
        player.bets[self.round] += amount
        player.balance -= amount
        self.pot += amount
    
    def check(self):
        player = self.current_player()
        player.moved = True
        call_amount = min(player.balance, self.current_bet - player.bets[self.round])
        self.place_bet(player, call_amount)
        if call_amount > 0:
            main_log = 'all_in' if player.balance == 0 else 'call'
            self.log.append((main_log, player.name, call_amount))
        else:
            self.log.append(('check', player.name))

        self.set_turn_next()
        self.handle_round_over()

    
    def bet(self, amount, blind = 0):
        for p in self.players:
            p.moved = False

        player = self.current_player()
        player.moved = blind == 0
        amount = min(player.balance, amount)
        self.last_better_id = player.id
        self.min_raise = max(self.min_raise, amount - self.current_bet)
        self.current_bet = amount + player.bets[self.round]
        self.place_bet(player, amount)
        if blind > 0:
            main_log = 'small_blind' if blind == 1 else 'big_blind'
            self.log.append((main_log, player.name, amount))
        else:
            main_log = 'all_in' if player.balance == 0 else 'raise'
            self.log.append((main_log, player.name, amount))

        self.set_turn_next()
        self.handle_round_over()

    def fold(self):
        player = self.current_player()
        player.live = False
        player.moved = True
        self.log.append(('fold', player.name))
        self.set_turn_next()
        self.handle_round_over()
        
    def score(self, player):
        all_cards = player.hand + self.community_cards
        all_ranks = [card[0] for card in all_cards]
        all_suits = [card[1] for card in all_cards]
        all_cards_sorted = sorted(all_cards, reverse=True)
        all_ranks_set = sorted(set(all_ranks), reverse=True)
        player.best_hand = []
        player.score = [-1]

        # Check straight flush and flush
        for suit in set(all_suits):
            if all_suits.count(suit) >= 5:
                flush = [card for card in all_cards_sorted if card[-1] == suit]
                player.best_hand = flush[:5]
                player.score = [5]
                suit_ranks = [all_ranks[r] for r in range(len(all_ranks)) if all_suits[r] == suit]
                suit_ranks_set = sorted(set(suit_ranks), reverse=True)
                # Check straight flush
                for i in range(len(suit_ranks_set) - 4):
                    if suit_ranks_set[i] - 4 == suit_ranks_set[i + 4]:
                        player.best_hand = [(suit_ranks_set[i] - r, suit) for r in range(5)]
                        player.score = [8, suit_ranks_set[i]]
                        return player.score
                    if all(val in all_ranks_set for val in [14, 2, 3, 4, 5]):
                        player.best_hand = [(14, suit)] + [(2 + r, suit) for r in range(4)]
                        player.score = [8, 5]
                        return player.score
                # Add highest card
                player.score += sorted(suit_ranks, reverse=True)[:5] 

        # Check four of a kind
        for rank in all_ranks_set:
            if all_ranks.count(rank) == 4:
                player.best_hand = [(rank, s) for s in range(4)] + [card for card in all_cards_sorted if card[0] != rank][:1]
                player.score = [7, rank]
                return player.score
        
        # Check full house and three of a kind
        for rank in all_ranks_set:
            if all_ranks.count(rank) == 3:
                for rank2 in all_ranks_set:
                    if rank2 != rank and all_ranks.count(rank2) >= 2:
                        player.best_hand = [card for card in all_cards_sorted if card[0] == rank] + [card for card in all_cards_sorted if card[0] == rank2][:2]
                        player.score = [6, rank, rank2]
                        return player.score
                if player.score[0] < 4:
                    kicker_ranks = sorted([krank for krank in all_ranks if krank != rank], reverse=True)
                    player.best_hand = [card for card in all_cards_sorted if card[0] == rank] 
                    player.best_hand += [card for card in all_cards_sorted if card not in player.best_hand][:2]
                    player.score = [3, rank] + kicker_ranks[:3]
        
        if player.score[0] == 5:
            return player.score

        # Check straight
        for i in range(len(all_ranks_set) - 4):
            if all_ranks_set[i] - 4 == all_ranks_set[i + 4]:
                player.best_hand = [all_cards[all_ranks.index(rank)] for rank in range(all_ranks_set[i]-4, all_ranks_set[i] + 1)]
                player.score = [4, all_ranks_set[i]]
                return player.score
            if all(val in all_ranks_set for val in [14, 2, 3, 4, 5]):
                player.best_hand = [all_cards[all_ranks.index(rank)] for rank in [14, 2, 3, 4, 5]]
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
                            player.best_hand = [card for card in all_cards_sorted if card[0] in [all_ranks_set[r], all_ranks_set[r2]]]
                            player.best_hand += [card for card in all_cards_sorted if card not in player.best_hand][:1]
                            player.score = [2, all_ranks_set[r], all_ranks_set[r2]] + kicker_ranks[:1]
                            return player.score
                kicker_ranks = sorted([krank for krank in all_ranks if krank != all_ranks_set[r]], reverse=True)
                player.best_hand = [card for card in all_cards_sorted if card[0] == all_ranks_set[r]]
                player.best_hand += [card for card in all_cards_sorted if card not in player.best_hand][:3]
                player.score = [1, all_ranks_set[r]] + kicker_ranks[:3]
                return player.score
            
        player.best_hand = all_cards_sorted[:5]
        player.score = [0] + sorted(all_ranks, reverse=True)[:5]
        return player.score