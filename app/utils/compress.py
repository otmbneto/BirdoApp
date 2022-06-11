"""#######################################
""
"
	Script privisorio apenas pra zipar
	uma pasta (estava tendo problemas
	com o Process2 da API do Harmony)

                              .camelo     "
                                         ""
########################################"""

import os

def f(seven_z,zip_file,folder):
	s = '{} a {} {}'.format(seven_z, zip_file, folder)
	return os.system(s)
