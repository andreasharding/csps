#!/usr/bin/python

import sys, json
import pandas as pd
import numpy as np
from scipy import stats
from sklearn import cluster
from sklearn import metrics
from sklearn.neighbors import kneighbors_graph
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler
from timeit import default_timer as timer

start_time = timer()
db_time = 0

# from sklearn.decomposition import PCA
import pymysql.cursors

# sql_statement = ''
# output = ''
# csps_data = ''
args = []


# get inputs from arg list or from stdin
# NB two different ways of getting data in

# first read in any arguments
# simple argument echo script
for v in sys.argv[1:]:
    args.append(v)


#     then read any input on stdin
#     simple TEXT echo script
#     this is currently the SQL statement
#for line in sys.stdin:
#    sql_statement += line[:-1]

feature_set = 'nothing'
global_args = args

if len(args) == 0:
    organisation = ''
    year = 2014
    algorithm = 'AffinityPropagation'
    cluster_options = {'n_clusters': 5}
    feature_set = 'questions'  # 'questions', 'themes', 'demographics', ew_questions
else:
    organisation = args[0]
    year = args[1]
    algorithm = args[2]
    cluster_options = json.loads(args[3])
    feature_set = args[4]

# print(items(cluster_options))






# Some helper functions for SQL statement construction
def make_B(b):
    B_str = str(b)
    B_str = B_str.rjust(2, '0')
    return 'B' + B_str

def make_measure(m):
    M_str = str(m)
    M_str = M_str.rjust(2, '0')
    return "OR `scores`.`measure` LIKE '" + M_str + "'"


def getCSPSquestions(year):
    year = int(year)
    max_B = {2009: 56, 2010: 56, 2011: 57, 2012: 57, 2013: 62, 2014: 62, 2015: 70}
    Bs = range( 1, max_B[year] + 1 )
    r = map(make_B, Bs)
    return r







def get_data(use_mysql):
    global db_time, feature_set
#     organisation = ''
#     year = 2014
#     algorithm = 'KMeans'
#     cluster_options = {'n_clusters': 3}
#     feature_set = 'questions'

    if (use_mysql):
    
        # Connect to the database
        start_db_time = timer()
        connection = pymysql.connect(host='localhost',
                                     user='root',
                                     password='root',
                                     port=8889,
                                     db='csps',
                                     charset='utf8mb4',
                                     cursorclass=pymysql.cursors.DictCursor)
        try:
    
            with connection.cursor() as cursor:
                # default SQL in case nothing matches
                sql_statement = "SELECT `scores`.`organisation` as 'org', `headcount`.`name` as 'organisation', `scores`.`year`, `scores`.`measure`, `scores`.`score`, `headcount`.`number` as 'headcount', `headcount`.`parent`, `headcount`.`parent_acronym` as 'par' FROM `scores` JOIN `headcount` ON `scores`.`organisation` = `headcount`.`acronym` WHERE `scores`.`year` = "
                sql_statement = sql_statement + str(year) + " AND `headcount`.`year` = "
                sql_statement = sql_statement + str(year) + " AND (`scores`.`measure` = 'EEI' OR `scores`.`measure` LIKE 'B0%' OR `scores`.`measure` LIKE 'B1%' OR `scores`.`measure` LIKE 'B2%' OR `scores`.`measure` LIKE 'B3%' OR `scores`.`measure` LIKE 'B4%' OR `scores`.`measure` LIKE 'B50' OR `scores`.`measure` LIKE 'B51' OR `scores`.`measure` LIKE 'B52' OR `scores`.`measure` LIKE 'B53');"      
            
                if (feature_set == 'questions'):
                    measures = " ".join(map(make_measure, getCSPSquestions(year)))
                    sql_statement = "SELECT `scores`.`organisation` as 'org', `headcount`.`name` as 'organisation', `scores`.`year`, `scores`.`measure`, `scores`.`score`, `headcount`.`number` as 'headcount', `headcount`.`parent`, `headcount`.`parent_acronym` as 'par' FROM `scores` JOIN `headcount` ON `scores`.`organisation` = `headcount`.`acronym` WHERE `scores`.`year` = "
                    sql_statement = sql_statement + str(year) + " AND `headcount`.`year` = "
                    sql_statement = sql_statement + str(year) + " AND (`scores`.`measure` = 'EEI'"
                    sql_statement = sql_statement + measures + ");"      


                if (feature_set == 'ew_questions'):
                    # Questions on discrimination, bullying and harassment
                    Es = ['E01', 'E02_A', 'E02_C', 'E02_D', 'E02_E', 'E02_GND', 'E02_GNDR', 'E02_GRD', 'E02_L', 'E02_R', 'E02_SBG', 'E02_SEX', 'E02_WLOC', 'E02_WPAT', 'E02_Z_OTH', 'E02_Z_PNOT', 'E03', 'E04_AM', 'E04_COL', 'E04_LM', 'E04_MEE', 'E04_PUBL', 'E04_SELSE', 'E04_SORG', 'E04_Z_PNOT']
                    if (year >= 2012):
                        Es = Es + ['W01', 'W02', 'W03', 'W04']  # Wellbeing
                        
                    Es = Es + ['D01', 'D02', 'D03']  # Civil Service Code
                    # Should also include data on future intentions - C01 - but this seems to be mostly missing
                    
                    e_measures = " ".join(map(make_measure, Es))

                    sql_statement = "SELECT `scores`.`organisation` as 'org', `headcount`.`name` as 'organisation', `scores`.`year`, `scores`.`measure`, `scores`.`score`, `headcount`.`number` as 'headcount', `headcount`.`parent`, `headcount`.`parent_acronym` as 'par' FROM `scores` JOIN `headcount` ON `scores`.`organisation` = `headcount`.`acronym` WHERE `scores`.`year` = "
                    sql_statement = sql_statement + str(year) + " AND `headcount`.`year` = "
                    sql_statement = sql_statement + str(year) + " AND (`scores`.`measure` = 'EEI'"
                    sql_statement = sql_statement + e_measures + ");"      
                    # print (sql_statement)




                if (feature_set == 'themes'):
                    sql_statement = "SELECT `scores`.`organisation` as 'org', `headcount`.`name` as 'organisation', `scores`.`year`, `scores`.`measure`, `scores`.`score`, `headcount`.`number` as 'headcount', `headcount`.`parent`, `headcount`.`parent_acronym` as 'par' FROM `scores` JOIN `headcount` ON `scores`.`organisation` = `headcount`.`acronym` WHERE `scores`.`year` = "
                    sql_statement = sql_statement + str(year) + " AND `headcount`.`year` = "
                    sql_statement = sql_statement + str(year) + " AND (`scores`.`measure` = 'RR' OR `scores`.`measure` = 'EEI' OR `scores`.`measure` = 'MW' OR `scores`.`measure` = 'OP' OR `scores`.`measure` = 'LM' OR `scores`.`measure` = 'MT' OR `scores`.`measure` = 'MD' OR `scores`.`measure` = 'IF' OR `scores`.`measure` = 'RW' OR `scores`.`measure` = 'PB' OR `scores`.`measure` = 'LC');"      

                if (feature_set == 'demographics'):
                    #sql_statement = "SELECT `organisation`, `year`, `headcount`, `acronym` as 'org', ROUND(((`male`-`female`)/100), 4) as 'gender_offset',  `ethnic_percentage`, `disabled_percentage`, ROUND(((`headcount_delta`/`headcount`)*100), 2) as 'headcount_delta' FROM `org_demographics_ONS`  WHERE `ethnic_percentage` >= 0 AND `disabled_percentage` >= 0 AND `year` = "
                    #sql_statement = sql_statement + str(year) + "  AND `acronym` != 'ALL';"
                    
                    sql_statement = "SELECT `org_demographics_ONS`.`organisation`, `org_demographics_ONS`.`year`, `org_demographics_ONS`.`headcount`, `org_demographics_ONS`.`acronym` as 'org', ROUND(((`male`-`female`)/100), 4) as 'gender_offset',  `ethnic_percentage`, `disabled_percentage`, ROUND(((`headcount_delta`/`headcount`)*100), 2) as 'headcount_delta', `scores`.`score` as 'EEI' "
                    sql_statement += "FROM `org_demographics_ONS` "
                    sql_statement += "JOIN `scores` "
                    sql_statement += "ON `org_demographics_ONS`.`acronym` = `scores`.`organisation` AND  `org_demographics_ONS`.`year` = `scores`.`year` "
                    sql_statement += "WHERE `ethnic_percentage` >= 0 AND `disabled_percentage` >= 0 AND `org_demographics_ONS`.`year` = "
                    sql_statement = sql_statement + str(year) + " AND `acronym` != 'ALL' AND `scores`.`measure` = 'EEI';"

                cursor.execute(sql_statement)
                result = cursor.fetchall()
        finally:
            connection.close()

        csps_data = pd.DataFrame(result)
    else:
        csps_data = pd.read_csv('csps_scores+headcount.csv')
    end_db_time = timer()
    db_time = (end_db_time - start_db_time)
    return csps_data




def main(csps_data):
    global db_time, feature_set, global_args
    # n_clusters = cluster_options['n_clusters']
    # id measure response  year organisation group  score
    # print(csps_data.head())
    
    
    # First get data fram into the right shape
    if (feature_set == 'demographics'):
        csps_data = csps_data.set_index(['organisation', 'org', 'year'])
    else:
        csps_data = pd.pivot_table(csps_data, values='score', index=['organisation', 'year', 'headcount', 'org', 'par'], columns=['measure'], aggfunc=np.sum)
        #csps_data = pd.pivot_table(csps_data, values='score', index=['organisation', 'year', 'org', 'par'], columns=['measure', 'headcount'], aggfunc=np.sum)
    
    
    #print(feature_set)
    #print(csps_data.head())
    
    # Now, because the EEI is required later and therefore retrieved, but is to be excluded from the questions and demographics, split the EEI column out and delete
    
    eei = csps_data['EEI']
    #print(eei.tolist())
    
    if (feature_set != 'zzzzthemes'):
        csps_data = csps_data.drop('EEI', 1)
    
    #print( '*' * 44 )
    #print(csps_data.head())
    
    
    
    # The data should always be a 2D array, shape (n_samples, n_features)
    # print(csps_data.head())


    # To get the boolean mask where values are nan
    # cpvnm: CSPS data, pivoted, null mask
    # csps_data = pd.isnull(csps_data)
    # print(csps_data.head())
    
    '''
    if (feature_set == 'themes'):
        
        dist_test1 = csps_data['EEI'].tolist()
        dist_test2 = csps_data['MW'].tolist()
#         print(dist_test.head())
#         dist_test.reset_index(True)
#         print(dist_test.head())
        print(dist_test1)
        print(dist_test2)
        zz = zip(dist_test1, dist_test2)
        
        print(map(list, zz))
        
        from sklearn.metrics.pairwise import euclidean_distances
        X_pairs = [[0, 1], [1, 1]]
        # distance between rows of X
        print(euclidean_distances(dist_test1, dist_test2))
#         print(euclidean_distances(X_pairs, X_pairs))
        # array([[ 0.,  1.], [ 1.,  0.]])
        # get distance to origin
#         print(euclidean_distances(X_pairs, [[0, 0]]))
        # array([[ 1.        ], [ 1.41421356]])
    '''


    #print(csps_data.columns)

    # Filling missing data: CSPS data, pivoted, no-null
    # csps_data = csps_data.fillna(value=0)
    # print(csps_data.head())

    #'KMeans', 'MiniBatchKMeans', 'AffinityPropagation', 'MeanShift', 'SpectralClustering', 'AgglomerativeClustering', 'DBSCAN', 'Birch'

    # normalize dataset for easier parameter selection
    X = StandardScaler().fit_transform(csps_data)
    
    start_cluster_time = timer()
    # connectivity matrix for structured Ward
    connectivity = kneighbors_graph(X, n_neighbors=10, include_self=False)
    # make connectivity symmetric
    connectivity = 0.5 * (connectivity + connectivity.T)

    if (algorithm == 'KMeans'):
        clustered = cluster.KMeans(n_clusters=cluster_options['n_clusters'])
        
    elif (algorithm == 'MiniBatchKMeans'):
        clustered = cluster.MiniBatchKMeans(n_clusters=cluster_options['n_clusters'])
             
    elif (algorithm == 'AffinityPropagation'):
        clustered = cluster.AffinityPropagation()
        
    elif (algorithm == 'MeanShift'):
        bandwidth = cluster.estimate_bandwidth(X, quantile=0.3)
        clustered = cluster.MeanShift(bandwidth=bandwidth, bin_seeding=True)
        
    elif (algorithm == 'SpectralClustering'):
        clustered = cluster.SpectralClustering(n_clusters=cluster_options['n_clusters'],
                                      eigen_solver='arpack',
                                      affinity="nearest_neighbors")
           
    elif (algorithm == 'AffinityPropagation'):
        clustered = cluster.AffinityPropagation(damping=.9, preference=-200)
                
    elif (algorithm == 'AgglomerativeClustering'):
        clustered = cluster.AgglomerativeClustering(linkage='ward', n_clusters=cluster_options['n_clusters'], connectivity=connectivity)

    elif (algorithm == 'AC_average_linkage'):
        clustered = cluster.AgglomerativeClustering(linkage="average", affinity="cityblock", n_clusters=cluster_options['n_clusters'], connectivity=connectivity)
        
    elif (algorithm == 'DBSCAN'):
        clustered = cluster.DBSCAN(eps=.5, algorithm='auto', leaf_size=40)
        
    elif (algorithm == 'Birch'):
        clustered = cluster.Birch(n_clusters=cluster_options['n_clusters'])
        
    else:
        clustered = cluster.KMeans(n_clusters=cluster_options['n_clusters'])
    
    clustered.fit(X)
    
    if (algorithm == 'MeanShift' or algorithm == 'DBSCAN'):
        silhouette_score = -1
    else:
        silhouette_score = metrics.silhouette_score(X, clustered.labels_, metric='euclidean')
    
#     neigh = NearestNeighbors(2, 0.4)
#     neigh.fit(X)
#     NearestNeighbors(algorithm='auto', leaf_size=30)
#     nbrs = neigh.radius_neighbors([[0, 0, 1.3]], 0.4, return_distance=False)
#     rng = neigh.radius_neighbors([X[1]])
#     print('NearestNeighbors')
#     print(X.shape[1])
#     print(np.asarray(rng[0][0])) 
    
    
    end_cluster_time = timer()
    # this works, but isn't useful any more
    # csps_data['cluster_id'] = clustered.labels_
    if (feature_set != 'demographics'):
#         org_year = zip(*csps_data.index.values)  #['organisation', 'year', 'org', 'par']
#         orgs = pd.Series(org_year[0])
#         years = pd.Series(org_year[1])
#         org_acronym = pd.Series(org_year[2])
#         par_acronym = pd.Series(org_year[3])
#         clusters = pd.Series(clustered.labels_.tolist())
        org_year = zip(*csps_data.index.values)  #['organisation', 'year', 'headcount', 'org', 'par']
        orgs = pd.Series(org_year[0])
        years = pd.Series(org_year[1])
        headcount = pd.Series(org_year[2])
        org_acronym = pd.Series(org_year[3])
        par_acronym = pd.Series(org_year[4])
        clusters = pd.Series(clustered.labels_.tolist())
    else:
        org_year = zip(*csps_data.index.values)  #['organisation', 'org', 'year']
        orgs = pd.Series(org_year[0])
        years = pd.Series(org_year[2])
        org_acronym = pd.Series(org_year[1])
        clusters = pd.Series(clustered.labels_.tolist())
    

    org_year.append(clustered.labels_.tolist())
    
    #1 - organisation
    df = pd.DataFrame(orgs)  #, 'organisation'
    
    #2 - year
    df['year'] = years
    
    #3 - headcount
    if (feature_set != 'demographics'):
        df['headcount'] = headcount
    else:
        df['headcount'] = np.array([0] * len(df))  #csps_data['headcount']
    
    #4 - cluster id 
    df['cluster'] = clusters
    
    #5 - acronym
    df['org'] = org_acronym
    
    #6 - parent
    if (feature_set != 'demographics'):
        df['parent'] = par_acronym
    else:
        df['parent'] = np.array(['x'] * len(df))
    
    #7 - EEI
    df['EEI'] = eei.tolist()
#     if (feature_set != 'themes'):
#         df['EEI'] = eei.tolist()
#     else:
#         df['EEI'] = csps_data['EEI']
    
    category_labels = ['EEI', 'headcount', 'year']

    
    # descriptive statistics for each cluster
    #df[df.A > 0]
    #df.groupby('cluster')
    #cluster_info = df.groupby(['cluster']).get_group(1)
    #grouped = df(['EEI', 'headcount', 'cluster']).groupby('cluster')
    grouped = df.groupby('cluster')
    cluster_info = grouped.describe().fillna('missing')
#     for name, group in grouped:
#         print(name)
#         print(group)
    
    
    #df = df.sort_values(by='cluster')
    
    # use describe to show quick summary statistics of the data
    #df.describe();
    end_time = timer()
    cluster_time = (end_cluster_time - start_cluster_time)
    total_time = (end_time - start_time)

    if (algorithm == 'AffinityPropagation'):
        other_output = json.dumps([{'silhouette_score': silhouette_score, 'db_time': db_time, 'cluster_time': cluster_time, 'total_time': total_time, 'feature_set': feature_set, 'cluster_info': cluster_info.values.tolist(), 'category_labels': category_labels}, clustered.cluster_centers_indices_.tolist()])
    
    output = json.dumps([{'silhouette_score': silhouette_score, 'db_time': db_time, 'cluster_time': cluster_time, 'total_time': total_time, 'feature_set': feature_set, 'cluster_info': cluster_info.values.tolist(), 'category_labels': category_labels}, df.values.tolist()])
#     output = json.dumps(other_output)

    print output

    #'KMeans', 'MiniBatchKMeans', 'AffinityPropagation', 'MeanShift', 'SpectralClustering', 'AgglomerativeClustering', 'DBSCAN', 'Birch'

main(get_data(True))
