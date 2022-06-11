import os


class HarmonyPaths:
    """Cria classe com infos do harmony no computador"""
    def __init__(self, system_data, harmony_version):
        self.system = system_data
        self.tb_version = harmony_version
        if self.system.system_os == 'Darwin':
            self.harmony_path = '{0}/Toon Boom Harmony {0} Premium/Harmony Premium.app/Contents/tba/macosx/bin/HarmonyPremium'.format(self.system.programs, self.tb_version)
            self.harmony_scripts = '{0}/Library/Preferences/Toon Boom Animation/Toon Boom Harmony Premium/{1}00-scripts/'.format(self.system.appdata, self.tb_version)
        elif self.system.system_os == 'Windows':
            self.default_installation = '{0}/Toon Boom Animation/Toon Boom Harmony {1} Premium'.format(self.system.programs, self.tb_version)
            self.harmony_config_xml = '{0}/resources/menus.xml'.format(self.default_installation)
            self.harmony_path = '{0}/win64/bin/HarmonyPremium.exe'.format(self.default_installation)
            self.harmony_scripts = '{0}/Toon Boom Animation/Toon Boom Harmony Premium/{1}00-scripts/'.format(self.system.appdata, self.tb_version)

    def checkPaths(self):
        """checks if the Harmony paths find in the computer are valid, and if the software is installed"""
        if not os.path.exists(os.path.dirname(self.harmony_scripts)):
            return 'HARMONY_NOT_INSTALLED'
        if not os.path.exists(self.harmony_path):
            return 'INSTALLATION_NOT_DEFAULT'
        return 'HARMONY_PATHS_OK'