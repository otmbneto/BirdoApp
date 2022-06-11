import os
import sys
import shotgun_api3
from enc_dec import PswEncDec
app_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
sys.path.append(app_root)
from app.config_project import config_project

pwm = PswEncDec()


class ShotgunPipeline:
    """classe para fazer conexao com o Shotgun"""
    def __init__(self, project_index):
        self.sg_data = config_project(app_root, project_index)["pipeline"]
        self.sg_library = os.path.abspath(os.path.dirname(shotgun_api3.__file__))
        self.ca_certs_path = os.path.join(self.sg_library, "lib/httplib2/python2/cacerts.txt")
        self.api_key = pwm.dec(self.sg_data["apiKey"])

        # SG CONNECTION
        self.sg = shotgun_api3.Shotgun(self.sg_data["url"],
                                       script_name=self.sg_data["scriptName"],
                                       ca_certs=self.ca_certs_path,
                                       api_key=self.api_key
                                       )

        # PROJECT OBJECT
        self.project = self.sg.find_one("Project", [["name", "is", self.sg_data["projectName"]]])

    # METHODS:
    def get_asset_type_list(self, asset_type):
        """Retorna uma lista com todos os assets deste tipo do projeto"""
        fields = ['id', 'sg_version_template', 'code', 'shots']
        filters = [
            ['project', 'is', {'type': 'Project', 'id': self.project["id"]}],
            ['sg_asset_type', 'is', asset_type]
        ]
        assets = self.sg.find("Asset", filters, fields)
        return assets
