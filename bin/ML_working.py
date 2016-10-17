#!/usr/bin/python

import sys, json
import pandas as pd
import numpy as np
from scipy import stats
from sklearn import cluster
from sklearn import metrics
from sklearn.neighbors import kneighbors_graph
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
    cluster_options = {'n_clusters': 4}
    feature_set = 'themes'  # 'questions', 'themes', 'demographics'
else:
    organisation = args[0]
    year = args[1]
    algorithm = args[2]
    cluster_options = json.loads(args[3])
    feature_set = args[4]

# print(items(cluster_options))






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
                sql_statement = sql_statement + str(year) + " AND (`scores`.`measure` LIKE 'B0%' OR `scores`.`measure` LIKE 'B1%' OR `scores`.`measure` LIKE 'B2%' OR `scores`.`measure` LIKE 'B3%' OR `scores`.`measure` LIKE 'B4%' OR `scores`.`measure` LIKE 'B50' OR `scores`.`measure` LIKE 'B51' OR `scores`.`measure` LIKE 'B52' OR `scores`.`measure` LIKE 'B53');"      
            
                if (feature_set == 'questions'):
                    sql_statement = "SELECT `scores`.`organisation` as 'org', `headcount`.`name` as 'organisation', `scores`.`year`, `scores`.`measure`, `scores`.`score`, `headcount`.`number` as 'headcount', `headcount`.`parent`, `headcount`.`parent_acronym` as 'par' FROM `scores` JOIN `headcount` ON `scores`.`organisation` = `headcount`.`acronym` WHERE `scores`.`year` = "
                    sql_statement = sql_statement + str(year) + " AND `headcount`.`year` = "
                    sql_statement = sql_statement + str(year) + " AND (`scores`.`measure` LIKE 'B0%' OR `scores`.`measure` LIKE 'B1%' OR `scores`.`measure` LIKE 'B2%' OR `scores`.`measure` LIKE 'B3%' OR `scores`.`measure` LIKE 'B4%' OR `scores`.`measure` LIKE 'B50' OR `scores`.`measure` LIKE 'B51' OR `scores`.`measure` LIKE 'B52' OR `scores`.`measure` LIKE 'B53');"      

                if (feature_set == 'themes'):
                    sql_statement = "SELECT `scores`.`organisation` as 'org', `headcount`.`name` as 'organisation', `scores`.`year`, `scores`.`measure`, `scores`.`score`, `headcount`.`number` as 'headcount', `headcount`.`parent`, `headcount`.`parent_acronym` as 'par' FROM `scores` JOIN `headcount` ON `scores`.`organisation` = `headcount`.`acronym` WHERE `scores`.`year` = "
                    sql_statement = sql_statement + str(year) + " AND `headcount`.`year` = "
                    sql_statement = sql_statement + str(year) + " AND (`scores`.`measure` = 'RR' OR `scores`.`measure` = 'EEI' OR `scores`.`measure` = 'MW' OR `scores`.`measure` = 'OP' OR `scores`.`measure` = 'LM' OR `scores`.`measure` = 'MT' OR `scores`.`measure` = 'MD' OR `scores`.`measure` = 'IF' OR `scores`.`measure` = 'RW' OR `scores`.`measure` = 'PB' OR `scores`.`measure` = 'LC');"      

                if (feature_set == 'demographics'):
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
    end_db_time = timer()
    db_time = (end_db_time - start_db_time)
    return csps_data




def main(csps_data):
    global db_time, feature_set, global_args
    # n_clusters = cluster_options['n_clusters']
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
        clustered = cluster.DBSCAN(eps=.2)
        
    elif (algorithm == 'Birch'):
        clustered = cluster.Birch(n_clusters=cluster_options['n_clusters'])
        
    else:
        clustered = cluster.KMeans(n_clusters=cluster_options['n_clusters'])
    
    clustered.fit(X)
    silhouette_score = metrics.silhouette_score(X, clustered.labels_, metric='euclidean')
    
    end_cluster_time = timer()
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
    if (feature_set != 'demographics'):
        df['headcount'] = headcount
    else:
        df['headcount'] = np.array([0] * len(df))  #csps_data['headcount']
    df['cluster'] = clusters
    df['org'] = org_acronym
    if (feature_set != 'demographics'):
        df['parent'] = par_acronym
    else:
        #df['parent'] = par_acronym
        #pd.Series(1,index=list(range(4)),dtype='float32')
        df['parent'] = np.array(['x'] * len(df))
    
    end_time = timer()
    cluster_time = (end_cluster_time - start_cluster_time)
    total_time = (end_time - start_time)

    if (algorithm == 'AffinityPropagation'):
        other_output = json.dumps([{'silhouette_score': silhouette_score, 'db_time': db_time, 'cluster_time': cluster_time, 'total_time': total_time}, clustered.cluster_centers_indices_.tolist()])
    
    output = json.dumps([{'silhouette_score': silhouette_score, 'db_time': db_time, 'cluster_time': cluster_time, 'total_time': total_time, 'feature_set': feature_set}, df.values.tolist()])
#     output = json.dumps(other_output)

    print output

    #'KMeans', 'MiniBatchKMeans', 'AffinityPropagation', 'MeanShift', 'SpectralClustering', 'AgglomerativeClustering', 'DBSCAN', 'Birch'

main(get_data(True))
