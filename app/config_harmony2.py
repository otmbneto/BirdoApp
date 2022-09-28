import os


class HarmonyPaths(object):
    """
    Creates a Class with user local Harmony information and project version setting
    ...

    Parameters
    ----------
    system_data : dict
        a dictionary with OS paths information

    harmony_version: string
        version of toon boom harmomy used in the project
    """
    def __init__(self, system_data, harmony_version):
        self.tb_version = harmony_version
        if system_data.system_os == 'Darwin':
            self.harmony_path = '{0}/Toon Boom Harmony {0} Premium/Harmony Premium.app/Contents/tba/macosx/bin/HarmonyPremium'.format(system_data.programs, self.tb_version)
            self.harmony_scripts = '{0}/Library/Preferences/Toon Boom Animation/Toon Boom Harmony Premium/{1}00-scripts/'.format(system_data.appdata, self.tb_version)
        elif system_data.system_os == 'Windows':
            self.default_installation = '{0}/Toon Boom Animation/Toon Boom Harmony {1} Premium'.format(system_data.programs, self.tb_version)
            self.harmony_config_xml = '{0}/resources/menus.xml'.format(self.default_installation)
            self.harmony_path = '{0}/win64/bin/HarmonyPremium.exe'.format(self.default_installation)
            self.harmony_scripts = '{0}/Toon Boom Animation/Toon Boom Harmony Premium/{1}00-scripts/'.format(system_data.appdata, self.tb_version)

    def checkPaths(self):
        """
        Check if harmony paths exists to return if installation is default
        ...
        RETURN : string
        """
        if not os.path.exists(os.path.dirname(self.harmony_scripts)):
            return 'HARMONY_NOT_INSTALLED'
        if not os.path.exists(self.harmony_path):
            return 'INSTALLATION_NOT_DEFAULT'
        return 'HARMONY_PATHS_OK'