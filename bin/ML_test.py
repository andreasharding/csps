#!/usr/bin/python

import sys, json
# import pandas as pd
# import numpy as np
# from scipy import stats
# from sklearn import cluster
# from sklearn.decomposition import PCA
# import pymysql.cursors

# sql_statement = ''
# output = ''
# csps_data = ''
args = []


for v in sys.argv[1:]:
    args.append(v)






def get_data(use_mysql):
    csps_data = 'result of get_data'
    return csps_data




def main(csps_data):
    other_output = 'main + ' + csps_data + ' ' + str(len(args))
    for arg in args:
        other_output = other_output + ' - ' + arg
    output = json.dumps(other_output)

    print output


if __name__ == "__main__":
    organisation = ''
    year = 2014
    algorithm = 'AffinityPropagation'
    cluster_options = {'n_clusters': 7}
    data_group = 'questions'
    main(get_data(True))
else:
    main(get_data(True))
