import owncloud
from enc_dec import PswEncDec

def ensure_path_rec(path, oc, lvl = 0):
	s_path = path.strip("/").split("/")
	wd = "/" # 'wd' for 'working directory'
	for i in range(0, lvl):
		wd = wd + s_path[i] + "/"

	nd = wd # 'nd' for 'next dir'
	if lvl < len(s_path):
		 nd = nd + s_path[lvl]

	nd_existis = False
	list = oc.list(wd)
	for i in list :
		if i.get_name() == s_path[lvl] and i.is_dir():
			nd_existis = True
			break
	if not nd_existis :
		oc.mkdir(nd)
		print("(((just create '{}')))".format(nd))
	
	# pseudo debug :(
	# print("============")
	# print("lvl:\t{}".format(lvl))
	# print("wd:\t{}".format(wd))
	# print("nd:\t{}".format(nd))
	# print("============")
	
	if lvl < len(s_path) - 1 :
		ensure_path_rec(path, oc, lvl = lvl + 1)

def ensure_path_and_upload(path, source_file):
	"""recebe um caminho do nextcloud e,
	caso o caminho nao exista, o cria."""

	cry = PswEncDec()
	oc = owncloud.Client(login.url)
	# oc = owncloud.Client(login["url"])
	oc.login(login.user, cry.dec(login.passwd))
	# oc.login(login["user"], login["passwd"])
	ensure_path_rec(path, oc)
	s_path = path.strip("/").split("/")
	final_folder = s_path.pop()
	up_folder = "/".join(s_path)
	up_folder_ls = oc.list(up_folder)
	path_ensured = False
	for f in up_folder_ls :
		if f.get_name() == final_folder and f.is_dir():
			path_ensured = True
			break
	if not path_ensured :
		oc.logout()
		return ("ERROR: path could not be created.")
	uploaded = False
	uploaded = oc.put_file(path, source_file)
	if not uploaded :
		oc.logout()
		return ("ERROR: file was not uploaded.")
	# all right!
	oc.logout()
	return "OK!"
