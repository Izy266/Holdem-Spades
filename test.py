list1 = [3, 1, 4, 2, 5]
list2 = ['c', 'a', 'd', 'b', 'e']

sorted_list2 = [x for _, x in sorted(zip(list1, list2))]

print(sorted_list2)
