cards = [(7, 1), (6, 2), (6, 0), (5, 3), (4, 2), (8, 3), (12, 1)]
straight = [(7, 1), (6, 2), (6, 0), (5, 3), (4, 2), (8, 3), (12, 1)]

next_card = [card for card in cards if card not in straight][:1]

print(next_card)