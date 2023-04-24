import json

def read_json_file(json_file,op_code="r"):
    """Reads json file and return Object Dictionary"""
    with open(json_file,op_code) as fp:
        try:
            obj = json.load(fp)
        except:
            print "error reading json file: {0}".format(json_file)
            return False
    return obj


def write_json_file(json_file, data, sort_dic=False,op_code="w"):
    """Saves object (dictionary) into json file"""
    with open(json_file, op_code) as fp:
        try:
            json.dump(data, fp, indent=2, sort_keys=sort_dic)
        except:
            print "error writing json file: {0}".format(json_file)
            return False
    return True

def write_json_file_from_string(json_file,data,sort_dic=False,op_code="w",indent=2,encoding=None,ensure_ascii=True):

    """Saves string (dictionary) into json file"""
    with open(json_file, op_code) as fp:
        s = json.dumps(data, fp, indent=indent, sort_keys=sort_dic,ensure_ascii=ensure_ascii)
        if encoding is not None:
            s = s.encode(encoding)
        fp.write(s)

    return True

def read_json_file_from_string(json_file,op_code="r",encoding=None):

    """Reads json file and return Object Dictionary"""
    with open(json_file,op_code) as fp:
        try:
            s = fp.read()
            if encoding is not None:
                s = s.encode(encoding).decode(encoding)
            obj = json.loads(s)
        except:
            print "error reading json file: {0}".format(json_file)
            return False
    return obj
