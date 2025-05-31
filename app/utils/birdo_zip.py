from zipfile import ZipFile
from zipfile import ZIP_DEFLATED
import textwrap
import os
import time
from tqdm import tqdm


def format_file_path(file_path, limit=50):
    """
    format the string to get fixed size in the loading bar
    :param file_path: str string to format
    :param limit: int limit length of the formatted string
    :return: str formatted string
    """
    if len(file_path) < limit:
        return file_path.ljust(limit, " ")
    split = textwrap.wrap(file_path, ((limit/2) - 3))
    last_part = split[-1]
    return "...".join([split[0], last_part.ljust(limit/2, " ")])


def get_sub_paths(dir, add_empty_folders=False):
    """
    list all sub folders and files in the folder.
    :param dir: str main folder to list
    :param add_empty_folders: bool indicates if need to add empty folders in the final list
    :return: list of objects with "path" and "relative_path" keys
    """
    paths = []
    for root, dirs, files in os.walk(dir):
        if add_empty_folders:
            for d in dirs:
                full_path = os.path.join(root, d)
                if len(os.listdir(full_path)) == 0:
                    relative_path = os.path.relpath(full_path, os.path.join(dir, '..'))
                    paths.append({"path": full_path, "relative_path": relative_path})
        for f in files:
            full_path = os.path.join(root, f)
            relative_path = os.path.relpath(full_path, os.path.join(dir, '..'))
            paths.append({"path": full_path, "relative_path": relative_path})
    return paths


def compact_folder(folder, zip_path, add_empty_folders=False):
    """
    compact folder and all content into zip file
    :param folder: source folder to compress
    :param zip_path: final zipfile to generate
    :param add_empty_folders: bool to tell if wants do add empty folders to the zip
    :return: str zipfile path generated
    """
    error_list = []
    sub_paths = get_sub_paths(folder, add_empty_folders=add_empty_folders)
    digits = len(str(len(sub_paths)))
    pb = tqdm(total=len(sub_paths), desc="start compressing...", leave=True)
    with ZipFile(zip_path, 'w', compression=ZIP_DEFLATED) as zip_file:
        for i, item in enumerate(sub_paths):
            pb.set_description_str("Compacting File [{0:0{1}d}]: {2}".format(i, digits, format_file_path(item["relative_path"])))
            pb.update()
            try:
                zip_file.write(item["path"], item["relative_path"])
            except Exception as e:
                print e
                error_list.append(item["relative_path"])
    pb.clear()
    print "compress finished with {0} errors".format(len(error_list))
    return zip_path


def extract_zipfile(zipfile, extract_to):
    """
    extract zip file into location and return file list with uncompressed files
    :param zipfile: str path to zip file to extract
    :param extract_to: str destination folder of the extracted content
    :return: list list with extracted content in the extract_to folder
    """
    data = {
        "content_list": [],
        "error_list": []
    }
    destiny_before = os.listdir(extract_to)
    try:
        with ZipFile(zipfile) as zip_f:
            zips_list = zip_f.infolist()
            pb = tqdm(total=len(zips_list), desc="start extracting...", leave=True)

            for i, zip_info in enumerate(zips_list):
                pb.set_description_str("Extracting File [{0:05d}]: {1}".format(i, format_file_path(zip_info.filename)))
                pb.update()
                try:
                    zip_f.extract(zip_info.filename, extract_to)
                    fpath = os.path.join(extract_to, zip_info.filename)
                    # Get the original mod time
                    mod_time = time.mktime(zip_info.date_time + (0, 0, -1))

                    # Reapply the original mod time
                    os.utime(fpath, (mod_time, mod_time))

                    data["content_list"].append(fpath)
                except Exception as err:
                    data["error_list"].append(zip_info.filename)
                    print err
            pb.close()
    except Exception as e:
        print e
        return False
    print "Extraction done: {0} files uncompressed and {1} errors!".format(len(data["content_list"]), len(data["error_list"]))
    exported = list(set(os.listdir(extract_to)) - set(destiny_before))
    return exported
