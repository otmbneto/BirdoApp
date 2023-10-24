import os
from tqdm import tqdm
import re

YES_REGEX = r"(Y|YEP|YES|YEAH|OUI|SIM|SI|S)"


def copy_file_pb(src_file, dst_file, buffer_size=1024*1024, force_copy=False, pb_w=None):
    """
    copy file using progress bar to show progress
    :param src_file: str file path of source file to copy
    :param dst_file: str file path of the destination copied file
    :param buffer_size: int value of the buffer size to
    :param force_copy: bool to define if wants to force copy in case of existing dst file
    :param pb_w: progressbar widget (if None will use twdm for progress bar)
    :return: bool True of False to indicate success
    """
    # check if file destiny exists
    if os.path.exists(dst_file):
        if not force_copy:
            ask = raw_input("COPY_FILE: Destiny file {0} already exists. Do you want to override it?\n[y/n]".format(dst_file))
            if not bool(re.match(YES_REGEX, ask.upper())):
                print "canceled by user!"
                return False

    file_size = os.path.getsize(src_file)
    if not pb_w:
        pbar = tqdm(total=file_size, unit="B", unit_scale=True, unit_divisor=1024)
    else:
        pbar = pb_w
        pbar.setRange(0, file_size)
    try:
        with open(src_file, "rb") as src, open(dst_file, "wb") as dest:
            while True:
                buff = src.read(buffer_size)
                if not buff:
                    break
                dest.write(buff)
                if not pb_w:
                    pbar.update(len(buff))
                else:
                    pbar.setValue(len(buff))
        print "file copied from: {0} to {1}".format(src_file, dst_file)
    except Exception as e:
        print e
        return False
    return True
