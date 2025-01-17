import re
import os
import sys
from config import ConfigInit
from utils.birdo_pathlib import Path


def convert_type(a, b):
    """Converte o tipo do objeto 'a' pelo tipo do objeto 'b'"""
    c = a
    return eval("{0}({1})".format(str(type(b).__name__), "c"))


class DevTools:
    def __init__(self):
        self.app = ConfigInit(verbose=False)
        self.yes_reg = re.compile(r"(Y|YEP|YES|YEAH|OUI|SIM|SI|S)")
        self.main_menu = {
            "header": "BirdoApp Tools: (digite o numero da opcao)",
            "options": ["Config BirdoApp", "Projetos", "Criar Novo Projeto", "Credits", "[SAIR]"]
        }
        self.last = {
            "title": "",
            "page": None,
            "json": None
        }
        # selected project
        self.project = None

    def back_page(self):
        """Volta para pagina anterior."""
        if not self.last["page"] or self.last["title"] == "MAIN":
            self.show_main_menu()
        elif self.last["page"] == "project_page":
            self.show_project_page()
        else:
            self.config_dict(self.last["title"], self.last["page"])

    def show_version(self):
        """Printa no terminal info do release do birdoApp"""
        msg = ["{0}: {1}".format(x, self.app.data[x]) for x in self.app.data]
        print "\n - ".join(msg)

    def cli_input(self, title, is_question=False, options=None):
        """Formata menu de cli para input do usuario (retorna item da lista escolhido ou boolean)"""
        os.system("cls")
        opt = "\n".join([" -[{0}] {1}".format(i, x) for i, x in enumerate(options)]) if options else ("[Y / N]" if is_question else "")
        msg = " > {0}\n{1}\n >>".format(title, opt)
        r = raw_input(msg)
        if bool(re.match(r"(QUIT\(\)|EXIT\(\))", r.upper())):
            sys.exit("exit...")
        if options:
            i = int(r)
            if not i in range(len(options)):
                raise Exception("Index de opcao invalido!")
            return options[i]
        else:
            if is_question:
                return bool(self.yes_reg.match(str(r).upper()))
            return r

    def update_json(self):
        """Atualiza o json editado pela pagina config_dict"""
        if self.last["json"] == "project":
            self.project.update_json()
        elif self.last["json"] == "app":
            self.app.update_config_json()

    def config_dict(self, title, source_dict):
        """Monta menu com opcoes para edicao do dicionario dado"""
        self.last["title"] = title
        self.last["page"] = source_dict
        opt = source_dict.keys()
        opt.append("[VOLTAR]")
        item = self.cli_input(title, options=opt)
        if type(source_dict[item]) == dict:
            self.last["title"] = title + "n\{0}".format(item)
            self.config_dict(title + "n\{0}".format(item), source_dict[item])
            return
        edited_item = self.cli_input(title + "\n\t-Valor atual: {1}\n\t-Tipo: {2}\nNovo valor de: {0}".format(
            item,
            source_dict[item],
            type(source_dict[item]).__name__
        ))
        if edited_item == "[VOLTAR]":
            self.last["title"] = "MAIN"
            self.back_page()
            return
        edited_item = convert_type(edited_item, source_dict[item])
        if edited_item:
            source_dict[item] = edited_item
            print "Item updated: {0} => {1}".format(item, edited_item)
            self.update_json()
            self.back_page()

    def show_main_menu(self):
        """Mostra o main menu CLI"""
        self.last["title"] = "MAIN"
        r = self.cli_input(self.main_menu["header"], options=self.main_menu["options"])
        # "options": ["Config BirdoApp", "Projetos", "Criar Novo Projeto", "Credits", "[SAIR]"]
        if r == "Config BirdoApp":
            self.last["json"] = "app"
            self.config_dict("Config BirdoApp", self.app.config_data)
        elif r == "Projetos":
            opt = ['{0} ({1})'.format(x["prefix"], x["name"]) for x in self.app.projects]
            opt.append("[VOLTAR]")
            p = self.cli_input("Escolha o Projeto:", options=opt)
            if p == "[VOLTAR]":
                self.back_page()
                return
            self.project = self.app.get_project_data(opt.index(p))
            self.show_project_page()

        elif r == "Criar Novo Projeto":
            self.show_create_project_page()

        elif r == "Credits":
            self.show_version()

        elif r == "[SAIR]":
            print "BirdoApp Tools Fechado!"

    def show_create_project_page(self):
        self.last["title"] = "MAIN"
        create_data = {
            "01_prefix": self.cli_input("Escolha o Prefixo do Projeto:\n(Obrigatoriamente 3 letras):"),
            "02_name": self.cli_input("Escolha o Nome do Projeto:"),
            "03_sub_name": self.cli_input("Escolha o Sub Titulo do projeto:"),
            "04_server_root": self.cli_input("Escolha o caminho do server do projeto:"),
            "05_icon": self.cli_input("Escolha um Arquivo de imagem (png ou ico) com logo do projeto.")
        }
        # checa se o icone fornecido e valido (PNG ou ICO)
        if Path(create_data["05_icon"]).suffix not in [".png", ".ico"]:
            if not self.cli_input(">>icone fornecido e invalido. Precisa ser de formato PNG ou ICO.\n"
                              "Deseja fornecer outro?", is_question=True):
                create_data["05_icon"] = False

        if self.app.create_project(create_data):
            sys.exit("Projeto {0} criado!".format(create_data["01_prefix"]))
        else:
            sys.exit("ERRO criando o Projeto {0}".format(create_data["01_prefix"]))


    def show_project_page(self):
        """Mostra o menu CLI do projeto"""
        opt = ["Conifg", "Episodios", "Criar EP", "[VOLTAR]"]
        r = self.cli_input("Projeto - {0}".format(self.project.name), options=opt)
        if r == "[VOLTAR]":
            self.back_page()
            return
        elif r == "Config":
            self.last["json"] = "project"
            self.config_dict("Config Projeto: {0}".format(self.project.name), self.project.raw_data)

        elif r == "Episodios":
            eps = [x.name for x in self.project.paths.list_episodes("server")]
            eps.append("[VOLTAR]")
            ep = self.cli_input("Escolha o Episodio do projeto: {0}".format(self.project.name), options=eps)
            if ep == "[VOLTAR]":
                self.back_page()
                return
            self.last["page"] = "project_page"
            self.show_ep_page(ep)
        elif r == "Criar EP":
            eps = [x.name for x in self.project.paths.list_episodes("server")]
            ep = self.cli_input("Escolha o nome do ep para criar (EP000):")
            if ep not in eps:
                print "Episodio escolhido ({0}) ja existe no projeto!"
                self.back_page()
                return
            self.project.paths.create_episode_scheme("server", ep)

    def show_ep_page(self, ep):
        """mostra o menu CLI do ep"""
        opts = ["Importar animatics", "Criar pastas", "Criar setup basico das cenas", "[VOLTAR]"]
        r = self.cli_input("Escolha o que deseja fazer com o ep: {0}".format(ep), options=opts)
        if r == "[VOLTAR]":
            self.back_page()
            return
        if r == "Criar pastas":
            self.project.paths.create_episode_scheme("server", ep)
        if r == "Criar setup basico das cenas":
            scenes = self.project.paths.list_scenes_from_animatics(ep)
            for item in scenes:
                print item

    def start(self):
        """inicia o cli do dev"""
        if self.app.is_ready():
            self.show_main_menu()
        else:
            self.last["json"] = "app"
            self.config_dict("Config BirdoApp", self.app.config_data)