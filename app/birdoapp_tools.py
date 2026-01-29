# -*- coding: utf-8 -*-
import re
import os
import sys
import subprocess
import codecs
from config import ConfigInit
from utils.birdo_pathlib import Path
from utils.birdo_zip import compact_folder
sys.stdout = codecs.getwriter('utf-8')(sys.stdout)


class DevTools:
    def __init__(self):
        self.app = ConfigInit(verbose=False)
        self.yes_reg = re.compile(r"(Y|YEP|YES|YEAH|OUI|SIM|SI|S)")
        self.main_menu = {
            "header": "**Menu Principal.**\nEscolha uma opcao:",
            "options": ["Configurar BirdoApp", "Projetos", "Criar Novo Projeto", "Sobre", "Termos Legais", "[SAIR]"]
        }

        # selected project
        self.project = None
        # gum executable
        self.gum = Path(self.app.root) / "extra/gum.exe"

    def pause(self):
        """da um pause na cli"""
        os.system("pause")

    def print_title(self, lines):
        """printa um titulo estilizado com gum"""
        cmd = [
            self.gum.path,
            "style", "--foreground", "212", "--border-foreground", "212", "--border", "double", "--align",
            "center", "--width", "50", "--margin", "\"1 2\"", "--padding", "\"2 4\""
        ]
        cmd += lines
        subprocess.call(cmd)

    def confirm(self, question):
        """usa o gum pra perguntar pro usuario confirmar ação."""
        cmd = u'cmd /c {0}  confirm "{1}" --affirmative="Sim" --negative="Nao"'.format(self.gum.normpath(), question)
        try:
            return os.system(cmd.encode('utf-8')) == 0
        except Exception as e:
            print e
            sys.exit("cancelado!")

    def show_about(self):
        """Printa no terminal info do release do birdoApp"""
        cmd_credits = [
            self.gum.normpath(),
            "format",
            "--",
            u'# Creditos\n- {0}'.format(self.app.data['credits']),
            u'# Release\n- {0} ({1})'.format(self.app.data['release_notes'], self.app.data['release_date'])
        ]
        subprocess.call(cmd_credits)
        credits_md = Path(self.app.root) / "CREDITOS.md"
        cmd = 'cmd /c type {0} | {1} format --type="markdown"'.format(credits_md.normpath(), self.gum.normpath())
        sys.exit(subprocess.call(cmd))

    def show_terms(self):
        """Printa no terminal os termos do birdoapp usando o gum"""
        md = Path(self.app.root) / "TERMS.md"
        cmd = 'cmd /c type {0} | {1} format --type="markdown" | {1} pager'.format(md.normpath(), self.gum.normpath())
        sys.exit(subprocess.call(cmd))

    def print_header(self):
        """desenha o header fixo do birdoapp dev"""
        os.system("cls")
        self.print_title([u"BirdoApp {0}".format(self.app.data["release"]), u"Modo Produtor!"])

    def get_input(self, header, placeholder):
        """Get input via gum"""
        self.print_header()
        cmd = [
            self.gum.path,
            "input",
            "--header",
            "\"{0}\"".format(header),
            "--placeholder=\"{0}\"".format(placeholder)
        ]
        try:
            r = subprocess.check_output(cmd)
            return r.strip().replace("\"", "")
        except:
            sys.exit("cancelado!")

    def choose_from_list(self, header, options):
        """usa o gum para escolher um item da lista"""
        self.print_header()
        cmd = [
            self.gum.path,
            "choose",
            "--header",
            "\"{0}\"".format(header)
        ]
        cmd += ["\"{0}\"".format(x) for x in options]
        try:
            r = subprocess.check_output(cmd)
            return r.strip().replace("\"", "")
        except:
            sys.exit("cancelado!")

    def is_valid_name(self, name):
        """valida o nome escolhido"""
        if " " in name:
            return False
        for i in name:
            n = ord(i)
            if not (32 <= n < 127):
                return False
        return True

    def show_main_menu(self):
        """Mostra o main menu CLI"""
        r = self.choose_from_list(self.main_menu["header"], self.main_menu["options"])
        if r == "Configurar BirdoApp":
            self.show_config_app_page()
        elif r == "Projetos":
            self.show_choose_project_page()
        elif r == "Criar Novo Projeto":
            self.show_create_project_page()
        elif r == "Sobre":
            self.show_about()
        elif r == "Termos Legais":
            self.show_terms()
        elif r == "[SAIR]":
            sys.exit("BirdoApp Tools Fechado!")

    def show_config_app_page(self):
        """inicia a pagina de config inicial do BirdoApp"""
        # cria new config na ordem
        confirm_studio = False
        r = ""
        while confirm_studio is False:
            r = self.get_input(u"Escolha o nome do estúdio:".encode(sys.getfilesystemencoding()), "Escreva aqui...")
            confirm_studio = self.confirm("Confirma estudio: {0}?".format(r))
        self.app.config_data["studio_name"] = r

        server_path = ""
        while not os.path.exists(server_path):
            server_path = self.get_input(u"Defina o caminho na rede para salvar as configurações de projetos:".encode(sys.getfilesystemencoding()),
                                         "Cole o caminho aqui...")
            if not os.path.exists(server_path):
                print "Aparentemente o caminho fornecido esta inacessivel!"
                self.pause()
        self.app.config_data["server_projects"] = server_path

        while True:
            user_name = self.get_input(
                u"Escolha um nome único de usuário para esta maquina.".encode(sys.getfilesystemencoding()),
                "Escreva o nome aqui..."
            )
            if not bool(user_name):
                sys.exit("Nome invalido!")
            elif not self.is_valid_name(user_name):
                sys.exit("O nome nao pode conter espacos ou caracteres especiais.")
            else:
                break
        self.app.config_data["user_name"] = user_name

        h = self.choose_from_list(
            "Escolha uma das versoes de Harmony"
            " instaladas em seu computador:",
            [x.get_name() for x in self.app.harmony_versions])

        self.app.config_data["harmony_path"] = next(
            (x for x in self.app.harmony_versions if x.get_name() == h),
            None).installation_path

        # atualiza o config object
        self.app.update_config_json()
        print "Configuracao do BirdoApp atualizado!"
        self.pause()
        self.app = ConfigInit(verbose=False)
        self.show_main_menu()

    def show_config_local_proj_page(self):
        """mostra a pagina de configuracao local do projeto"""
        user_proj = {
            "id": self.project.id,
            "local_folder": self.get_input("Escolha o folder local do projeto:", "Cole o caminho aqui."),
            "user_role": self.choose_from_list("Escolha um papel no projeto:", self.project.roles)
        }

        # test local folder
        if not Path(user_proj["local_folder"]).exists():
            sys.exit("ERRO: Folder local do projeto escolhido nao existe!")
        # test user role
        if not bool(user_proj["user_role"]):
            sys.exit("ERRO: Nao foi escolhido um papel valido do projeto!")

        # update config json
        self.app.config_data["user_projects"].append(user_proj)
        self.app.update_config_json()
        self.app = ConfigInit(verbose=False)
        self.project = self.app.get_project_data(user_proj["id"])

        print "projeto {0} configurado!".format(self.project.name)
        self.pause()
        self.show_project_page()

    def show_create_project_page(self):
        while True:
            prefix = self.get_input("Escolha um prefixo para o projeto"
                                    " (formato 'ABC'):",
                                    "Escreva aqui...").upper()
            if not bool(self.app.prefix_reg.match(prefix)):
                sys.exit("O prefixo deve ter 3 ou 4 letras exatamente.")
            break

        create_data = {
            "01_prefix": prefix,
            "02_name": self.get_input("Escolha o nome do projeto:",
                                      "Escreva aqui..."),
            "03_sub_name": self.get_input(u"Escolha o subtítulo do projeto:".encode(sys.getfilesystemencoding()),
                                          "Escreva aqui..."),
            "04_server_root": self.get_input("Escolha o caminho da "
                                             "raiz do projeto:",
                                             "Cole aqui..."),
            "05_icon": False
        }

        while True:
            icon = self.get_input(u"Forneça caminho de um arquivo de imagem com logo do projeto:".encode(sys.getfilesystemencoding()), "Cole o caminho aqui! (formatos aceitos: .png ou .ico)")
            if Path(icon).suffix not in [".png", ".ico"]:
                if self.confirm("Formato invalido. Deseja escolher um novo icone?"):
                    continue
            else:
                create_data["05_icon"] = icon
            break

        if self.app.create_project(create_data):
            print "Projeto {0} criado!".format(create_data["01_prefix"])
        else:
            sys.exit("ERRO criando o Projeto {0}".format(create_data["01_prefix"]))
        self.pause()
        self.show_main_menu()

    def show_choose_project_page(self):
        """Mostra a pagina de escolha do projeto"""
        opt = ['{0} ({1})'.format(x["prefix"], x["name"]) for x in self.app.projects]
        opt.append("[VOLTAR]")
        p = self.choose_from_list("Escolha o Projeto:", opt)
        if p == "[VOLTAR]":
            self.show_main_menu()
            return
        self.project = self.app.get_project_data(opt.index(p))
        self.show_project_page()

    def show_project_page(self):
        """mostra a pagina do projeto selecionado"""
        if not self.project.ready:
            self.show_config_local_proj_page()
            if not self.project.ready:
                sys.exit("ERRO! Projeto ainda nao configurado corretamente...")

        opt = ["Episodios / Sequencias", "Criar EP / SQ", "[VOLTAR]"]
        eps = [x.name for x in self.project.paths.list_episodes("server")]
        r = self.choose_from_list("Projeto {0}".format(self.project.name), opt)
        if r == "[VOLTAR]":
            self.show_choose_project_page()
            return
        elif r == "Episodios / Sequencias":
            eps.append("[VOLTAR]")
            ep = self.choose_from_list("Escolha o Episodio do projeto:"
                                       " {0}".format(self.project.name), eps)
            if ep == "[VOLTAR]":
                self.show_project_page()
                return
            self.show_ep_page(ep)
        elif r == "Criar EP / SQ":
            ep_r = self.get_input(u"Escolha o nome do ep. para criar (EX:. 'EP001'), ou forneca uma lista separada por vírgulas ou espaços (se quiser criar uma sequencia de eps, por exemplo, do 1 ao 14, digite 1-14)".encode(sys.getfilesystemencoding()),
                                  u"Escreva aqui\nIMPORTANTE: Lembre-se de usar o prefixo de episódio do projeto.".encode(sys.getfilesystemencoding()))
            input_eps = re.findall(self.project.paths.regs["ep"]["regex"], ep_r)
            if len(input_eps) == 0:
                div = re.findall(r"\d+-\d+", ep_r)
                if len(div) == 0:
                    sys.exit("Input invalido!")
                input_eps = [self.project.paths.regs["ep"]["model"].format(i) for i in
                             range(int(div[0].split("-")[0]), int(div[0].split("-")[1]))]
            for ep in input_eps:
                if ep in eps:
                    print "Episodio escolhido ({0}) ja existe no projeto!".format(ep)
                    self.show_project_page()
                self.project.paths.create_episode_scheme("server", ep)
            self.pause()
            self.show_project_page()

    def show_ep_page(self, ep):
        """mostra o menu CLI do ep"""
        opts = ["Importar animatics", "Criar setup basico", "[VOLTAR]"]
        r = self.choose_from_list("Ep {0}".format(ep), opts)
        if r == "[VOLTAR]":
            self.show_project_page()
            return
        if r == "Importar animatics":
            af = self.get_input(u"Escolha a pasta de origem dos animatics (pasta com apenas os arquivos de vídeo com os trechos de animatic):".encode(sys.getfilesystemencoding()),
                                self.project.paths.root["local"].path)
            animatics_folder = Path(af)
            animatics = filter(lambda x: x.is_file(),
                               animatics_folder.glob("*"))
            self.project.paths.import_animatics_to_ep(animatics, ep)
            sys.exit("Animatics importados para o episodio: {0}".format(ep))

        if r == "Criar setup basico":
            counter = {"errors": 0, "done": 0}
            sr = self.choose_from_list("Criar Setup Basico: {0}".format(ep),
                                       ["Lista de Cenas", "Todo Episodio", "[VOLTAR]"])
            if sr == "[VOLTAR]":
                self.show_ep_page(ep)
                return
            if sr == "Lista de Cenas":
                input_scenes = self.get_input(u"Insira lista de cenas para criar o setup (cenas no padrão  de cenas 'SCXXXX', separados  por vírgula ou espaco)".encode(sys.getfilesystemencoding()),
                                              "Liste as cenas aqui...")
                in_sc = [x.rstrip() for x in re.split(r"\s|,", input_scenes) if
                         bool(re.findall(self.project.paths.regs["sc"]["regex"], x))]
                scenes = [self.project.paths.regs["scene"]["model"].format(int(re.findall(r'\d+', ep)[0]),
                                                                           int(re.findall(r'\d+', x)[0])) for x in
                          in_sc]
            else:
                scenes = self.project.paths.list_scenes_from_animatics(ep)
            for item in scenes:
                temp_folder = self.app.get_temp_folder("create_setup", clean=True)
                publish_zip = self.project.paths.get_publish_file(item, "SETUP")
                if "v01" not in publish_zip.name:
                    print " -- CENA {0} ja tem setup basico!".format(item)
                    counter["errors"] += 1
                    continue
                temp_scene = temp_folder / item
                if not self.project.paths.copy_scene_template(temp_scene):
                    print("ERRO criando copia da cena "
                          "{0} no temp...".format(item))
                    counter["errors"] += 1
                    continue
                import_animatic_js = Path(self.app.root) / "batch" / "BAT_ImportAnimatic.js"
                if not self.app.harmony.compile_script(import_animatic_js.path,
                                                       self.app.harmony.get_xstage_last_version(temp_scene.path)):
                    print "ERRO rodando o script compile de animatic no arquivo temp..."
                    counter["errors"] += 1
                    continue
                temp_zip = temp_folder / "_temp.zip"
                if not compact_folder(temp_scene.path, temp_zip.path, add_empty_folders=False):
                    print "ERRO ao compactar cena no temp zip"
                    counter["errors"] += 1
                    continue
                if not temp_zip.copy_file(publish_zip):
                    print "ERRO ao copiar o temp zip para o server!"
                    counter["errors"] += 1
                    continue
                counter["done"] += 1
            sys.exit("Criar Setup basico terminou com {0} cena(s) publicada(s) e {1} error(s)".format(counter["done"], counter["errors"]))

    def start(self):
        """inicia o cli do dev"""
        if self.app.is_ready():
            self.show_main_menu()
        else:
            self.show_config_app_page()
