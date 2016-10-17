#!/usr/bin/python

import sys, json
import pandas as pd
import numpy as np
from scipy import stats
from sklearn import cluster
# from sklearn.decomposition import PCA
import pymysql.cursors
# from functools import partial
# import io




# line_count = 0
# k = 0

# Arguments
# ---------
# 
# n_clusters
# db


# Variables
# ---------
sql_statement = ''
output = ''


# get inputs from arg list or from stdin
# NB two different ways of getting data in

# first read in any arguments
args = []
# simple argument echo script
for v in sys.argv[1:]:
  args.append(v)


organisation = args[0]
year = args[1]
algorithm = args[2]
cluster_options = args[3]
data_group = args[4]



use_mysql = False  # choose whether to read from MySQL or csv dump
if (use_mysql):
#     then read any input on stdin
#     simple TEXT echo script
#     this is currently the SQL statement
    for line in sys.stdin:
        sql_statement += line[:-1]
    
    # Connect to the database
    connection = pymysql.connect(host='localhost',
                                 user='root',
                                 password='root',
                                 port=8889,
                                 db='csps',
                                 charset='utf8mb4',
                                 cursorclass=pymysql.cursors.DictCursor)
    try:
    
        with connection.cursor() as cursor:
            if (data_group == 'questions'):
                sql_statement = "SELECT `scores`.`organisation` as 'org', `headcount`.`name` as 'organisation', `scores`.`year`, `scores`.`measure`, `scores`.`score`, `headcount`.`number` as 'headcount', `headcount`.`parent`, `headcount`.`parent_acronym` as 'par' FROM `scores` JOIN `headcount` ON `scores`.`organisation` = `headcount`.`acronym` WHERE `scores`.`year` = "
                sql_statement = sql_statement + str(year) + " AND `headcount`.`year` = "
                sql_statement = sql_statement + str(year) + " AND (`scores`.`measure` LIKE 'B0%' OR `scores`.`measure` LIKE 'B1%' OR `scores`.`measure` LIKE 'B2%' OR `scores`.`measure` LIKE 'B3%' OR `scores`.`measure` LIKE 'B4%' OR `scores`.`measure` LIKE 'B50' OR `scores`.`measure` LIKE 'B51' OR `scores`.`measure` LIKE 'B52' OR `scores`.`measure` LIKE 'B53');"      

            if (data_group == 'themes'):
                sql_statement = "SELECT `scores`.`organisation` as 'org', `headcount`.`name` as 'organisation', `scores`.`year`, `scores`.`measure`, `scores`.`score`, `headcount`.`number` as 'headcount', `headcount`.`parent`, `headcount`.`parent_acronym` as 'par' FROM `scores` JOIN `headcount` ON `scores`.`organisation` = `headcount`.`acronym` WHERE `scores`.`year` = "
                sql_statement = sql_statement + str(year) + " AND `headcount`.`year` = "
                sql_statement = sql_statement + str(year) + " AND (`scores`.`measure` = 'RR' OR `scores`.`measure` = 'EEI' OR `scores`.`measure` = 'MW' OR `scores`.`measure` = 'OP' OR `scores`.`measure` = 'LM' OR `scores`.`measure` = 'MT' OR `scores`.`measure` = 'MD' OR `scores`.`measure` = 'IF' OR `scores`.`measure` = 'RW' OR `scores`.`measure` = 'PB' OR `scores`.`measure` = 'LC');"      



            cursor.execute(sql_statement)
            result = cursor.fetchall()
    finally:
        connection.close()

    csps_data = pd.DataFrame(result)
else:
    csps_data = pd.read_csv('csps_scores+headcount.csv')

# print(csps_data.head())

# id measure response  year organisation group  score
csps_data = pd.pivot_table(csps_data, values='score', index=['organisation', 'year', 'headcount', 'org', 'par'], columns=['measure'], aggfunc=np.sum)

# The data should always be a 2D array, shape (n_samples, n_features)
# print(csps_data.head())


# To get the boolean mask where values are nan
# cpvnm: CSPS data, pivoted, null mask
# csps_data = pd.isnull(csps_data)
# print(csps_data.head())


# Filling missing data: CSPS data, pivoted, no-null
# csps_data = csps_data.fillna(value=0)
# print(csps_data.head())

cluster_options = json.loads(cluster_options)

if (algorithm == 'KMeans'):
    clustered = cluster.KMeans(n_clusters=cluster_options.n_clusters)
clustered.fit(csps_data)

# this works, but isn't useful any more
# csps_data['cluster_id'] = clustered.labels_

org_year = zip(*csps_data.index.values)
orgs = pd.Series(org_year[0])
years = pd.Series(org_year[1])
headcount = pd.Series(org_year[2])
org_acronym = pd.Series(org_year[3])
par_acronym = pd.Series(org_year[4])
clusters = pd.Series(clustered.labels_.tolist())

org_year.append(clustered.labels_.tolist())
df = pd.DataFrame(orgs)  #, 'organisation'

df['year'] = years
df['headcount'] = headcount
df['cluster'] = clusters
df['org'] = org_acronym
df['parent'] = par_acronym

# output = json.dumps(clustered.labels_)
# output = json.dumps(result)

###### output = json_dumps(clustered.labels_)
# print(clustered.labels_)

# output = json.dumps(clustered.labels_.tolist())


# output = csps_data.columns.tolist()
'''
[u'B01', u'B02', u'B03', u'B04', u'B05', u'B06', u'B07', u'B08', u'B09', u'B10', u'B11', 
u'B12', u'B13', u'B14', u'B15', u'B16', u'B17', u'B18', u'B19', u'B20', u'B21', u'B22', 
u'B23', u'B24', u'B25', u'B26', u'B27', u'B28', u'B29', u'B30', u'B31', u'B32', u'B33', 
u'B34', u'B35', u'B36', u'B37', u'B38', u'B39', u'B40', u'B41', u'B42', u'B43', u'B44', 
u'B45', u'B46', u'B47', u'B48', u'B49', 'cluster_id']
'''

# output = json.dumps(csps_data.columns.tolist())
# output = json.dumps(csps_data.columns.get_level_values(0).tolist())
'''
["B01", "B02", "B03", "B04", "B05", "B06", "B07", "B08", "B09", "B10", "B11", "B12", 
"B13", "B14", "B15", "B16", "B17", "B18", "B19", "B20", "B21", "B22", "B23", "B24", 
"B25", "B26", "B27", "B28", "B29", "B30", "B31", "B32", "B33", "B34", "B35", "B36", 
"B37", "B38", "B39", "B40", "B41", "B42", "B43", "B44", "B45", "B46", "B47", "B48", 
"B49", "cluster_id"]
'''

# output = json.dumps(csps_data.index.values.tolist())
'''
[["ACAS", 2009], ["ACAS", 2010], ["ACAS", 2011], ["ACAS", 2012], ["ACAS", 2013], 
["ACAS", 2014], ["ACAS", 2015], ["AGO", 2009], ["AGO", 2010], ["AGO", 2011], 
["AGO", 2012], ["AGO", 2013], ["AGO", 2014], ["AGO", 2015], ["AHVLA", 2009], 
["AHVLA", 2010], ["AHVLA", 2011], ["AHVLA", 2012], ["AHVLA", 2013], ["AHVLAB", 2009], 
["AHVLAB", 2010], ["AIB", 2009], ["AIB", 2010], ["AIB", 2011], ["AIB", 2012], 
["AIB", 2013], ["AIB", 2014], ["AIB", 2015], ["ALBS", 2010], etc................
'''
# output = zip(*csps_data.index.values)
# d = [["ACAS", 2009], ["ACAS", 2010], ["ACAS", 2011], ["ACAS", 2012], ["ACAS", 2013], ["ACAS", 2014], ["ACAS", 2015], ["AGO", 2009], ["AGO", 2010], ["AGO", 2011], ["AGO", 2012], ["AGO", 2013], ["AGO", 2014], ["AGO", 2015], ["AHVLA", 2009], ["AHVLA", 2010], ["AHVLA", 2011], ["AHVLA", 2012], ["AHVLA", 2013], ["AHVLAB", 2009], ["AHVLAB", 2010], ["AIB", 2009], ["AIB", 2010], ["AIB", 2011], ["AIB", 2012], ["AIB", 2013], ["AIB", 2014], ["AIB", 2015], ["ALBS", 2010]]

output = json.dumps(df.values.tolist())

###output = json.dumps(csps_data.values.tolist())
# output = json.dumps(csps_data.describe())
print output




# simple JSON echo script
# for line in sys.stdin:
#   print json.dumps(json.loads(line))

# simple binary echo script
# sys.stdout.write(sys.stdin.read())



# try:
#     buff = ''
#     while True:
#         buff += sys.stdin.read(1)
#         input_data = buff
#         if buff.endswith('\n'):
#             print buff[:-1]
#             buff = ''
#             k = k + 1
# except KeyboardInterrupt:
#    sys.stdout.flush()
#    pass
# print k


# k = 0
# try:
#     while True:
#         print sys.stdin.readline()
#         k += 1
# except KeyboardInterrupt:
#     sys.stdout.flush()
#     pass
# print k


# output = 'hello node world: ' + str(k) + '  >>>  ' + input_data + '  >>>  ', args
# output = json.dumps(['foo', {'bar': ('baz', None, 1.0, 2)}])
# print output

# def program_logic(line):
#     global line_count
#     line_count += 1
#     print str(line_count) + ': ' + line.rstrip()
# 
# def read_from_stdin():
#     global line_count
#     for line in sys.stdin:
#         program_logic(line)
# 
# def prompt_user():
#     print 'Type "quit" to exit.'
#     while (True):
#         line = raw_input('PROMPT> ')
#         if line == 'quit':
#             sys.exit()
#         program_logic(line)
# 
# if __name__ == "__main__":
#     if '-' in sys.argv:
#         read_from_stdin()
#     else:
#         prompt_user()

