import json


def read_json_file(json_file):
    """Reads json file and return Object Dictionary"""
    with open(json_file, 'r') as fp:
        try:
            obj = json.load(fp)
        except:
            print "error reading json file: {0}".format(json_file)
            return False
    return obj


def write_json_file(json_file, data, sort_dic=False):
    """Saves object (dictionary) into json file"""
    with open(json_file, 'w') as fp:
        try:
            json.dump(data, fp, indent=2, sort_keys=sort_dic)
        except:
            print "error writing json file: {0}".format(json_file)
            return False
    return True
