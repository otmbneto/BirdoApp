import re
import os
import sys
import inspect
from utils.birdo_json import read_json_file, write_json_file
from config_project2 import config_project


def get_type(value):
    """return formatted type of the object"""
    return re.sub(r"((^<|>$)|type|\'|\s)", "", str(type(value)))


def get_parameters(method):
    """retorna formatado os parametros da funcao"""
    reg = r"\'|(self\'(,\s)?)"
    return re.sub(reg, "", str(inspect.getargspec(method).args)).replace("[", "(").replace("]", ")")


def vdir(obj):
    """funcao dir mas sem os metodos built-in do python"""
    return [x for x in dir(obj) if not x.startswith('__')]


def make_json_doc(class_obj, name):
    """receive an class to create a json file for documentation"""
    final_dict = {
        "name": name,
        "type": "class",
        "description": class_obj.__doc__,
        "attributes": {},
        "methods": {}
    }

    exceptions_list = [] if not hasattr(class_obj, "doc_exclude") else class_obj.doc_exclude
    for att in vdir(class_obj):
        att_value = class_obj.__getattribute__(att)
        att_name = "{0}.{1}".format(name, att)

        # checks exclude list to add or not.
        if att in exceptions_list:
            print '--ignoring item: {0}'.format(att)
            continue

        if "class" in str(type(att_value)):
            final_dict["attributes"][att] = make_json_doc(att_value, att_name)
        elif "instancemethod" in str(type(att_value)):
            final_dict["methods"][att] = {
                "name": att_name,
                "parameters": get_parameters(att_value),
                "type": get_type(att_value),
                "description": att_value.__doc__
            }
        else:
            final_dict["attributes"][att] = {
                "name": att_name,
                "type": get_type(att_value),
                "description": None
            }
    return final_dict


def merge_two_dicts(x, y):
    z = x.copy()   # start with keys and values of x
    z.update(y)    # modifies z with keys and values of y
    return z


def update_doc(current_obj, doc_obj):
    """updates doc data with new current data. Updates the descriptions items too"""
    # callback q atualiza os items
    def update_items(current, doc):
        """updates item_name object in doc dictionary = item name being attributes or methods sub-object"""
        output_obj = merge_two_dicts(current, doc)
        delete_list = []
        for item in output_obj:
            # add to delete list old item
            if item not in current:
                print "----adding to delete list: {0}".format(item)
                delete_list.append(item)
                continue

            # add new item
            if item not in doc:
                print "item added: {0}".format(item)

            # updates description item
            if not output_obj[item]["description"]:
                new_description = raw_input(">>Create description<<\n"
                                            ">>>{0}<<<\n"
                                            "Type attribute Description: ".format(output_obj[item]["name"]))
                output_obj[item]["description"] = new_description

            # if item is class
            if output_obj[item]["type"] == "class":
                print "updating sub-class {0}".format(doc[item]["name"])
                output_obj[item] = update_doc(current[item], doc[item])
                continue

        # delete old item list
        for k in delete_list:
            print '--Deleting item: {0}'.format(k)
            del output_obj[k]

        return output_obj

    updated_doc = {
        "name": current_obj["name"],
        "type": current_obj["type"],
        "description": current_obj["description"]
    }
    print "start update methods"
    updated_doc["methods"] = update_items(current_obj["methods"], doc_obj["methods"])
    print "start update attributes"
    updated_doc["attributes"] = update_items(current_obj["attributes"], doc_obj["attributes"])
    return updated_doc


if __name__ == "__main__":
    """atualiza o arquivo json de doc dado como parametro"""
    args = sys.argv

    if len(args) != 2:
        print "error! wrong number of arguments>> pass the path for the output json file!"
        sys.exit("error!")

    doc_path = args[1]

    # classe do projeto (usando o maluquinho  - 0 - para criar o doc pq este esta com os __doc__ certinhos)
    proj_data = config_project(0)

    if not proj_data:
        print "error creating project data"
        sys.exit("Error creating proj_data!")

    # current proj_data information
    current_proj_data = make_json_doc(proj_data, "project_data")

    if not os.path.exists(doc_path):
        print "first run for this document..."
        current_doc = current_proj_data
    else:
        print "doc exists. Checking information..."
        current_doc = read_json_file(doc_path)

    # updates the json file
    new_data = update_doc(current_proj_data, current_doc)

    if write_json_file(doc_path, new_data):
        print "Project data DOC created in {0}".format(doc_path)
        sys.exit("Doc updated!")
    else:
        print "error creting doc!"
        sys.exit("error creating json file!")

