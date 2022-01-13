# to create the SSL cert and key:
# openssl req -x509 -sha256 -nodes -days 365 -newkey rsa:2048 -keyout newkey.key -out newkey.crt

from http.server import HTTPServer,SimpleHTTPRequestHandler
import ssl

httpd = HTTPServer(('0.0.0.0', 8080), SimpleHTTPRequestHandler)
sslctx = ssl.SSLContext()
sslctx.check_hostname = False # If set to True, only the hostname that matches the certificate will be accepted
sslctx.load_cert_chain(certfile='./newkey.crt', keyfile="./newkey.key")
httpd.socket = sslctx.wrap_socket(httpd.socket, server_side=True)
httpd.serve_forever()
