# -*- coding: utf-8 -*-
from datetime import datetime
import time


def timestamp_from_isodatestr(iso_date_str):
    """converte a data em formato iso (usada nos jsons) para timestamp"""
    formated_date_string = iso_date_str.replace('T', ' ')
    datetime_object = datetime.strptime(formated_date_string, '%Y-%m-%d %H:%M:%S')
    return time.mktime(datetime_object.timetuple())


def get_current_datetime_string():
    """retorna uma string usavel para caminhos com data e hora local"""
    now = datetime.now()
    return now.strftime("%d-%m-%Y_%H-%M-%S")


def get_current_datetime_iso_string():
    """retorna uma string ISO da hora atual no mesmo formato do que fica nos arquivos do Nextcloud"""
    now = datetime.now()
    return now.strftime("%Y-%m-%dT%H:%M:%S")
