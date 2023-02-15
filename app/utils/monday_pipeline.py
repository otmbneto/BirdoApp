"""############################################################################
#                                                                  _    _     #
#  quick_monday.py                                                , `._) '>   #
#                                                                 '//,,,  |   #
#                                                                     )_/     #
#    by: ~camelo003                '||                     ||`       /_|      #
#    e-mail: oi@camelo.de           ||      ''             ||                 #
#                                   ||''|,  ||  '||''| .|''||  .|''|,         #
#    created: 29/04/2022            ||  ||  ||   ||    ||  ||  ||  ||         #
#    modified: 15/02/2023          .||..|' .||. .||.   `|..||. `|..|'         #
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

		> Issues:
			> Tive problemas em usar em Windows 10 /em ingles/ no modo
			interativo devido a conversoes arbitrarias de caracteres acentuados

"""
import requests
import json

def get_boards(_url, token, match=""):
	('[ get_boards_and_groups(token, match = "") ] '
	 'Retorna um dicionario de todos os boards, e seus respectivos grupos, '
	 'cujo nome combine com o conteudo de match. Caso match nao seja informado '
	 'retorna todos os boards.')
	d = {}
	headers = {
		"Authorization": token
	}
	query = '{boards(limit:100){name id groups{title id}}}'
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
			"{{title id items{{name id}}}} columns{{title id}}}}}}").format(
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

	for item in j["data"]["boards"][0]["groups"][0]["items"]:
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
	query = ("{{items(ids:{}){{name id column_values(ids:{})"
			 "{{title id type value additional_info}}}}}}").format(
				mmap["items"][item],
				mmap["columns"][column])
	data = {
		'query': query
	}
	r = requests.post(url=_url, json=data, headers=headers)
	j = r.json()
	v = j["data"]["items"][0]["column_values"][0]["value"]

	if (
		j["data"]["items"][0]["column_values"][0]["type"] == "color" and
		v != None
	   ):
		v = eval(j["data"]["items"][0]["column_values"][0]["additional_info"])
		return v["label"]
	return v

get_value.__doc__ = ("[ get_status(map, item, column) ]"
					 " Retorna o valor do item informado na coluna informada.")

def get_value_straight(_url, token, board, group, column, item):
	boards = get_boards(_url, token, match=board)
	mmap = get_items_map(_url, boards, board, group)
	return get_value(_url, mmap, item, column)

get_value_straight.__doc__ = ("[ get_value_straight(token, board, group, column"
							  ", item) ] Retorna o valor diretamente baseado no"
							  " board, grupo e coluna e informados.")

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

