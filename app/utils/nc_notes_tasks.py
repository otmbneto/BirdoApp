import os
import owncloud
from enc_dec import PswEncDec

def get_list_nodes(remote_path):
	"""Recebe o caminho pra pasta de notes
	de uma cena e devolve uma string com os
	notes disponiveis."""

	cry = PswEncDec()
	oc = owncloud.Client(login.url)
	oc.login(login.user, cry.dec(login.passwd))

	try :
		full_list = oc.list(remote_path)
	except :
		oc.logout()
		return "ERRO! Nao pode encontrar notes para esse ep."
	
	notes_list = []
	for i in full_list :
		notes_list.append(i.get_name())
	oc.logout()
	return ",".join(notes_list)

def download_and_uncompress(seven_z, remote_file, local_path):
	"""Baixa um arquivo para o caminho
	especificado e o descompacta."""

	cry = PswEncDec()
	oc = owncloud.Client(login.url)
	oc.login(login.user, cry.dec(login.passwd))

	zip_file = local_path + remote_file.split("/")[-1]

	try :
		oc.get_file(remote_file, local_file = zip_file)
	except :
		oc.logout()
		return "ERRO! Nao pode baixar o note."

	cmd = '{} x {} -o{} -y'.format(seven_z, zip_file, local_path)
	try :
		cmd = os.system(cmd)
	except :
		oc.logout()
		return "ERRO! Nao pode descompactar o note."

	oc.logout()
	return "OK!"

def clean_notes(temp_path, selected_note):
	clean_zip = -1;
	clean_tpl = -1;
	try :
		clean_zip = os.system('del "{}"'.format(temp_path + "/" + selected_note).replace("/", "\\"))
		clean_tpl = os.system('rd /s /q "{}"'.format(temp_path + "/" + selected_note[:-4]))
	except :
		return "ERRO!"
	else :
		if clean_zip == 0 and clean_tpl == 0 :
			return "OK!"
		else :
			return "ERRO!"
