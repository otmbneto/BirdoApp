import socket
import threading
from PySide import QtCore
from BaseHTTPServer import HTTPServer, BaseHTTPRequestHandler
import threading
import json


class RequestHandler(BaseHTTPRequestHandler):

    callback = None

    def do_POST(self):

        length = int(self.headers['Content-Length'])
        body = self.rfile.read(length)

        try:
            data = json.loads(body)

            if RequestHandler.callback:
                RequestHandler.callback(data)

            response = {
                "success": True
            }

        except Exception as e:

            response = {
                "success": False,
                "error": str(e)
            }

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()

        self.wfile.write(json.dumps(response))

    def log_message(self, format, *args):
        pass


class HttpServerThread(QtCore.QObject):

    message_received = QtCore.Signal(object)
    def __init__(self, host="127.0.0.1", port=5001):
        super(HttpServerThread, self).__init__()

        self.host = host
        self.port = port

        self.server = None
        self.thread = None

    def start(self):

        RequestHandler.callback = self.on_request

        self.server = HTTPServer((self.host, self.port),RequestHandler)

        self.thread = threading.Thread(target=self.server.serve_forever)

        self.thread.daemon = True
        self.thread.start()

        print("HTTP Server Started")

    def stop(self):

        if self.server:

            self.server.shutdown()
            self.server.server_close()

            print("HTTP Server Stopped")

    def on_request(self, data):

        # This signal is thread-safe
        self.message_received.emit(data)

class ServerThread(QtCore.QObject):
    
    message_received = QtCore.Signal(object)
    def __init__(self, host="127.0.0.1", port=5000):
        super(ServerThread, self).__init__()

        self.host = host
        self.port = port
        self.running = False
        self.server_socket = None
        self.thread = None

    def start(self):

        self.running = True
        self.thread = threading.Thread(target=self.server_loop)
        self.thread.daemon = True
        self.thread.start()

    def stop(self):

        self.running = False
        if self.server_socket:
            try:
                self.server_socket.close()
            except:
                pass

    def server_loop(self):

        self.server_socket = socket.socket(socket.AF_INET,socket.SOCK_STREAM)
        self.server_socket.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1)
        self.server_socket.bind((self.host, self.port))
        self.server_socket.listen(5)
        print("Server listening on %s:%s" % (self.host, self.port))
        while self.running:
            try:

                client, addr = self.server_socket.accept()
                t = threading.Thread(target=self.handle_client,args=(client,))
                t.daemon = True
                t.start()

            except Exception as e:
                print(e)

    def handle_client(self, client):
       
        try:

            data = client.recv(4096)
            print(data)
            if data:
                data = json.loads(data)
                self.message_received.emit(data)
                client.send("OK")

        except Exception as e:
            print(e)

        finally:
            client.close()