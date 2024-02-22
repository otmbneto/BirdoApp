"""############################################################################
#                                                                  _    _     #
#  quick_monday.py                                                , `._) '>   #
#                                                                 '//,,,  |   #
#                                                                     )_/     #
#    by: ~camelo003                '||                     ||`       /_|      #
#    e-mail: oi@camelo.de           ||      ''             ||                 #
#                                   ||''|,  ||  '||''| .|''||  .|''|,         #
#    created: 29/04/2022            ||  ||  ||   ||    ||  ||  ||  ||         #
#    modified: 16/06/2023          .||..|' .||. .||.   `|..||. `|..|'         #
#                                                                             #
###############################################################################

	[PTBR] pequeno modulo para pegar informacoes do Monday.com a partir de
	token de acesso.

	I - M - P - O - R - T - A - N - T - E

		> Python 2.7!

		> Dependencias:
			> requests 2.27.1 (pip install requests)

		> Ao usar:
			> Usar unicode strings nos argumentos das funcoes
			> Colocar '# coding=utf-8' no topo do arquivo para conseguir usar
			caracteres acentuados

		> To-dos
			- [ ] Melhorar raises
			- [ ] Descricao das funcoes em ingles?
			- [ ] Tratar bad requests
			- [ ] Melhorar saida baseado no tipo da coluna
			- [X] acessar multiplos valores de uma vez
			- [X] subir arquivo

		> Issues:
			> Tive problemas em usar em Windows 10 /em ingles/ no modo
			interativo devido a conversoes arbitrarias de caracteres acentuados

"""
import requests
import json
import os
import mimetypes

def get_boards(_url, token, match=""):
	d = {}
	headers = {
		"Authorization": token
	}
	query = '{boards(limit:300){name id groups{title id}}}'
	data = {
		'query': query
	}
	r = requests.post(url=_url, json=data, headers=headers)
	j = r.json()

	# fill a new dict (board name as key)
	for board in j["data"]["boards"]:
		d[board["name"]] = {"id": board["id"], "groups": {}}
		for group in board["groups"]:
			d[board["name"]]["groups"][group["title"]] = group["id"]

	# filter by match
	temp_d = d.copy()
	if match != "":
		for k in temp_d:
			if not match in k:
				d.pop(k)
	d["token"] = token
	return d

get_boards.__doc__ = ('[ get_boards_and_groups(token, match = "") ]'
					  ' Retorna um dicionario de todos os boards, e seus'
					  ' respectivos grupos, cujo nome combine com o conteudo'
					  ' de match cujo nome combine com o conteudo de match.'
					  ' Caso match nao seja informado retorna todos os boards.')

def get_items_map(_url, boards, board, group):
	valid_board = True

	# check arguments
	if type(boards) != type({}):
		raise Exception("The first argument must be a dictionary.")
	if type(board) != type(u""):
		raise Exception("The second argument must be a unicode string.")
	if type(group) != type(u""):
		raise Exception("The third argument must be a unicode string.")

	# check 'boards' dict
	if not "token" in boards:
		raise Exception("The first argument dictionary does not have a 'token'"
						" key. Probally it is not a 'boards' dict generated"
						" with the 'get_boards()' function.")
	for b in boards:
		if b == 'token':
			continue
		if (
				type(boards[b]) != type({}) or
				not "id" in boards[b] or
				not "groups" in boards[b]
			):
			valid_board = False
			break
	if not valid_board:
		raise Exception("Something is wrong with the 'boards' dict. "
						"Make sure it was returned by function 'get_boards()'.")

	# check for 'board'
	if not board in boards:
		temp_err = ("Second argument '{}' is not a board of 'boards'"
					" dictionary.").format(board.encode('utf-8'))
		raise Exception(temp_err)

	# check for 'group'
	if not group in boards[board]["groups"]:
		temp_err = ("Third argument '{}' is not a group of board '{}' dictiona"
					"ry.").format(group.encode('utf-8'), board.encode('utf-8'))
		raise Exception(temp_err)

	# make the request
	headers = {
		"Authorization": boards['token']
	}
	query = ("{{boards(ids:{}){{name id groups(ids:\"{}\")"
			"{{title id items_page {{items{{name id}}}}}} columns{{title id}}}}}}").format(
				boards[board]['id'],
				boards[board]["groups"][group]
			)
	data = {
		'query': query
	}
	r = requests.post(url = _url, json = data, headers = headers)
	j = r.json()
	m = {
		"token": boards['token'],
		"items": {},
		"columns": {}
	}

	for item in j["data"]["boards"][0]["groups"][0]["items_page"]["items"]:
		m["items"][item["name"]] = item["id"]
	m["board"] = {"name": board, "id": boards[board]["id"]}
	m["board"]["groups"] = boards[board]["groups"]
	for column in j["data"]["boards"][0]["columns"]:
		m["columns"][column["title"]] = column["id"]
	return m

get_items_map.__doc__ = ("[ get_items_map(token, board, group) ] "
						"Retorna um dicionario contendo:\n"
						"1) relacao 'item:id' das linhas do grupo informado;"
						"2) relacao 'title:id' das colunas do board informado.")

def get_raw(_url, mmap, item, column):
	valid_map = True

	# check arguments
	if type(mmap) != type({}):
		raise Exception("The first argument must be a dictionary.")
	if type(item) != type(u""):
		raise Exception("The second argument must be a unicode string.")
	if type(column) != type(u""):
		raise Exception("The third argument must be a unicode string.")

	# check 'mmap' dict
	if not "token" in mmap:
		raise Exception("The first argument dictionary does not have a 'token' "
						"key. Probally it is not a 'map' dict generated with "
						"the 'get_items_map()' function.")
	if not "items" in mmap:
		raise Exception("The first argument dictionary does not have a 'items'"
						" key. Probally it is not a 'map' dict generated with"
						" the 'get_items_map()' function.")
	if not "columns" in mmap:
		raise Exception("The first argument dictionary does not have a"
						" 'columns' key. Probally it is not a 'map' dict"
						" generated with the 'get_items_map()' function.")
	if type(mmap["items"]) != type({}):
		valid_map = False
	if type(mmap["columns"]) != type({}):
		valid_map = False
	if not valid_map :
		raise Exception("Something is wrong with the 'map' dict. Make sure it"
						" was returned by function 'get_items_map()'.")

	# check for 'item'
	if not item in mmap["items"]:
		raise Exception(("Second argument '{}' is not a board"
						 " of 'map' dictionary.").format(item))

	# check for 'column'
	if not column in mmap["columns"]:
		raise Exception(("Third argument '{}' is not a"
						 " column of 'map' dictionary.").format(column))

	# make the request
	headers = {
		"Authorization": mmap['token']
	}
	query = ("{{items(ids:{}){{name id column_values(ids:{})"
			 "{{title id type value additional_info}}}}}}").format(
				mmap["items"][item],
				mmap["columns"][column])
	data = {
		'query': query
	}
	r = requests.post(url=_url, json=data, headers=headers)
	return r.json()

get_raw.__doc__ = ("[ get_raw(url,item_map, item, column) ]"
				   " Retorna o bruto da requisicao de uma"
				   " coluna em item.")

def get_value(_url, mmap, item, column):
	valid_map = True

	# check arguments
	if type(mmap) != type({}):
		raise Exception("The first argument must be a dictionary.")
	if type(item) != type(u""):
		raise Exception("The second argument must be a unicode string.")
	if type(column) != type(u""):
		raise Exception("The third argument must be a unicode string.")

	# check 'mmap' dict
	if not "token" in mmap:
		raise Exception("The first argument dictionary does not have a 'token' "
						"key. Probally it is not a 'map' dict generated with "
						"the 'get_items_map()' function.")
	if not "items" in mmap:
		raise Exception("The first argument dictionary does not have a 'items'"
						" key. Probally it is not a 'map' dict generated with"
						" the 'get_items_map()' function.")
	if not "columns" in mmap:
		raise Exception("The first argument dictionary does not have a"
						" 'columns' key. Probally it is not a 'map' dict"
						" generated with the 'get_items_map()' function.")
	if type(mmap["items"]) != type({}):
		valid_map = False
	if type(mmap["columns"]) != type({}):
		valid_map = False
	if not valid_map :
		raise Exception("Something is wrong with the 'map' dict. Make sure it"
						" was returned by function 'get_items_map()'.")

	# check for 'item'
	if not item in mmap["items"]:
		raise Exception(("Second argument '{}' is not a board"
						 " of 'map' dictionary.").format(item))

	# check for 'column'
	if not column in mmap["columns"]:
		raise Exception(("Third argument '{}' is not a"
						 " column of 'map' dictionary.").format(column))

	# make the request
	headers = {
		"Authorization": mmap['token']
	}
	query = "{{items(ids:{}){{name id column_values(ids:\"{}\"){{id type value text}}}}}}".format(mmap["items"][item], mmap["columns"][column])
	data = {
		'query': query
	}
	r = requests.post(url=_url, json=data, headers=headers)
	j = r.json()
	v = j["data"]["items"][0]["column_values"][0]

	if v["type"] == "status" :
		return v["text"]
	return v

get_value.__doc__ = ("[ get_value(url, map, item, column) ]"
					 " Retorna o valor do item informado na coluna informada.")

def get_value_straight(_url, token, board, group, column, item):
	boards = get_boards(_url, token, match=board)
	mmap = get_items_map(_url, boards, board, group)
	return get_value(_url, mmap, item, column)

get_value_straight.__doc__ = ("[ get_value_straight(url, token, board, group,"
							  " column, item) ] Retorna o valor diretamente"
							  " baseado no board, grupo e coluna e informados.")

def get_values(_url, mmap, group, column):
	valid_map = True

	# check arguments
	if type(mmap) != type({}):
		raise Exception("The first argument must be a dictionary.")
	if type(group) != type(u""):
		raise Exception("The second argument must be a unicode string.")
	if type(column) != type(u""):
		raise Exception("The third argument must be a unicode string.")

	# check 'mmap' dict
	if not "token" in mmap:
		raise Exception("The first argument dictionary does not have a 'token' "
						"key. Probally it is not a 'map' dict generated with "
						"the 'get_items_map()' function.")
	if not "items" in mmap:
		raise Exception("The first argument dictionary does not have a 'items'"
						" key. Probally it is not a 'map' dict generated with"
						" the 'get_items_map()' function.")
	if not "columns" in mmap:
		raise Exception("The first argument dictionary does not have a"
						" 'columns' key. Probally it is not a 'map' dict"
						" generated with the 'get_items_map()' function.")
	if type(mmap["items"]) != type({}):
		valid_map = False
	if type(mmap["columns"]) != type({}):
		valid_map = False
	if not valid_map :
		raise Exception("Something is wrong with the 'map' dict. Make sure it"
						" was returned by function 'get_items_map()'.")

	# check for 'group'
	if not group in mmap["board"]["groups"]:
		raise Exception(("Second argument '{}' is not a group of"
						 " the 'map' board.").format(group))

	# check for 'column'
	if not column in mmap["columns"]:
		raise Exception(("Third argument '{}' is not a"
						 " column of 'map' dictionary.").format(column))

	# make the request
	headers = {
		"Authorization": mmap['token']
	}
	query = ('{{boards(ids:{}){{groups(ids:"{}")'
			 '{{items{{name column_values(ids:"{}")'
			 '{{value additional_info}}}}}}}}}}'.format(
				mmap["board"]["id"],
				mmap["board"]["groups"][group],
				mmap["columns"][column]))
	data = {
		'query': query
	}
	r = requests.post(url=_url, json=data, headers=headers)
	j = r.json()
	v = {}
	for i in j["data"]["boards"][0]["groups"][0]["items"]:
		print(i)
		if i["column_values"][0]["value"]:
			s = i["column_values"][0]["additional_info"]
			s = s.replace("null", "None")
			v[i["name"]] = eval(s)["label"]
		else :
			v[i["name"]] = None
	return v

get_values.__doc__ = ("[ get_values(url, items_map, group, column) ]"
					  " Retorna um dicionario contendo todos os items do"
					  " /group/ com seus respectivos valores na /column/.")

def send_file(file_path, _url, mmap, item, column):
	# check arguments
	if not os.path.exists(file_path):
		raise Exception("The first argument must be a valid file path.")
	valid_types = [
		'image/png',
		'image/jpeg',
		'application/msword',
		('application/vnd.openxmlformats-officedocument'
		 '.wordprocessingml.document'),
		'application/pdf',
		'application/vnd.ms-excel',
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		'image/gif',
		'video/mp4',
		'application/vnd.ms-excel',
		'image/svg+xml',
		'text/plain',
		'application/postscript'
	]
	file_mimetype = mimetypes.guess_type(file_path)[0]
	if not file_mimetype in valid_types:
		raise Exception("Invalid file type.")
	if type(mmap) != type({}):
		raise Exception("The third argument must be a dictionary.")
	if type(item) != type(u""):
		raise Exception("The forth argument must be a unicode string.")
	if type(column) != type(u""):
		raise Exception("The fifith argument must be a unicode string.")

	# check 'mmap' dict
	if not "token" in mmap:
		raise Exception("The third argument dictionary does not have a 'token' "
						"key. Probally it is not a 'map' dict generated with "
						"the 'get_items_map()' function.")
	if not "items" in mmap:
		raise Exception("The third argument dictionary does not have a 'items'"
						" key. Probally it is not a 'map' dict generated with"
						" the 'get_items_map()' function.")
	if not "columns" in mmap:
		raise Exception("The third argument dictionary does not have a"
						" 'columns' key. Probally it is not a 'map' dict"
						" generated with the 'get_items_map()' function.")
	valid_map = True
	if type(mmap["items"]) != type({}):
		valid_map = False
	if type(mmap["columns"]) != type({}):
		valid_map = False
	if not valid_map :
		raise Exception("Something is wrong with the 'map' dict. Make sure it"
						" was returned by function 'get_items_map()'.")

	# check for 'item'
	if not item in mmap["items"]:
		raise Exception(("Forth argument '{}' is not an item of"
						 " the 'items_map' dict.").format(item))

	# check for 'column'
	if not column in mmap["columns"]:
		raise Exception(("Third argument '{}' is not a"
						 " column of 'map' dictionary.").format(column))

	# header of all requests
	headers = {
		"Authorization": mmap['token']
	}

	# check column type !!!
	check_column_query = {
		'query': '{{boards(ids:[{}]){{columns(ids:"{}"){{type}}}}}}'.format(
				mmap["board"]["id"], mmap["columns"][column])
	}

	check_column_resp = requests.request("GET", _url,
										 headers = headers,
										 data = check_column_query)

	if check_column_resp.status_code != 200 :
		exeption_str = ("Something went wrong while checking the type of the"
						" '{}' column. Here is the raw response of the query:"
						"\n\n{}").format(column, check_column_resp.raw)
		raise Exception(exeption_str)

	check_column_json = check_column_resp.json()
	try :
		check_str = check_column_json["data"]["boards"][0]["columns"][0]["type"]
	except :
		exeption_str = ("Something went wrong while checking the type of the"
						" '{}' column. Here is the raw response of the query:"
						"\n\n{}").format(column, check_column_resp.raw)
		raise Exception(exeption_str)
	if check_str != "file" :
		exeption_str = ("The column '{}' has the '{}' type."
						" It's only possible to upload a file"
						" to a column of the 'file' type.").format(
								column, check_str)
		raise Exception(exeption_str)

	# make the request
	clear_query = {
			'query': ('mutation {{ change_column_value (item_id: {},'
					  ' column_id: "{}", board_id: {},'
					  ' value:"{{\\"clear_all\\": true}}")'
					  ' {{id}}}}').format(mmap["items"][item],
										  mmap["columns"][column],
										  mmap["board"]["id"])
	}

	clear_response = requests.request("GET", _url,
									  headers = headers,
									  data = clear_query)

	if clear_response.status_code != 200 :
		exception_str = ("Something went wrong while trying to clear the"
						 " contents of item '{}' in column '{}'. This was"
						 " the result of the request:\n\n{}").format(
							item, column, clear_response.raw)
		raise Exception(exception_str)

	file_url = _url + "/file"
	upload_query = {
	'query': ('mutation ($file: File!) {{add_file_to_column(item_id: {},'
			  ' column_id: "{}", file: $file) {{id}}}}').format(
				mmap["items"][item], mmap["columns"][column])
	}
	file_to_upload = open(file_path, 'rb')
	files=[('variables[file]',(file_to_upload.name,
							   file_to_upload, file_mimetype))]
	response = requests.request("POST", file_url,
								headers = headers,
								data = upload_query,
								files = files)
	file_to_upload.close()
	return response

send_file.__doc__ = ("[ send_file(file_path, url, item_map, item, column) ]"
					 " Sobe o arquivo do caminho passado pra celula do item x"
					 " coluna especificados.")
