import string,cgi,time
from os import curdir, sep
from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
# import MySQLdb
# from lxml import etree
# from lxml.builder import E as buildE
import urllib

global db, cnn

# db = MySQLdb.connect("localhost","root","password","schema" )
# cnn = db.cursor()


class MyHandler(BaseHTTPRequestHandler):

    def do_GET(self):
#         global cnn, sql
        
        data="Cannot GET "+self.path
#         self.send_response(200)
#         self.send_header('Content-type','text/xml')
#         self.send_header('Content-length',str(len(data))
#         self.end_headers()
        self.wfile.write(data)


    def do_POST(self):
        global rootnode
        try:
            ctype, pdict = cgi.parse_header(self.headers.getheader('content-type'))
            if ctype == 'multipart/form-data':
                query=cgi.parse_multipart(self.rfile, pdict)
            self.send_response(301)

            self.end_headers()
            upfilecontent = query.get('upfile')
            print "filecontent", upfilecontent[0]
            self.wfile.write("<HTML>POST OK.<BR><BR>");
            self.wfile.write(upfilecontent[0]);

        except :
            pass



def main():
    try:
        server = HTTPServer(('', 8012), MyHandler)
        print 'started httpserver...'
        server.serve_forever()
    except KeyboardInterrupt:
        print '^C received, shutting down server'
        server.socket.close()

if __name__ == '__main__':
    main()