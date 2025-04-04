# -*- coding: utf-8 -*-
import json
import os


def read_json_file(json_file, op_code="r", encoding=None):
    """Le um arquivo json e retorna um dicionario"""
    if not os.path.exists(json_file):
        print("file does not exist: {0}".format(json_file))
        return False
    with open(json_file, op_code) as fp:
        try:
            if encoding:
                obj = json.load(fp, encoding=encoding)
            else:
                obj = json.load(fp)
        except Exception as e:
            print "error reading json file: {0}\n{1}".format(json_file, e)
            return False
    return obj


def write_json_file(json_file, data, sort_dic=False, op_code="w", indent=2, encoding=None, ensure_ascii=True):
    """Salva os dados passados em um json file (aceita string ou objeto como parametro)"""
    with open(json_file, op_code) as fp:
        try:
            s = json.loads(data) if type(data) == str else data
            if encoding:
                json.dump(s, fp, indent=indent, sort_keys=sort_dic, ensure_ascii=ensure_ascii, encoding=encoding)
            else:
                json.dump(s, fp, indent=indent, sort_keys=sort_dic, ensure_ascii=ensure_ascii)
        except Exception as e:
            print "error writing json file: {0}\n{1}".format(json_file, e)
            return False
    return True
