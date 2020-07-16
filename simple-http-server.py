# to create the SSL cert and key:
# openssl req -x509 -sha256 -nodes -days 365 -newkey rsa:2048 -keyout newkey.key -out newkey.crt

import BaseHTTPServer, SimpleHTTPServer
import ssl

# 0.0.0.0 allows connections from anywhere
httpd = BaseHTTPServer.HTTPServer(('0.0.0.0', 8080), SimpleHTTPServer.SimpleHTTPRequestHandler)
httpd.socket = ssl.wrap_socket (httpd.socket, certfile='./newkey.crt', keyfile='./newkey.key', server_side=True)
httpd.serve_forever()
