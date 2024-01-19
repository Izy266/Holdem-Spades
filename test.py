lis = ['CP', 'p1', 'p2', 'p3', 'p4']


midPoint = len(lis)//2


for p in range(len(lis)):
    offset = 0
    indDiff = p - lis.index('CP')
    if abs(indDiff) > midPoint:
        if p > midPoint:
            offset = p - len(lis)
        else:
            offset = p + 1
    else:
        offset = indDiff
    
    gridColumn = 4 + (offset)

    print(f"{lis[p]} gridColumn: {gridColumn}")


# ['p3', 'p4', 'CP', 'p1', 'p2']
# [p1, p2, p3, p4, CP]


# midPoint = 2

# indDiff = ind - CP ind
# 0 - 4 = -4 

# if abs(indDiff) > midpoint:

# offset = (abs(indDiff) - midPoint) * (1 if indDiff < 0 else -1)
# else:
# offset = indDiff

# gridColumn = 4 - offset
