import owncloud
from utils.enc_dec import PswEncDec


class NextcloudServer(object):
    """
    Sub-Class from config_project with data and methods for server
    ...

    Parameters
    ----------
    server_data : dict
        a dictionary with server information (from config_init() function))
    server_paths : dict
        a dictionary with all the server path information (from project server_DATA.json)
    """
    def __init__(self, server_data, server_paths):
        for key in server_data:
            setattr(self, key, server_data[key])
        # temp decodification variable
        encdec = PswEncDec()

        # lista com itens para nao entrarem no doc!
        self.doc_exclude = ['doc_exclude', 'oc', 'define_roots']

        # Try to connect to NC server
        try:
            self.oc = owncloud.Client(server_data["url"])
            self.oc.login(server_data["login"]["user"], encdec.dec(server_data["login"]["pw"]))
            self.status = "Online"
            print "server is online!"
        except:
            print "server is offline!"
            self.status = "Offline"

        # create server root values
        self.root = ""
        self.has_root = False
        self.roots_extras = []
        self.define_roots(server_paths)

    def __setitem__(self, key, value):
        setattr(self, key, value)

    def define_roots(self, server_paths):
        """
        Updates server root values in this object. (Used only in __init__ function)
        ...

        Parameters
        ----------
        server_paths : dict
           a dictionary with server paths information (config_project.paths)
        ----------
        RETURN: None
        """
        if self.status == "Online":
            folder_list = filter(lambda x: x.file_type == 'dir', self.oc.list("."))
            if not folder_list:
                print "Root folders vazios no Server! Possivelmente nao ha pastas compartilhadas com este usuario!"
            else:
                extra_roots = []
                for item in folder_list:
                    root_path = item.path[1:]
                    if root_path == server_paths['root']:
                        self.__setitem__("has_root", True)
                        self.__setitem__("root", (server_paths['root'] + server_paths['projRoot']))
                    elif root_path in server_paths.values():
                        print "extra root found: {0}".format(root_path)
                        extra_roots.append(root_path)
                self.__setitem__("roots_extras", extra_roots)
        print "Nextcloud Server roots defined!"

    def check_connection(self):
        """
        Check if server is still online
        ...

        RETURN: True or False
        """
        if not self.oc.file_info(self.root):
            return False
        else:
            return True

    def list_folder(self, folder):
        """
        List items inside folder
        ...

        Parameters
        ----------
        folder : sting
            folder path to list
        ----------

        RETURN: list of file data objects from folder
        """
        try:
            content_list = self.oc.list(folder)
        except:
            print 'Error listing file: {0}'.format(folder)
            return False
        return content_list

    def download_file(self, server_file_path, local_file_destination):
        """
        Downloads server file from 'server_file_path' to 'local_file_destination'
        ...

        Parameters
        ----------
        server_file_path : string
            file path to download from server
        local_file_destination: string
            local path destination of the file
        ----------

        RETURN: bool
        """
        try:
            download = self.oc.get_file(server_file_path, local_file_destination)
        except:
            print 'Fail to download file: {0} to {1}'.format(server_file_path, local_file_destination)
            return False
        return download

    def update_file_content(self, server_file_path, data):
        """
        Updates file content on server
        ...

        Parameters
        ----------
        server_file_path : string
            path of the file to be changed
        data: string
            value to update file
        ----------

        RETURN: bool
        """
        try:
            update = self.oc.put_file_contents(server_file_path, data)
        except:
            print 'Fail to update file: {0}'.format(server_file_path)
            return False
        return update

    def upload_file(self, server_file_path, local_file_path):
        """
        Upload file from local path to server path
        ...

        Parameters
        ----------
        server_file_path : string
            path of the destiny file in server
        local_file_path: string
            path of the local file to be uploaded to server
        ----------

        RETURN: bool
        """
        try:
            upload = self.oc.put_file(server_file_path, local_file_path)
        except:
            print 'Fail to upload file: {0} to {1}'.format(server_file_path, local_file_path)
            return False
        return upload

    def upload_dir(self, server_dir, local_dir):
        """
        Upload directory from local path to server path
        ...

        Parameters
        ----------
        server_dir : string
            path of the destiny directory in server
        local_dir: string
            path of the local directory to be uploaded to server
        ----------

        RETURN: bool
        """
        try:
            upload = self.oc.put_directory(server_dir, local_dir)
        except:
            print 'Fail to upload dir: {0} to {1}'.format(local_dir, server_dir)
            return False
        return upload

    def get_file_content(self, server_file):
        """
        Download data from file in server
        ...

        Parameters
        ----------
        server_file : string
            path of file in the server
        ----------

        RETURN: binary
        """
        try:
            content = self.oc.get_file_contents(server_file)
        except:
            print 'Fail to get file content: {0}'.format(server_file)
            return False
        return content

    def get_file_info(self, server_file):
        """
        Get file info from server
        ...

        Parameters
        ----------
        server_file : string
            path of file in the server
        ----------

        RETURN: object
        """
        try:
            content = self.oc.file_info(server_file)
        except:
            print 'Fail to get file info: {0}'.format(server_file)
            return False
        return content

    def make_dir(self, server_dir):
        """
        Create directory in server
        ...

        Parameters
        ----------
        server_dir : string
            path of directory in the server to be created
        ----------

        RETURN: bool
        """
        try:
            dir_create = self.oc.mkdir(server_dir)
        except:
            print 'Fail to create dir: {0}'.format(server_dir)
            return False
        return dir_create

    def delete(self, item_path):
        """
        Delete file or folder in the server
        ...

        Parameters
        ----------
        item_path : string
            path of directory, or file in the server to be deleted
        ----------

        RETURN: bool
        """
        try:
            delete_item = self.oc.delete(item_path)
        except:
            print 'Fail to delete item: {0}'.format(item_path)
            return False
        return delete_item

    def download_dir_as_zip(self, server_dir, local_zip):
        """
        Download directory from Server to a local zip file
        ...

        Parameters
        ----------
        server_dir : string
            path of directory in server to download
        local_zip : string
            local zip destiny file path
        ----------

        RETURN: bool
        """
        try:
            download = self.oc.get_directory_as_zip(server_dir, local_zip)
        except:
            print 'Fail to download dir: {0} as the zip {1}'.format(server_dir, local_zip)
            return False
        return download

    def ensure_folder_exists(self, server_dir):
        """
        Checks if directory path exists, and if not, create it
        ...

        Parameters
        ----------
        server_dir : string
            path of directory in server
        ----------

        RETURN: bool
        """
        if not self.get_file_info(server_dir):
            print '--creating folder {0}'.format(server_dir)
            return self.make_dir(server_dir)
        else:
            return True

    def logout(self):
        """
        Disconnect from server (Nextcloud user)
        ...

        RETURN: None
        """
        self.oc.logout()
        print 'disconnected from nc server!'


def format_file_info(file_data):
    """
    Format the file_info class object into a simpler object
    ...

    Parameters
    ----------
    file_data : object
        file object
    ----------

    RETURN: object
    """
    format_object = {"type": file_data.file_type,
                     "etag": file_data.get_etag().replace("\"", ""),
                     "last_modified": file_data.get_last_modified().isoformat(),
                     "name": file_data.get_name(),
                     "path": file_data.get_path(),
                     "size": file_data.get_size()
                     }
    return format_object
