import socket
import threading
from PySide import QtCore

class ServerThread(QtCore.QObject):
    
    message_received = QtCore.Signal(str)
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
            if data:
                self.message_received.emit(data)
                client.send("OK")

        except Exception as e:
            print(e)

        finally:
            client.close()