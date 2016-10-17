#!/usr/bin/python

year = 2012

def make_B(b):
    B_str = str(b)
    B_str = B_str.rjust(2, '0')
    return 'B' + B_str

def make_measure(m):
    M_str = str(m)
    M_str = M_str.rjust(2, '0')
    return "OR `scores`.`measure` LIKE '" + M_str + "'"


def getCSPSquestions(year):
    max_B = {2009: 56, 2010: 56, 2011: 57, 2012: 57, 2013: 62, 2014: 62, 2015: 70}
    Bs = range( 1, max_B[year] + 1 )
    b = map(make_B, Bs)
    return b

# measures = " ".join(map(make_measure, getCSPSquestions(year)))

Es = ['E01', 'E02_A', 'E02_C', 'E02_D', 'E02_E', 'E02_GND', 'E02_GNDR', 'E02_GRD', 'E02_L', 'E02_R', 'E02_SBG', 'E02_SEX', 'E02_WLOC', 'E02_WPAT', 'E02_Z_OTH', 'E02_Z_PNOT', 'E03', 'E04_AM', 'E04_COL', 'E04_LM', 'E04_MEE', 'E04_PUBL', 'E04_SELSE', 'E04_SORG', 'E04_Z_PNOT']

e_measures = " ".join(map(make_measure, Es))

sql_statement = "SELECT `scores`.`organisation` as 'org', `headcount`.`name` as 'organisation', `scores`.`year`, `scores`.`measure`, `scores`.`score`, `headcount`.`number` as 'headcount', `headcount`.`parent`, `headcount`.`parent_acronym` as 'par' FROM `scores` JOIN `headcount` ON `scores`.`organisation` = `headcount`.`acronym` WHERE `scores`.`year` = "
sql_statement = sql_statement + str(year) + " AND `headcount`.`year` = "
sql_statement = sql_statement + str(year) + " AND (`scores`.`measure` = 'EEI'"
sql_statement = sql_statement + e_measures + ");"      

# print(measures)
print(sql_statement)



