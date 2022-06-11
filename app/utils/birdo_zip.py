from zipfile import ZipFile
from zipfile import ZIP_DEFLATED
import os


def extract_zipfile(zipfile, extract_to):
    """extract zip file into location and return file list with uncompressed files"""
    content_list = []
    error_list = []
    try:
        with ZipFile(zipfile) as zip:
            for zip_info in zip.infolist():
                print "extracting... {0}".format(zip_info.filename)
                try:
                    zip.extract(zip_info.filename, extract_to)
                    content_list.append(os.path.join(extract_to, zip_info.filename))
                except Exception as err:
                    print err
                    error_list.append(zip_info.filename)
                    print "ERROR uncompressing file: {0}".format(zip_info.filename)
    except Exception as e:
        print e
        return False

    print "Compress done: {0} files uncompressed and {1} errors!".format(len(content_list), len(error_list))
    print error_list

    return content_list


def compact_folder(folder, zip_path):
    """compact folder and all content into zip file"""
    error_list = []
    with ZipFile(zip_path, 'w', compression=ZIP_DEFLATED) as zip:
        for root, dirs, files in os.walk(folder):
            for f in files:
                root_name = os.path.join(root, f)
                relative_path = os.path.relpath(root_name, os.path.join(folder, '..'))
                print "adding to zip: {0}".format(relative_path)
                try:
                    zip.write(root_name, relative_path)
                except Exception as e:
                    print e
                    error_list.append(relative_path)

    print "compress finished with {0} errors".format(len(error_list))
    return zip_path

