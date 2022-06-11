import owncloud
from enc_dec import PswEncDec

#NOTE: usar este modulo para testar conexao como  Nextcloud e fazer as transferencias


class NextcloudServer:
    """Classe para manipular arquivos no server do Nextcloud do Projeto"""
    def __init__(self, server_data, server_paths):
        self.server_root = "/" + server_paths['root']
        self.path_list = server_paths.values()
        self.encdec = PswEncDec()
        self.oc = owncloud.Client(server_data["url"])
        self.oc.login(server_data["login"]["user"], self.encdec.dec(server_data["login"]["pw"]))

    def get_roots(self):
        """Checa se conectou com o Server, e retorna a lista de folders da Root no Server"""
        root_object = {"has_root": False, "roots": []}
        try:
            folder_list = filter(lambda x: x.file_type == 'dir', self.oc.list("."))
            if not folder_list:
                print "Root folders vazios no Server! Possivelmente nao ha pastas compartilhadas com este usuario!"
                return False
            for item in folder_list:
                if item.path == self.server_root:
                    root_object["has_root"] = True
                elif item.path[1:] in self.path_list:
                    root_object["roots"].append(item.path[1:])
        except Exception as e:
            print str(e)
            print "Erro de login no Nextcloud!"
            return False
        return root_object

    def list_folder(self, folder):
        """lista os itens no folder do nextcloud"""
        try:
            content_list = self.oc.list(folder)
        except:
            print 'Error listing file: {0}'.format(folder)
            return False
        return content_list

    def download_file(self, server_file_path, local_file_destination):
        """Download de arquivo do Server para um caminho local"""
        try:
            download = self.oc.get_file(server_file_path, local_file_destination)
        except:
            print 'Fail to download file: {0} to {1}'.format(server_file_path, local_file_destination)
            return False
        return download

    def update_file_content(self, server_file_path, data):
        """atualiza conteudo de arquivo no server"""
        try:
            update = self.oc.put_file_contents(server_file_path, data)
        except:
            print 'Fail to update file: {0}'.format(server_file_path)
            return False
        return update

    def upload_file(self, server_file_path, local_file_path):
        """Upload de arquivo local para o Server"""
        try:
            upload = self.oc.put_file(server_file_path, local_file_path)
        except:
            print 'Fail to upload file: {0} to {1}'.format(server_file_path, local_file_path)
            return False
        return upload

    def upload_dir(self, server_dir, local_dir):
        """Upload de folder local para o Server"""
        try:
            upload = self.oc.put_directory(server_dir, local_dir)
        except:
            print 'Fail to upload dir: {0} to {1}'.format(local_dir, server_dir)
            return False
        return upload

    def get_file_content(self, server_file):
        """Download data from file in server"""
        try:
            content = self.oc.get_file_contents(server_file)
        except:
            print 'Fail to get file content: {0}'.format(server_file)
            return False
        return content

    def get_file_info(self, server_file):
        """Download data from file in server"""
        try:
            content = self.oc.file_info(server_file)
        except:
            print 'Fail to get file info: {0}'.format(server_file)
            return False
        return content

    def make_dir(self, server_dir):
        """Crate a folder in the Server"""
        try:
            dir_create = self.oc.mkdir(server_dir)
        except:
            print 'Fail to create dir: {0}'.format(server_dir)
            return False
        return dir_create

    def delete(self, item_path):
        """deletes file or folder in the server"""
        try:
            delete_item = self.oc.delete(item_path)
        except:
            print 'Fail to delete item: {0}'.format(item_path)
            return False
        return delete_item

    def download_dir_as_zip(self, server_dir, local_zip):
        """download a folder from Server to a zip file"""
        try:
            download = self.oc.get_directory_as_zip(server_dir, local_zip)
        except:
            print 'Fail to download dir: {0} as the zip {1}'.format(server_dir, local_zip)
            return False
        return download

    def ensure_folder_exists(self, folder):
        """garante q o folder existe no server"""
        if not self.get_file_info(folder):
            print '--creating folder {0}'.format(folder)
            return self.make_dir(folder)
        else:
            return True

    def logout(self):
        """disconnect from oc server"""
        self.oc.logout()
        print 'disconnected from nc server!'


def format_file_info(file_data):
    """Format the file_info class object into a simpler object"""
    format_object = {"type": file_data.file_type,
                     "etag": file_data.get_etag().replace("\"", ""),
                     "last_modified": file_data.get_last_modified().isoformat(),
                     "name": file_data.get_name(),
                     "path": file_data.get_path(),
                     "size": file_data.get_size()
                     }
    return format_object
