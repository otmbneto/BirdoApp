import os
import shutil
from tqdm import tqdm
from datetime import datetime
import re

# TODO: testar todos os metodos (principalmente os de copy)


class Path:
    """Classe que junta opcoes para lidar com arquivos e pastas."""
    def __init__(self, path):
        self.path = path.replace("\\", "/")
        self.name = os.path.basename(path)
        self.parent = os.path.dirname(path)
        self.suffix = os.path.splitext(path)[-1]
        self.suffixes = os.path.splitext(path)[1:]
        self.stem = os.path.splitext(path)[0]

    def __str__(self):
        return self.path

    def __div__(self, other):
        if other == "":
            return Path(self.path)
        return Path(os.path.join(self.path, str(other)))

    def normpath(self):
        return os.path.normpath(self.path)

    def is_dir(self):
        """retorna boolean se o caminho e um folder"""
        return os.path.isdir(self.path)

    def is_file(self):
        """retorna boolean se o caminho e de um arquivo"""
        return os.path.isfile(self.path)

    def exists(self):
        """retorna boolean se o caminho existe"""
        return os.path.exists(self.path)

    def get_last_modified(self):
        """retorna objeto de datetime com ultima modificacao"""
        timestamp = os.path.getmtime(self.path)
        return datetime.fromtimestamp(int(timestamp))

    def get_size(self):
        """retorna tamanho do arquivo em bites"""
        return os.path.getsize(self.path)

    def get_relative_path(self, relative_to):
        return Path("/" + os.path.relpath(self.path, relative_to))

    def is_relative_path(self):
        return self.path.startswith("/")

    def make_dirs(self):
        """cria folders"""
        if self.is_file():
            raise Exception("Make dirs error: destiny is not a folder.")
        return os.makedirs(self.path)

    def read_text(self):
        if self.is_dir():
            raise Exception("Failed to read_text: Object is NOT a file!")
        with open(self.path, "r") as f:
            return f.read()

    def copy_file(self, dst_file, buffer_size=1024 * 1024, force_copy=True, pb=None):
        """
            copia o arquivo com progress bar
            pb = (passe uma widget como progressbar para atualziar nela em vez do tqdm)
        """
        dst = Path(str(dst_file))
        if dst.is_dir():
            if not dst.exists():
                raise Exception("Copy File error: destiny path does not exist!")
            dst = dst / self.name

        if dst.exists() and not force_copy:
            ask = raw_input("COPY_FILE: Destiny file {0} already exists. Do you want to override it?\n[y/n]".format(dst))
            if not bool(re.match(r"(Y|YEP|YES|YEAH|OUI|SIM|SI|S)", ask.upper())):
                raise Exception("file copy canceled!")

        file_size = self.get_size()
        if not pb:
            pbar = tqdm(total=file_size, unit="B", unit_scale=True, unit_divisor=1024,
                        leave=False, desc='Copying {0}'.format(self.name))
        else:
            pbar = pb
            pbar.setRange(0, file_size)
        try:
            with open(self.path, "rb") as src, open(str(dst), "wb") as dest:
                while True:
                    buff = src.read(buffer_size)
                    if not buff:
                        break
                    dest.write(buff)
                    if not pb:
                        pbar.update(len(buff))
                    else:
                        pbar.setValue(len(buff))
            print "file copied from: {0} to {1}".format(self.path, dst)
        except Exception as e:
            raise e
        return True

    def copy_folder(self, destiny):
        """
            Copia folder tree para o destino.
            se o destino existir, cria um folder extra com o nome da origem.
        """
        # Copy directory
        if not self.is_dir():
            raise Exception("Error copying folder: origin is not an existing folder!")

        dst = Path(str(destiny))
        counter = 0
        if dst.exists():
            dst = dst / self.name
            dst.make_dirs()
        try:
            for item in tqdm(self.glob("*"), leave=False, desc='Copying {0}'.format(self.name)):
                if item.is_dir():
                    shutil.copytree(item.path, str(dst / item.name))
                else:
                    shutil.copy(item.path, dst.path)
                counter += 1
        except Exception as e:
            raise e
        print "{0} items copied...".format(counter)
        return True

    def glob(self, pattern):
        """Lista sub arquivos do folder"""
        if not self.is_dir():
            raise Exception("Not a folder to list!")
        if not self.exists():
            raise Exception("Cant list folder that does not exist!")
        reg = re.compile(pattern.replace("*", r".+"))
        return [
            self / x for x in
            filter(lambda y: bool(reg.match(y)), os.listdir(self.path))
        ]


if __name__ == "__main__":
    src = Path(r"C:\_BirdoRemoto\PROJETOS\BIRDO_TESTES_RIGGER")
    print src.parent