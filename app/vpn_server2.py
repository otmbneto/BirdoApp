import os
import shutil
from utils.birdo_zip import compact_folder
from datetime import datetime

#NOTE: adptacao da classe criada para o nextcloud para o vpn usando o os do python
# OBS: criar objetos de arquivos iguais ao que existe no modulo do owncloud


class FileObject:
    """Classe que simula objeto de arquivo do modulo do owncloud usando o os"""
    def __init__(self, file_path):
        self.path = file_path
        self.file_type = "file" if os.path.isfile(file_path) else "dir"
        self.status = None

    def get_last_modified(self):
        """retorna a data da ultima modificacao"""
        timestamp = os.path.getmtime(self.path)
        return datetime.fromtimestamp(int(timestamp))

    def get_name(self):
        """retorna o nome do arquivo ou folder"""
        return os.path.basename(self.path)

    def get_path(self):
        """retorna o caminho do arquivo sem o nome"""
        return os.path.dirname(self.path)

    def get_size(self):
        """retorna o tamanho do arquivo em bites"""
        return os.path.getsize(self.path)

    def get_etag(self):
        """simula o etag do objeto do ownlcloud com o timestamp q e um numero unico"""
        return str(os.path.getmtime(self.path)).replace(".", "e")


class VPNServer(object):
    """Classe para manipular arquivos no server vpn do Projeto"""
    def __init__(self, server_data, server_paths):

        for key in server_data:
            setattr(self, key, server_data[key])

        self.server_root = server_paths['root']
        self.server_paths = server_paths

        for item in server_data:
            self[item] = server_data[item]

    def get_roots(self):
        """mantive essa funcao pra simular o esquema de root do nextcloud, mas nesse caso sempre tera root"""
        root_object = {"has_root": True, "roots": [self.server_root]}

        if not os.path.exists(self.server_root):
            print "vpn is not connecterd to the server!"
            return False
        return root_object

    def list_folder(self, folder):
        """lista os itens no folder"""
        final_list = []
        try:
            content_list = os.listdir(folder)
        except:
            print 'Error listing file: {0}'.format(folder)
            return False
        for item in content_list:
            path = os.path.join(folder, item)
            final_list.append(FileObject(path))
        return final_list

    def download_file(self, server_file_path, local_file_destination):
        """Download de arquivo do Server para um caminho local"""
        try:
            shutil.copyfile(server_file_path, local_file_destination)
            print "file downloaded: {0}".format(server_file_path)
        except:
            print 'Fail to download file: {0} to {1}'.format(server_file_path, local_file_destination)
            return False
        return True

    def update_file_content(self, server_file_path, data):
        """atualiza conteudo de arquivo no server"""
        try:
            with open(server_file_path, 'w') as f:
                f.write(data)
            print "file updated {0}".format(server_file_path)
        except:
            print 'Fail to update file: {0}'.format(server_file_path)
            return False
        return True

    def upload_file(self, server_file_path, local_file_path):
        """Upload de arquivo local para o Server"""
        if not os.path.exists(local_file_path):
            print "uploading file error: local file does not exist >> {0}".format(local_file_path)
            return False
        if not os.path.exists(os.path.dirname(server_file_path)):
            print "uploading file error: destiny folder in server does not exist! >> {0}".format(os.path.dirname(server_file_path))
            return False
        try:
            shutil.copyfile(local_file_path, server_file_path)
            print 'file uploaded to server: {0}'.format(server_file_path)
        except:
            print 'Fail to upload file: {0} to {1}'.format(local_file_path, server_file_path)
            return False
        return True

    def upload_dir(self, server_dir, local_dir):
        """Upload de folder local para o Server"""
        try:
            shutil.copytree(local_dir, server_dir)
            print 'folder uploaded to server: {0}'.format(server_dir)
        except:
            print 'Fail to upload dir: {0} to {1}'.format(local_dir, server_dir)
            return False
        return True

    def get_file_content(self, server_file):
        """Download data from file in server"""
        try:
            with open(server_file, 'r') as f:
                content = f.read()
        except:
            print 'Fail to get file content: {0}'.format(server_file)
            content = False
        return content

    def get_file_info(self, server_file):
        """Download data from file in server"""
        if not os.path.exists(server_file):
            print "path does not exist in server: {0}".format(server_file)
            return False
        try:
            content = FileObject(server_file)
        except:
            print 'Fail to get file info: {0}'.format(server_file)
            return False
        return content

    def make_dir(self, server_dir):
        """Crate a folder in the Server"""
        try:
            os.makedirs(server_dir)
            print "folder created in server: {0}".format(server_dir)
        except:
            print 'Fail to create dir: {0}'.format(server_dir)
            return False
        return True

    def delete(self, item_path):
        """deletes file or folder in the server"""
        try:
            os.remove(item_path)
            print "item removed from server: {0}".format(item_path)
        except:
            print 'Fail to delete item: {0}'.format(item_path)
            return False
        return True

    def download_dir_as_zip(self, server_dir, local_zip):
        """download a folder from Server to a zip file"""
        try:
            compact_folder(server_dir, local_zip)
            print 'folder downloaded as a zip: {0}'.format(server_dir)
        except:
            print 'Fail to download dir: {0} as the zip {1}'.format(server_dir, local_zip)
            return False
        return True

    def ensure_folder_exists(self, folder):
        """garante q o folder existe no server"""
        if not os.path.exists(folder):
            print '--creating folder {0}'.format(folder)
            return self.make_dir(folder)
        else:
            return True

    def logout(self):
        """disconnect from oc server"""
        print "placeholder function... vpn does not need to unconnect!"