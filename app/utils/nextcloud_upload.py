import os.path
from nextcloud_server import NextcloudServer
from birdo_json import read_json_file
from birdo_json import write_json_file
import sys


def main(file_or_dir, server_path, local_path):
    """main function: use this script to run as a util of harmony javascript to upload files to Nextcloud server"""
    output = {"upload_file" : {"type": file_or_dir, "local": local_path, "server": server_path}}
    birdo_app = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    server_json = os.path.join(birdo_app, "config", "projects", "MNM", "server_DATA.json")
    server_data = read_json_file(server_json)
    if not server_data:
        output["upload"] = None
        output["status"] = "Fail to get server data from server.json!"
        return output

    nc = NextcloudServer(server_data['server'], server_data['paths'])
    roots = nc.get_roots()
    print roots
    if not roots:
        output["upload"] = None
        output["status"] = "Fail to connect to Nextcloud server!"
        return output
    if file_or_dir == "file":
        output["upload"] = nc.upload_file(server_path, local_path)
    elif file_or_dir == "dir":
        output["upload"] = nc.upload_dir(server_path, local_path)

    output["status"] = "Sent request to upload file"

    return output


if __name__ == "__main__":
    args = sys.argv
    if not len(args) == 5:
        print("Numero de argumentos invalidos!")
        sys.exit("error: wrong number of arguments!")

    upload_type = args[1]
    destiny = args[2]
    origin = args[3]
    output_json_file = args[4]

    output = main(upload_type, destiny, origin)

    try:
        write_json_file(output_json_file, output)
    except Exception as e:
        sys.exit(e)
